/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Verifies system health:
 * - Database connectivity (Prisma)
 * - Redis connectivity
 * - Gemini API connectivity
 * - Top-level ok: true/false for external monitors
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRedisHealth } from '@/lib/redis';

export async function GET() {
  const checks: Record<string, boolean> = {
    database: false,
    redis: false,
    gemini: false,
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check Redis
  checks.redis = await checkRedisHealth();

  // Check Gemini API — only verify key is configured, don't make API calls
  // (Docker healthcheck runs every 30s — calling Gemini wastes tokens)
  checks.gemini = !!process.env.GEMINI_API_KEY;

  const ok = checks.database && checks.redis;

  return NextResponse.json(
    {
      ok,
      status: ok ? 'healthy' : 'unhealthy',
      version: process.env.npm_package_version || '1.0.0',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 500 }
  );
}
