/**
 * TOS Analysis Endpoint
 * POST /api/analyze
 * 
 * Analyzes Terms of Service text using Gemini AI
 * Features:
 * - Input validation
 * - Rate limiting
 * - Caching (deduplication)
 * - Analytics tracking
 */

export const maxDuration = 300; // 5 minutes for long TOS documents
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getRateLimitInfo, checkDailyBudget } from '@/lib/redis';
import { geminiAnalyzer } from '@/lib/services/gemini-analyzer';
import crypto from 'crypto';
import {
  validateTOSText,
  hashContent,
  countWords,
  countChars,
  calculateExpiryDate,
  getClientIP,
  formatError,
  generateSessionHash,
  sanitizeCompanyName,
} from '@/lib/utils';

// Request validation schema
const AnalyzeRequestSchema = z.object({
  text: z.string().min(50).max(500000),
  source_type: z.enum(['paste', 'upload', 'url']),
  source_url: z.string().url().optional(),
  skip_cache: z.boolean().optional().default(false),
  company_name: z.string().max(200).optional(),
  add_to_library: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request.headers);
    const rateLimit = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '10');
    const rateLimitExceeded = await checkRateLimit(clientIP, rateLimit);
    const rateLimitInfo = await getRateLimitInfo(clientIP, rateLimit);
    const rateLimitHeaders = {
      'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
    };

    if (rateLimitExceeded) {
      return NextResponse.json(
        formatError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = AnalyzeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        formatError(validationResult.error.errors[0].message, 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const { text, source_type, source_url, company_name, add_to_library } = validationResult.data;
    // skip_cache is always false for anonymous users — prevents API cost abuse
    const skip_cache = false;

    // Check daily budget before proceeding
    const budget = await checkDailyBudget();
    if (budget.exceeded) {
      return NextResponse.json(
        formatError('Daily analysis limit reached. Please try again tomorrow.', 'BUDGET_EXCEEDED'),
        { status: 503, headers: rateLimitHeaders }
      );
    }

    // Additional text validation
    const textError = validateTOSText(text);
    if (textError) {
      return NextResponse.json(
        formatError(textError, 'INVALID_TEXT'),
        { status: 400 }
      );
    }

    // Generate content hash for deduplication
    const contentHash = hashContent(text);
    const wordCount = countWords(text);
    const charCount = countChars(text);

    // Generate creator token for ownership verification on publish
    const creatorToken = crypto.randomBytes(32).toString('hex');
    const creatorTokenHash = crypto
      .createHmac('sha256', process.env.SESSION_SALT || 'tos-analyzer-salt')
      .update(creatorToken)
      .digest('hex');

    // Check if analysis already exists in database
    let existingAnalysis = await prisma.analysis.findUnique({
      where: { contentHash },
    });

    // If exists and not expired, return it
    if (existingAnalysis && new Date(existingAnalysis.expiresAt) > new Date() && !skip_cache) {
      console.log('Returning existing analysis from database');

      // Track analytics event
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const sessionHash = generateSessionHash(clientIP, userAgent);

      await prisma.analyticsEvent.create({
        data: {
          analysisId: existingAnalysis.id,
          eventType: 'analysis_viewed',
          sessionHash,
          metadata: {
            cached: true,
            source_type,
            company_detected: (existingAnalysis.analysisData as any)?.detected_company?.name || null,
            company_confidence: (existingAnalysis.analysisData as any)?.detected_company?.confidence || null,
            document_type: (existingAnalysis.analysisData as any)?.document_validation?.document_type || null,
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: existingAnalysis.id,
          analysis: existingAnalysis.analysisData,
          cached: true,
          created_at: existingAnalysis.createdAt,
          expires_at: existingAnalysis.expiresAt,
          is_public: existingAnalysis.isPublic,
          company_name: existingAnalysis.companyName,
          library_url: existingAnalysis.isPublic ? '/library' : null,
          detected_company: (existingAnalysis.analysisData as any)?.detected_company || null,
          document_type: (existingAnalysis.analysisData as any)?.document_validation?.document_type || null,
        },
      }, { headers: rateLimitHeaders });
    }

    // Analyze with Gemini
    console.log('Analyzing TOS with Gemini...');
    const { result, cached, tokensUsed } = await geminiAnalyzer.analyze(text, skip_cache);

    // Track token usage against daily budget
    if (tokensUsed && tokensUsed > 0 && !cached) {
      await checkDailyBudget(tokensUsed);
    }

    // Validate document is actually a legal document
    if (!result.document_validation.is_legal_document) {
      return NextResponse.json({
        error: `This doesn't appear to be a Terms of Service document. ${result.document_validation.rejection_reason || 'Please upload a legal document (TOS, Privacy Policy, EULA, etc.)'}`,
        code: 'INVALID_DOCUMENT_TYPE',
        metadata: {
          detected_type: result.document_validation.document_type,
          confidence: result.document_validation.confidence,
        }
      }, { status: 400 });
    }

    // Store or update in database
    const expiresAt = calculateExpiryDate(30);
    
    const safeName = sanitizeCompanyName(
      company_name || result.detected_company.name || 'Unknown Company'
    );

    if (existingAnalysis) {
      // Update existing
      existingAnalysis = await prisma.analysis.update({
        where: { id: existingAnalysis.id },
        data: {
          analysisData: result as any,
          expiresAt,
          wordCount,
          charCount,
          companyName: safeName,
          isPublic: add_to_library,
        },
      });
    } else {
      // Create new
      existingAnalysis = await prisma.analysis.create({
        data: {
          contentHash,
          sourceType: source_type,
          sourceUrl: source_url || null,
          analysisData: result as any,
          wordCount,
          charCount,
          expiresAt,
          companyName: safeName,
          isPublic: add_to_library,
          popularityScore: 0,
          creatorTokenHash,
        },
      });
    }

    // Track analytics event
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const sessionHash = generateSessionHash(clientIP, userAgent);

    await prisma.analyticsEvent.create({
      data: {
        analysisId: existingAnalysis.id,
        eventType: 'analysis_created',
        sessionHash,
        metadata: {
          cached,
          tokens_used: tokensUsed,
          source_type,
          word_count: wordCount,
          company_detected: result.detected_company.name,
          company_confidence: result.detected_company.confidence,
          document_type: result.document_validation.document_type,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: existingAnalysis.id,
        analysis: result,
        cached,
        creator_token: creatorToken,
        created_at: existingAnalysis.createdAt,
        expires_at: existingAnalysis.expiresAt,
        is_public: existingAnalysis.isPublic,
        company_name: existingAnalysis.companyName,
        library_url: existingAnalysis.isPublic ? '/library' : null,
        detected_company: {
          name: result.detected_company.name,
          confidence: result.detected_company.confidence,
          source: result.detected_company.source,
        },
        document_type: result.document_validation.document_type,
      },
    }, { headers: rateLimitHeaders });

  } catch (error) {
    console.error('Analysis error:', error);

    // Track error event
    try {
      const clientIP = getClientIP(request.headers);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const sessionHash = generateSessionHash(clientIP, userAgent);

      await prisma.analyticsEvent.create({
        data: {
          eventType: 'error_occurred',
          sessionHash,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/api/analyze',
          },
        },
      });
    } catch (analyticsError) {
      console.error('Failed to track error event:', analyticsError);
    }

    return NextResponse.json(
      formatError(
        error instanceof Error && process.env.NODE_ENV !== 'production' ? error.message : 'Internal server error',
        'ANALYSIS_ERROR'
      ),
      { status: 500 }
    );
  }
}
