import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import { put } from '@vercel/blob';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { sanitizeForPostgres } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  console.log('Server upload - session:', session?.user?.id);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if we have the blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return NextResponse.json(
        { error: 'Blob storage is not properly configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customName = formData.get('name') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/rtf',
      'application/rtf',
      'text/csv',
      'text/markdown',
      'text/html',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 500MB)' }, { status: 400 });
    }

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Vercel Blob
    const filename = customName || file.name;
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type,
    });

    console.log('Server-side blob upload successful:', {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
    });

    // Extract text content
    let extractedContent = '';
    try {
      switch (file.type) {
        case 'application/pdf':
          const pdfData = await pdf(buffer);
          extractedContent = sanitizeForPostgres(pdfData.text);
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          const docxResult = await mammoth.extractRawText({ buffer });
          extractedContent = sanitizeForPostgres(docxResult.value);
          break;

        case 'text/plain':
        case 'text/csv':
        case 'text/markdown':
        case 'text/html':
          extractedContent = sanitizeForPostgres(new TextDecoder().decode(buffer));
          break;

        case 'text/rtf':
        case 'application/rtf':
          const rtfText = new TextDecoder().decode(buffer);
          extractedContent = sanitizeForPostgres(
            rtfText
              .replace(/\\\\[a-z]+\b[0-9-]*/gi, '')
              .replace(/[{}]/g, '')
              .replace(/\\\*/g, '')
              .trim()
          );
          break;

        default:
          extractedContent = `File type ${file.type} - content extraction not supported`;
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      extractedContent = `Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Calculate file size string
    let sizeString = '';
    if (file.size < 1024) {
      sizeString = `${file.size} B`;
    } else if (file.size < 1024 * 1024) {
      sizeString = `${(file.size / 1024).toFixed(1)} kB`;
    } else {
      sizeString = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Use the public URL from blob response
    const publicUrl = blob.downloadUrl || blob.url;
    
    console.log('Saving to database with userId:', session.user.id);
    console.log('File details:', {
      name: filename,
      type: 'file',
      contentLength: extractedContent.length,
      url: publicUrl,
      size: sizeString,
    });

    // Store in database
    const newItem = await db
      .insert(knowledgeStore)
      .values({
        userId: session.user.id,
        name: filename,
        type: 'file',
        content: extractedContent,
        url: publicUrl,
        fileData: {
          originalName: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          blobUrl: publicUrl,
          blobPathname: blob.pathname,
        },
        size: sizeString,
      })
      .returning();

    console.log('Database insert successful:', newItem[0]);

    return NextResponse.json({
      success: true,
      item: newItem[0],
      blobUrl: publicUrl,
    });
  } catch (error) {
    console.error('Server upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
} 