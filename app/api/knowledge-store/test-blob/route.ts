import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  return NextResponse.json({
    hasBlobToken: !!blobToken,
    tokenLength: blobToken?.length || 0,
    tokenPrefix: blobToken?.substring(0, 20) + '...' || 'not set',
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
} 