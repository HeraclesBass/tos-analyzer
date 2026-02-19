/**
 * PDF Export Endpoint
 * GET /api/export/[id]
 * 
 * Exports analysis results as PDF (simplified version for MVP)
 * Note: Full PDF generation with puppeteer can be added later
 * For now, returns JSON that can be rendered client-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkReadRateLimit } from '@/lib/redis';
import { formatError, generateSessionHash, getClientIP } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limit read endpoints (30/min per IP)
    const clientIP = getClientIP(request.headers);
    if (await checkReadRateLimit(clientIP)) {
      return NextResponse.json(
        formatError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
        { status: 429 }
      );
    }

    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        formatError('Invalid analysis ID format', 'INVALID_ID'),
        { status: 400 }
      );
    }

    // Fetch analysis
    const analysis = await prisma.analysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      return NextResponse.json(
        formatError('Analysis not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(analysis.expiresAt) < new Date()) {
      return NextResponse.json(
        formatError('Analysis has expired', 'EXPIRED'),
        { status: 410 }
      );
    }

    // Track analytics event
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const sessionHash = generateSessionHash(clientIP, userAgent);

    await prisma.analyticsEvent.create({
      data: {
        analysisId: id,
        eventType: 'pdf_exported',
        sessionHash,
        metadata: {
          export_format: 'json',
        },
      },
    });

    // For MVP, return formatted JSON that frontend can use
    // Full PDF generation can be added later with puppeteer
    return NextResponse.json({
      success: true,
      data: {
        id: analysis.id,
        analysis: analysis.analysisData,
        metadata: {
          created_at: analysis.createdAt,
          word_count: analysis.wordCount,
          source_type: analysis.sourceType,
        },
      },
    });

  } catch (error) {
    console.error('Export error:', error);

    return NextResponse.json(
      formatError(
        error instanceof Error && process.env.NODE_ENV !== 'production' ? error.message : 'Internal server error',
        'EXPORT_ERROR'
      ),
      { status: 500 }
    );
  }
}
