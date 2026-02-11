/**
 * PDF Upload Endpoint
 * POST /api/upload
 * 
 * Handles PDF file uploads and extracts text content
 * Features:
 * - File validation (magic bytes, size limits)
 * - PDF text extraction
 * - Returns extracted text for analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import pdf from 'pdf-parse';
import { formatError, sanitizeFilename, getClientIP } from '@/lib/utils';
import { checkRateLimit, getRateLimitInfo } from '@/lib/redis';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    // Rate limiting
    const clientIP = getClientIP(request.headers);
    const rateLimitExceeded = await checkRateLimit(clientIP, 10);
    const rateLimitInfo = await getRateLimitInfo(clientIP, 10);
    const rateLimitHeaders = {
      'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
    };

    if (rateLimitExceeded) {
      return NextResponse.json(
        formatError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        formatError('No file provided', 'NO_FILE'),
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        formatError(
          `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          'FILE_TOO_LARGE'
        ),
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        formatError('Invalid file type. Only PDF files are allowed.', 'INVALID_FILE_TYPE'),
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate PDF magic bytes (PDF files start with %PDF)
    const magicBytes = buffer.slice(0, 4).toString();
    if (!magicBytes.startsWith('%PDF')) {
      return NextResponse.json(
        formatError('Invalid PDF file. File does not appear to be a valid PDF.', 'INVALID_PDF'),
        { status: 400 }
      );
    }

    // Save to temporary file
    const sanitized = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const filename = `${timestamp}-${sanitized}`;
    tempFilePath = join(tmpdir(), filename);

    await writeFile(tempFilePath, buffer);

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const data = await pdf(buffer);
    const extractedText = data.text;

    // Clean up temporary file
    await unlink(tempFilePath);
    tempFilePath = null;

    // Validate extracted text
    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        formatError(
          'Could not extract sufficient text from PDF. The file may be empty or contain only images.',
          'EXTRACTION_FAILED'
        ),
        { status: 400 }
      );
    }

    console.log(`Extracted ${extractedText.length} characters from PDF`);

    return NextResponse.json({
      success: true,
      data: {
        text: extractedText,
        filename: file.name,
        size: file.size,
        pages: data.numpages,
        word_count: extractedText.trim().split(/\s+/).length,
      },
    }, { headers: rateLimitHeaders });

  } catch (error) {
    console.error('PDF upload error:', error);

    // Clean up temporary file if it exists
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Failed to clean up temp file:', unlinkError);
      }
    }

    return NextResponse.json(
      formatError(
        error instanceof Error && process.env.NODE_ENV !== 'production' ? error.message : 'Internal server error',
        'UPLOAD_ERROR'
      ),
      { status: 500 }
    );
  }
}
