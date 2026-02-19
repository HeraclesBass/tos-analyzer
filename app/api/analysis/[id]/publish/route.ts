/**
 * Publish Analysis to Library Endpoint
 * POST /api/analysis/[id]/publish
 *
 * Makes an existing analysis public and adds it to the library.
 * Requires the creator_token returned at analysis creation time.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatError, getClientIP, sanitizeCompanyName } from '@/lib/utils';
import { invalidateCache, CACHE_KEYS, checkRateLimit } from '@/lib/redis';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limit write endpoints (10/min per IP)
    const clientIP = getClientIP(request.headers);
    if (await checkRateLimit(clientIP)) {
      return NextResponse.json(
        formatError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
        { status: 429 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { company_name, add_to_library, creator_token } = body;

    // Validate inputs
    if (!company_name || typeof company_name !== 'string' || company_name.trim().length === 0) {
      return NextResponse.json(
        formatError('Company name is required', 'INVALID_INPUT'),
        { status: 400 }
      );
    }

    if (company_name.trim().length > 200) {
      return NextResponse.json(
        formatError('Company name too long (max 200 characters)', 'INVALID_INPUT'),
        { status: 400 }
      );
    }

    // Require creator token
    if (!creator_token || typeof creator_token !== 'string') {
      return NextResponse.json(
        formatError('creator_token is required to publish an analysis', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        formatError('Invalid analysis ID format', 'INVALID_ID'),
        { status: 400 }
      );
    }

    // Fetch the analysis
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

    // Verify creator token ownership
    if (!(analysis as any).creatorTokenHash) {
      return NextResponse.json(
        formatError('This analysis cannot be published (no ownership token)', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    const submittedHash = crypto
      .createHmac('sha256', process.env.SESSION_SALT || 'tos-analyzer-salt')
      .update(creator_token)
      .digest('hex');

    if (submittedHash !== (analysis as any).creatorTokenHash) {
      return NextResponse.json(
        formatError('Invalid creator token', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    // Update analysis to be public
    const updatedAnalysis = await prisma.analysis.update({
      where: { id },
      data: {
        companyName: sanitizeCompanyName(company_name),
        isPublic: add_to_library === true,
      },
    });

    // Invalidate cache
    await invalidateCache(`${CACHE_KEYS.SHARE}${id}`);
    await invalidateCache('tos:library:*');

    // Track analytics event
    await prisma.analyticsEvent.create({
      data: {
        analysisId: id,
        eventType: 'published_to_library',
        sessionHash: 'system',
        metadata: {
          company_name: sanitizeCompanyName(company_name),
          is_public: add_to_library === true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAnalysis.id,
        company_name: updatedAnalysis.companyName,
        is_public: updatedAnalysis.isPublic,
      },
    });

  } catch (error) {
    console.error('Publish error:', error);

    return NextResponse.json(
      formatError(
        error instanceof Error && process.env.NODE_ENV !== 'production'
          ? error.message
          : 'Failed to publish analysis',
        'PUBLISH_ERROR'
      ),
      { status: 500 }
    );
  }
}
