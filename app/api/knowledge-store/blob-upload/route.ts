import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { sanitizeForPostgres } from '@/lib/utils';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    console.log('Blob upload request received');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Has BLOB_READ_WRITE_TOKEN:', !!process.env.BLOB_READ_WRITE_TOKEN);
    
    // Ensure we have the blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return NextResponse.json(
        { error: 'Blob storage is not properly configured. Please contact support.' },
        { status: 500 }
      );
    }
    
    const jsonResponse = await handleUpload({
      body,
      request,
      // IMPORTANT: Pass the token to authenticate with Vercel Blob
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname: string) => {
        console.log('Generating token for pathname:', pathname);
        
        // Authenticate user before generating upload token
        const session = await auth();
        
        if (!session?.user?.id) {
          console.error('No authenticated user found');
          throw new Error('Unauthorized');
        }

        // Validate file type from pathname
        const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf', '.csv', '.md', '.html'];
        const hasValidExtension = allowedExtensions.some(ext => 
          pathname.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExtension) {
          throw new Error('Invalid file type');
        }

        // Return token configuration
        return {
          allowedContentTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            'text/rtf',
            'application/rtf',
            'text/csv',
            'text/markdown',
            'text/html',
          ],
          tokenPayload: JSON.stringify({
            userId: session.user.id,
          }),
          // Add random suffix to avoid collisions
          addRandomSuffix: true,
          // Ensure files are publicly accessible
          access: 'public',
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs after the file is uploaded to Vercel Blob
        // Note: This won't work on localhost without ngrok
        console.log('Upload completed:', blob.pathname);
        console.log('Full blob object:', JSON.stringify(blob, null, 2));
        
        try {
          const { userId } = JSON.parse(tokenPayload || '{}');
          
          // For server-side access, we need to add the token to the URL
          const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
          
          // First try to use the blob URL as is (it might work if properly configured)
          let response = await fetch(blob.url);
          
          // If that fails, try with token
          if (!response.ok) {
            const authenticatedUrl = `${blob.url}?token=${blobToken}`;
            response = await fetch(authenticatedUrl);
          }
          
          if (!response.ok) {
            throw new Error(`Failed to fetch blob content: ${response.status} ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Extract text based on file type
          let extractedContent = '';
          const contentType = blob.contentType || '';
          
          try {
            switch (contentType) {
              case 'application/pdf':
                const pdfData = await pdf(buffer);
                extractedContent = sanitizeForPostgres(pdfData.text);
                break;

              case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docxResult = await mammoth.extractRawText({ buffer });
                extractedContent = sanitizeForPostgres(docxResult.value);
                break;

              case 'text/plain':
              case 'text/rtf':
              case 'text/csv':
              case 'text/markdown':
              case 'text/html':
                extractedContent = sanitizeForPostgres(new TextDecoder().decode(buffer));
                break;

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
                throw new Error(`Unsupported file type: ${contentType}`);
            }
          } catch (error) {
            console.error(`Error extracting text:`, error);
            extractedContent = `Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
          
          // Calculate file size from buffer
          const fileSize = buffer.length;
          let sizeString = '';
          if (fileSize < 1024) {
            sizeString = `${fileSize} B`;
          } else if (fileSize < 1024 * 1024) {
            sizeString = `${(fileSize / 1024).toFixed(1)} kB`;
          } else {
            sizeString = `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
          }
          
          // Get filename from pathname
          const filename = blob.pathname.split('/').pop() || 'Unknown file';
          
          // Store in database
          // When uploading with access: 'public', Vercel Blob should provide a public URL
          // The URL pattern for public blobs is: https://{storeId}.public.blob.vercel-storage.com/{pathname}
          let publicUrl = blob.url;
          
          // Check if we have a downloadUrl (some versions of the SDK provide this)
          if ((blob as any).downloadUrl) {
            publicUrl = (blob as any).downloadUrl;
          } 
          // If the URL doesn't contain 'public', try to construct the public URL
          else if (blob.url && !blob.url.includes('.public.blob.vercel-storage.com')) {
            // Extract store ID from the URL
            const urlMatch = blob.url.match(/https:\/\/([^.]+)\.blob\.vercel-storage\.com/);
            if (urlMatch && urlMatch[1]) {
              publicUrl = `https://${urlMatch[1]}.public.blob.vercel-storage.com/${blob.pathname}`;
            }
          }
          
          console.log('Blob URL resolution:', {
            originalUrl: blob.url,
            downloadUrl: (blob as any).downloadUrl,
            pathname: blob.pathname,
            resolvedPublicUrl: publicUrl,
          });
          
          await db
            .insert(knowledgeStore)
            .values({
              userId,
              name: filename,
              type: 'file',
              content: extractedContent,
              url: publicUrl,
              fileData: {
                originalName: filename,
                mimeType: contentType,
                uploadedAt: new Date().toISOString(),
                blobUrl: publicUrl,
                blobPathname: blob.pathname,
              },
              size: sizeString,
            });
            
          console.log('File processed and stored successfully');
        } catch (error) {
          console.error('Error processing uploaded file:', error);
          // Don't throw here as the file is already uploaded
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Blob upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
} 