/**
 * Utility Functions
 * Text normalization, hashing, validation, etc.
 */

import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind class name utility
 * Merges Tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize text content for consistent hashing
 * - Convert to lowercase
 * - Trim whitespace
 * - Collapse multiple spaces/newlines
 * - Remove special characters that don't affect meaning
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/[^\w\s.,!?;:()\-]/g, '') // Remove special chars except common punctuation
    .trim();
}

/**
 * Generate SHA-256 hash of normalized content
 * Used for cache keys and duplicate detection
 */
export function hashContent(text: string): string {
  const normalized = normalizeText(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generate session hash (anonymized user identifier)
 * Combines IP + User-Agent + Salt for privacy
 */
export function generateSessionHash(ip: string, userAgent: string): string {
  const salt = process.env.SESSION_SALT;
  if (!salt) {
    throw new Error('SESSION_SALT environment variable is required');
  }
  const combined = `${ip}:${userAgent}:${salt}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Count characters in text (excluding whitespace)
 */
export function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * Validate TOS text input
 * Returns error message if invalid, null if valid
 */
export function validateTOSText(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return 'Text is required';
  }

  const trimmed = text.trim();
  
  if (trimmed.length < 50) {
    return 'Text is too short (minimum 50 characters)';
  }

  if (trimmed.length > 500000) {
    return 'Text is too long (maximum 500,000 characters)';
  }

  const wordCount = countWords(trimmed);
  if (wordCount < 10) {
    return 'Text is too short (minimum 10 words)';
  }

  if (wordCount > 50000) {
    return 'Text is too long (maximum 50,000 words)';
  }

  return null;
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate expiry date (30 days from now)
 */
export function calculateExpiryDate(days: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Check if analysis is expired
 */
export function isExpired(expiresAt: Date | string): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check various headers for IP (reverse proxy aware)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Format error response
 */
export function formatError(message: string, code: string = 'UNKNOWN_ERROR') {
  return {
    error: message,
    code,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format success response
 */
export function formatSuccess<T>(data: T) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Chunk text into smaller pieces for processing
 * Used when text exceeds Claude's context window
 */
export function chunkText(text: string, maxWords: number = 10000): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  
  return chunks;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Sleep utility for retries
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay calculation
 */
export function calculateBackoff(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000);
}

/**
 * Calculate popularity score for library ranking
 * Formula: totalViews + (shareCount * 2)
 * Shares are weighted 2x because they indicate higher engagement
 */
export function calculatePopularityScore(viewCount: number, shareCount: number): number {
  return viewCount + (shareCount * 2);
}
