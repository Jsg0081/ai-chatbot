import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { put } from '@vercel/blob';

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  // Try to test blob upload with a small test file
  let testResult = null;
  try {
    // Create a small test blob
    const testContent = 'Test blob upload at ' + new Date().toISOString();
    const testBlob = await put('test-' + Date.now() + '.txt', testContent, {
      access: 'public',
      token: blobToken,
    });
    
    testResult = {
      success: true,
      url: testBlob.url,
      downloadUrl: testBlob.downloadUrl,
      pathname: testBlob.pathname,
    };
  } catch (error) {
    testResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
  
  return NextResponse.json({
    hasBlobToken: !!blobToken,
    tokenLength: blobToken?.length || 0,
    tokenPrefix: blobToken?.substring(0, 20) + '...' || 'not set',
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    testUpload: testResult,
  });
} 