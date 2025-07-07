import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { blobUrl, filename, contentType, fileSize, pathname } = await request.json();
    
    if (!blobUrl || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the file content
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      // Try with token if direct access fails
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      const authenticatedUrl = `${blobUrl}?token=${blobToken}`;
      const authResponse = await fetch(authenticatedUrl);
      
      if (!authResponse.ok) {
        throw new Error(`Failed to fetch blob content: ${authResponse.status}`);
      }
      
      const arrayBuffer = await authResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Process the file
      return await processFile(buffer, {
        userId: session.user.id,
        filename,
        contentType,
        fileSize,
        blobUrl,
        pathname,
      });
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return await processFile(buffer, {
      userId: session.user.id,
      filename,
      contentType,
      fileSize,
      blobUrl,
      pathname,
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}

async function processFile(buffer: Buffer, metadata: {
  userId: string;
  filename: string;
  contentType: string;
  fileSize: number;
  blobUrl: string;
  pathname: string;
}) {
  // Extract text based on file type
  let extractedContent = '';
  
  try {
    switch (metadata.contentType) {
      case 'application/pdf':
        const pdfData = await pdf(buffer);
        extractedContent = pdfData.text;
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedContent = docxResult.value;
        break;

      case 'text/plain':
      case 'text/csv':
      case 'text/markdown':
      case 'text/html':
        extractedContent = new TextDecoder().decode(buffer);
        break;

      case 'text/rtf':
      case 'application/rtf':
        const rtfText = new TextDecoder().decode(buffer);
        extractedContent = rtfText
          .replace(/\\\\[a-z]+\b[0-9-]*/gi, '')
          .replace(/[{}]/g, '')
          .replace(/\\\*/g, '')
          .trim();
        break;

      default:
        extractedContent = `File type ${metadata.contentType} - content extraction not supported`;
    }
  } catch (error) {
    console.error(`Error extracting text:`, error);
    extractedContent = `Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
  
  // Calculate file size string
  let sizeString = '';
  if (metadata.fileSize < 1024) {
    sizeString = `${metadata.fileSize} B`;
  } else if (metadata.fileSize < 1024 * 1024) {
    sizeString = `${(metadata.fileSize / 1024).toFixed(1)} kB`;
  } else {
    sizeString = `${(metadata.fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  // Ensure we have a public URL
  let publicUrl = metadata.blobUrl;
  
  // If the URL doesn't contain 'public', try to construct the public URL
  if (metadata.blobUrl && !metadata.blobUrl.includes('.public.blob.vercel-storage.com')) {
    const urlMatch = metadata.blobUrl.match(/https:\/\/([^.]+)\.blob\.vercel-storage\.com/);
    if (urlMatch && urlMatch[1]) {
      publicUrl = `https://${urlMatch[1]}.public.blob.vercel-storage.com/${metadata.pathname}`;
    }
  }
  
  // Store in database
  console.log('Storing in database with userId:', metadata.userId);
  console.log('File metadata:', {
    name: metadata.filename,
    type: 'file',
    contentLength: extractedContent.length,
    url: publicUrl,
    size: sizeString,
  });
  
  const result = await db
    .insert(knowledgeStore)
    .values({
      userId: metadata.userId,
      name: metadata.filename,
      type: 'file',
      content: extractedContent,
      url: publicUrl,
      fileData: {
        originalName: metadata.filename,
        mimeType: metadata.contentType,
        uploadedAt: new Date().toISOString(),
        blobUrl: publicUrl,
        blobPathname: metadata.pathname,
      },
      size: sizeString,
    })
    .returning();
    
  console.log('Database insert result:', result);
    
  return NextResponse.json({ 
    success: true,
    message: 'File processed and stored successfully',
    item: result[0],
  });
} 