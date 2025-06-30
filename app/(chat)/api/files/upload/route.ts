import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';

// Configure route segment to handle large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for large files

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 100 * 1024 * 1024, {
      message: 'File size should be less than 100MB',
    })
    // Accept images and PDFs
    .refine((file) => [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'application/pdf'
    ].includes(file.type), {
      message: 'File type should be JPEG, PNG, GIF, WebP, or PDF',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

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

    // Get filename and content type from formData
    const filename = (formData.get('file') as File).name;
    const contentType = file.type;
    const fileBuffer = await file.arrayBuffer();

    try {
      // Check if Blob storage is configured
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        // If Blob storage is not configured, convert to data URL for local development
        const base64 = Buffer.from(fileBuffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        return NextResponse.json({
          url: dataUrl,
          pathname: filename,
          contentType: contentType,
          name: filename,
        });
      }
      
      // Upload to Vercel Blob with content type
      const data = await put(`${filename}`, fileBuffer, {
        access: 'public',
        contentType: contentType,
      });

      // Return the uploaded file data with content type
      return NextResponse.json({
        ...data,
        contentType: contentType,
        name: filename,
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Fallback to data URL if Blob upload fails
      try {
        const base64 = Buffer.from(fileBuffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        return NextResponse.json({
          url: dataUrl,
          pathname: filename,
          contentType: contentType,
          name: filename,
        });
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
