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
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  // Check Gemini API (lightweight — list models)
  try {
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      await model.countTokens('health check');
      checks.gemini = true;
    }
  } catch (error) {
    console.error('Gemini health check failed:', error);
  }

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
