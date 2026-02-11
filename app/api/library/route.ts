/**
 * Public TOS Library Endpoint
 * GET /api/library
 * 
 * Retrieves public TOS analyses for the community library
 * Features:
 * - Search by company name
 * - Sort by popularity, recency, risk level
 * - Filter by category and risk level
 * - Pagination support
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { formatError } from '@/lib/utils';

// Query parameters validation schema
const LibraryQuerySchema = z.object({
  search: z.string().max(100).optional(),
  sort: z.enum(['popular', 'recent', 'risk-high', 'risk-low']).optional().default('popular'),
  category: z.string().max(100).optional(),
  filter: z.enum(['all', 'high-risk', 'medium-risk', 'low-risk']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

// Risk level mapping for sorting
const RISK_SCORES: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Parse analysis data JSON to extract key fields
 */
interface AnalysisData {
  summary?: {
    overall_risk?: string;
    total_clauses?: number;
    red_count?: number;
    yellow_count?: number;
    green_count?: number;
  };
  categories?: Array<{ name: string; clauses: Array<any> }>;
  [key: string]: any;
}

function parseAnalysisData(analysisData: any): {
  overallRisk: string;
  categories: string[];
  clauseCount: number;
  score: number;
} {
  const data = analysisData as AnalysisData;
  
  const redCount = data.summary?.red_count || 0;
  const yellowCount = data.summary?.yellow_count || 0;
  const greenCount = data.summary?.green_count || 0;
  const score = Math.round((redCount * 10 + yellowCount * 3 - greenCount + 50));
  
  return {
    overallRisk: data.summary?.overall_risk || 'unknown',
    categories: data.categories?.map(c => c.name) || [],
    clauseCount: data.summary?.total_clauses || 0,
    score,
  };
}

/**
 * Calculate risk score for sorting
 */
function getRiskScore(risk: string): number {
  return RISK_SCORES[risk] || 0;
}

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || 'popular',
      category: searchParams.get('category') || undefined,
      filter: searchParams.get('filter') || 'all',
      limit: searchParams.get('limit') || '50',
    };

    const validationResult = LibraryQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        formatError(
          validationResult.error.errors[0].message,
          'VALIDATION_ERROR'
        ),
        { status: 400 }
      );
    }

    const { search, sort, category, filter, limit } = validationResult.data;

    // Build WHERE clause
    const where: any = {
      isPublic: true,
    };

    // Search filter (company name case-insensitive)
    if (search) {
      where.companyName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Fetch all matching analyses
    // Note: We fetch all because risk filtering and category filtering require JSON parsing
    let analyses = await prisma.analysis.findMany({
      where,
      include: {
        shares: {
          select: {
            viewCount: true,
          },
        },
        _count: {
          select: {
            shares: true,
          },
        },
      },
    });

    // Parse and filter by category and risk
    const parsedAnalyses = analyses.map(analysis => {
      const parsed = parseAnalysisData(analysis.analysisData);
      const totalViews = analysis.shares.reduce((sum, share) => sum + share.viewCount, 0);
      
      return {
        id: analysis.id,
        companyName: analysis.companyName || 'Unknown',
        popularityScore: analysis.popularityScore,
        overallRisk: parsed.overallRisk,
        clauseCount: parsed.clauseCount,
        viewCount: totalViews,
        shareCount: analysis._count.shares,
        createdAt: analysis.createdAt,
        categories: parsed.categories,
        score: parsed.score,
      };
    });

    // Apply category filter
    let filteredAnalyses = parsedAnalyses;
    if (category) {
      filteredAnalyses = parsedAnalyses.filter(a => 
        a.categories.some(cat => 
          cat.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    // Apply risk filter
    if (filter !== 'all') {
      const riskLevel = filter.replace('-risk', ''); // 'high-risk' -> 'high'
      filteredAnalyses = filteredAnalyses.filter(a => 
        a.overallRisk.toLowerCase() === riskLevel
      );
    }

    // Apply sorting
    filteredAnalyses.sort((a, b) => {
      switch (sort) {
        case 'popular':
          return b.popularityScore - a.popularityScore;
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'risk-high':
          return getRiskScore(b.overallRisk) - getRiskScore(a.overallRisk);
        case 'risk-low':
          return getRiskScore(a.overallRisk) - getRiskScore(b.overallRisk);
        default:
          return 0;
      }
    });

    // Apply pagination
    const paginatedAnalyses = filteredAnalyses.slice(0, limit);
    const total = filteredAnalyses.length;

    return NextResponse.json({
      success: true,
      data: {
        analyses: paginatedAnalyses,
        total,
        limit,
        hasMore: total > limit,
      },
    });

  } catch (error) {
    console.error('Library retrieval error:', error);

    return NextResponse.json(
      formatError(
        error instanceof Error && process.env.NODE_ENV !== 'production' ? error.message : 'Internal server error',
        'RETRIEVAL_ERROR'
      ),
      { status: 500 }
    );
  }
}
