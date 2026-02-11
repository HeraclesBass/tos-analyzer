/**
 * Shareable Analysis Endpoint
 * GET /api/analysis/[id]
 * 
 * Retrieves analysis by ID (for shareable links)
 * Tracks view count and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedShare, cacheShare } from '@/lib/redis';
import { formatError, generateSessionHash, getClientIP, calculatePopularityScore } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        formatError('Invalid analysis ID format', 'INVALID_ID'),
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await getCachedShare(id);
    if (cached) {
      console.log('Share cache HIT');
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from database
    const analysis = await prisma.analysis.findUnique({
      where: { id },
      include: {
        shares: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
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

    // Create or update share record
    const clientIP = getClientIP(request.headers);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const sessionHash = generateSessionHash(clientIP, userAgent);

    let share = analysis.shares[0];
    if (!share) {
      // Create new share record
      share = await prisma.share.create({
        data: {
          analysisId: id,
          sessionHash,
          expiresAt: analysis.expiresAt,
          viewCount: 1,
        },
      });
    } else {
      // Increment view count
      share = await prisma.share.update({
        where: { id: share.id },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }

    // Track analytics event
    await prisma.analyticsEvent.create({
      data: {
        analysisId: id,
        eventType: 'share_viewed',
        sessionHash,
        metadata: {
          view_count: share.viewCount,
        },
      },
    });

    // Update popularity score for public analyses
    if (analysis.isPublic) {
      const totalShareCount = await prisma.share.count({
        where: { analysisId: id },
      });
      const newPopularityScore = calculatePopularityScore(share.viewCount, totalShareCount);
      
      await prisma.analysis.update({
        where: { id },
        data: { popularityScore: newPopularityScore },
      });
    }

    console.log('Analysis fields:', {
      companyName: analysis.companyName,
      isPublic: analysis.isPublic
    });

    // Prepare response data
    const responseData = {
      id: analysis.id,
      analysis: analysis.analysisData,
      source_type: analysis.sourceType,
      source_url: analysis.sourceUrl,
      word_count: analysis.wordCount,
      created_at: analysis.createdAt,
      expires_at: analysis.expiresAt,
      view_count: share.viewCount,
      company_name: analysis.companyName,
      is_public: analysis.isPublic,
    };

    // Cache the result
    await cacheShare(id, responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });

  } catch (error) {
    console.error('Share retrieval error:', error);

    return NextResponse.json(
      formatError(
        error instanceof Error && process.env.NODE_ENV !== 'production' ? error.message : 'Internal server error',
        'RETRIEVAL_ERROR'
      ),
      { status: 500 }
    );
  }
}
