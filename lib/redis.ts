/**
 * Redis Client for Caching
 * Handles analysis caching, share links, and rate limiting
 */

import '@/lib/env';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Redis Client Connected');
});

// Cache key prefixes
export const CACHE_KEYS = {
  ANALYSIS: 'tos:analysis:',
  SHARE: 'tos:share:',
  RATE_LIMIT: 'ratelimit:ip:',
  SESSION: 'session:',
};

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  ANALYSIS: 7 * 24 * 60 * 60, // 7 days
  SHARE: 30 * 24 * 60 * 60, // 30 days
  RATE_LIMIT: 60, // 1 minute
  SESSION: 24 * 60 * 60, // 24 hours
};

/**
 * Get cached analysis by content hash
 */
export async function getCachedAnalysis(contentHash: string): Promise<any | null> {
  try {
    const key = `${CACHE_KEYS.ANALYSIS}${contentHash}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Cache analysis results
 */
export async function cacheAnalysis(contentHash: string, data: any): Promise<void> {
  try {
    const key = `${CACHE_KEYS.ANALYSIS}${contentHash}`;
    await redis.setex(key, CACHE_TTL.ANALYSIS, JSON.stringify(data));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

/**
 * Get cached share link data
 */
export async function getCachedShare(shareId: string): Promise<any | null> {
  try {
    const key = `${CACHE_KEYS.SHARE}${shareId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Cache share link data
 */
export async function cacheShare(shareId: string, data: any): Promise<void> {
  try {
    const key = `${CACHE_KEYS.SHARE}${shareId}`;
    await redis.setex(key, CACHE_TTL.SHARE, JSON.stringify(data));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

/**
 * Check rate limit for IP address
 * Returns true if rate limit exceeded
 */
export async function checkRateLimit(ip: string, limit: number = 10): Promise<boolean> {
  try {
    const key = `${CACHE_KEYS.RATE_LIMIT}${ip}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      // First request, set expiry
      await redis.expire(key, CACHE_TTL.RATE_LIMIT);
    }
    
    return count > limit;
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return false; // Fail open on Redis errors
  }
}

/**
 * Get current rate limit count for IP
 */
export async function getRateLimitCount(ip: string): Promise<number> {
  try {
    const key = `${CACHE_KEYS.RATE_LIMIT}${ip}`;
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Redis rate limit count error:', error);
    return 0;
  }
}

/**
 * Clear rate limit for IP (admin use)
 */
export async function clearRateLimit(ip: string): Promise<void> {
  try {
    const key = `${CACHE_KEYS.RATE_LIMIT}${ip}`;
    await redis.del(key);
  } catch (error) {
    console.error('Redis clear rate limit error:', error);
  }
}

/**
 * Invalidate cache by key or pattern
 * Uses SCAN instead of KEYS to avoid blocking Redis on large datasets
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  try {
    if (keyOrPattern.includes('*')) {
      let deletedCount = 0;
      const stream = redis.scanStream({ match: keyOrPattern, count: 100 });

      await new Promise<void>((resolve, reject) => {
        stream.on('data', async (keys: string[]) => {
          if (keys.length > 0) {
            stream.pause();
            await redis.del(...keys);
            deletedCount += keys.length;
            stream.resume();
          }
        });
        stream.on('end', () => {
          if (deletedCount > 0) {
            console.log(`Invalidated ${deletedCount} cache keys matching ${keyOrPattern}`);
          }
          resolve();
        });
        stream.on('error', reject);
      });
    } else {
      await redis.del(keyOrPattern);
      console.log(`Invalidated cache key: ${keyOrPattern}`);
    }
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
}

/**
 * Get rate limit info for response headers
 */
export async function getRateLimitInfo(ip: string, limit: number = 10): Promise<{
  limit: number;
  remaining: number;
  reset: number;
}> {
  try {
    const key = `${CACHE_KEYS.RATE_LIMIT}${ip}`;
    const [count, ttl] = await Promise.all([
      redis.get(key),
      redis.ttl(key),
    ]);
    const current = count ? parseInt(count, 10) : 0;
    return {
      limit,
      remaining: Math.max(0, limit - current),
      reset: ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : Math.floor(Date.now() / 1000) + CACHE_TTL.RATE_LIMIT,
    };
  } catch (error) {
    console.error('Redis rate limit info error:', error);
    return { limit, remaining: limit, reset: Math.floor(Date.now() / 1000) + CACHE_TTL.RATE_LIMIT };
  }
}

/**
 * Health check - verify Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

export default redis;
