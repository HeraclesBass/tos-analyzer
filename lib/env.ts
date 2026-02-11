/**
 * Environment Variable Validation
 * Validates required env vars at startup using Zod.
 * Import this module early to fail fast on misconfiguration.
 * Skipped during Next.js build phase (NEXT_PHASE === 'phase-production-build').
 */

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  SESSION_SALT: z.string().min(16, 'SESSION_SALT must be at least 16 characters'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
});

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (!isBuildPhase) {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    );
    console.error(
      `\n[env] Missing or invalid environment variables:\n${errors.join('\n')}\n`
    );
    process.exit(1);
  }
}

export const env = envSchema.safeParse(process.env).data ?? ({} as z.infer<typeof envSchema>);
