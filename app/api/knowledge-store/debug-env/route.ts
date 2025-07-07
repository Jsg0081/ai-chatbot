import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only show debug info to authenticated users
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    tokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length || 0,
    // Show first 10 chars of token for verification (safe to show partial)
    tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 10) || 'not set',
  });
} 