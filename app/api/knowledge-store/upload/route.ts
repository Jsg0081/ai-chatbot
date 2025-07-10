import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { knowledgeStore } from '@/lib/db/schema';
import { db } from '@/lib/db';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { z } from 'zod';
import { sanitizeForPostgres } from '@/lib/utils';

// Configure route segment to handle large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 20 * 1024 * 1024, {
      message: 'File size should be less than 20MB',
    })
    .refine((file) => [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/rtf',
      'application/rtf',
      'text/csv',
      'text/markdown',
      'text/html',
    ].includes(file.type), {
      message: 'File type not supported. Please upload PDF, DOCX, DOC, TXT, RTF, CSV, MD, or HTML files.',
    }),
});

async function extractTextFromFile(file: Blob, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type;

  try {
    switch (mimeType) {
      case 'application/pdf':
        const pdfData = await pdf(buffer);
        return sanitizeForPostgres(pdfData.text);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxResult = await mammoth.extractRawText({ buffer });
        return sanitizeForPostgres(docxResult.value);

      case 'text/plain':
      case 'text/rtf':
      case 'text/csv':
      case 'text/markdown':
      case 'text/html':
        return sanitizeForPostgres(new TextDecoder().decode(buffer));

      case 'application/rtf':
        // For RTF, we'll do basic extraction (remove RTF control codes)
        const rtfText = new TextDecoder().decode(buffer);
        // Basic RTF stripping - removes most control words and groups
        return sanitizeForPostgres(
          rtfText
            .replace(/\\\\[a-z]+\b[0-9-]*/gi, '') // Remove control words
            .replace(/[{}]/g, '') // Remove braces
            .replace(/\\\*/g, '') // Remove special chars
            .trim()
        );

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${filename}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check content length header to prevent parsing files that are too large
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 20MB limit' },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const name = formData.get('name') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData
    const uploadedFile = formData.get('file') as File;
    const filename = uploadedFile.name;
    const contentType = file.type;

    // Extract text content from the file
    let extractedContent = '';
    try {
      extractedContent = await extractTextFromFile(file, filename);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { error: `Failed to extract text from file: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Calculate file size
    const fileSize = file.size;
    let sizeString = '';
    if (fileSize < 1024) {
      sizeString = `${fileSize} B`;
    } else if (fileSize < 1024 * 1024) {
      sizeString = `${(fileSize / 1024).toFixed(1)} kB`;
    } else {
      sizeString = `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Store in database
    const newItem = await db
      .insert(knowledgeStore)
      .values({
        userId: session.user.id,
        name: name || filename,
        type: 'file',
        content: extractedContent,
        fileData: {
          originalName: filename,
          mimeType: contentType,
          uploadedAt: new Date().toISOString(),
        },
        size: sizeString,
      })
      .returning();

    return NextResponse.json({
      ...newItem[0],
      message: 'File uploaded and processed successfully',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 