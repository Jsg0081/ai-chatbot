import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        // Authenticate user before generating upload token
        const session = await auth();
        
        if (!session?.user?.id) {
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
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs after the file is uploaded to Vercel Blob
        // Note: This won't work on localhost without ngrok
        console.log('Upload completed:', blob.pathname);
        
        try {
          const { userId } = JSON.parse(tokenPayload || '{}');
          
          // Fetch the file content from Vercel Blob
          const response = await fetch(blob.url);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Extract text based on file type
          let extractedContent = '';
          const contentType = blob.contentType || '';
          
          try {
            switch (contentType) {
              case 'application/pdf':
                const pdfData = await pdf(buffer);
                extractedContent = pdfData.text;
                break;

              case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docxResult = await mammoth.extractRawText({ buffer });
                extractedContent = docxResult.value;
                break;

              case 'text/plain':
              case 'text/rtf':
              case 'text/csv':
              case 'text/markdown':
              case 'text/html':
                extractedContent = new TextDecoder().decode(buffer);
                break;

              case 'application/rtf':
                const rtfText = new TextDecoder().decode(buffer);
                extractedContent = rtfText
                  .replace(/\\\\[a-z]+\b[0-9-]*/gi, '')
                  .replace(/[{}]/g, '')
                  .replace(/\\\*/g, '')
                  .trim();
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
          await db
            .insert(knowledgeStore)
            .values({
              userId,
              name: filename,
              type: 'file',
              content: extractedContent,
              url: blob.url,
              fileData: {
                originalName: filename,
                mimeType: contentType,
                uploadedAt: new Date().toISOString(),
                blobUrl: blob.url,
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
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
} 