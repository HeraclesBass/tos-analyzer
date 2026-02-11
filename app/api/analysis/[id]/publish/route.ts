/**
 * Publish Analysis to Library Endpoint
 * POST /api/analysis/[id]/publish
 * 
 * Makes an existing analysis public and adds it to the library
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatError } from '@/lib/utils';
import { invalidateCache, CACHE_KEYS } from '@/lib/redis';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { company_name, add_to_library } = body;

    // Validate inputs
    if (!company_name || typeof company_name !== 'string' || company_name.trim().length === 0) {
      return NextResponse.json(
        formatError('Company name is required', 'INVALID_INPUT'),
        { status: 400 }
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

    // Update analysis to be public
    const updatedAnalysis = await prisma.analysis.update({
      where: { id },
      data: {
        companyName: company_name.trim(),
        isPublic: add_to_library === true,
      },
    });

    // Invalidate cache
    await invalidateCache(`${CACHE_KEYS.SHARE}${id}`);
    await invalidateCache('tos:library:*'); // Invalidate all library cache keys

    // Track analytics event
    await prisma.analyticsEvent.create({
      data: {
        analysisId: id,
        eventType: 'published_to_library',
        sessionHash: 'system',
        metadata: {
          company_name: company_name.trim(),
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
        error instanceof Error ? error.message : 'Failed to publish analysis',
        'PUBLISH_ERROR'
      ),
      { status: 500 }
    );
  }
}
