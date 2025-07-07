import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [item] = await db
      .select()
      .from(knowledgeStore)
      .where(
        and(
          eq(knowledgeStore.id, id),
          eq(knowledgeStore.userId, session.user.id)
        )
      )
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: 'Knowledge item not found' }, { status: 404 });
    }

    // If it's not a file or doesn't have a URL, return the existing URL
    if (item.type !== 'file' || !item.url) {
      return NextResponse.json({ url: item.url });
    }

    // For Vercel Blob URLs, ensure we have the public version
    if (item.url.includes('blob.vercel-storage.com')) {
      // The URL might already be public if it contains 'public' in the path
      if (item.url.includes('.public.blob.vercel-storage.com')) {
        return NextResponse.json({ url: item.url });
      }
      
      // Otherwise, the blob was likely uploaded with access: 'public' 
      // but we stored the wrong URL. The public URL pattern is:
      // https://{storeId}.public.blob.vercel-storage.com/{pathname}
      const urlParts = item.url.match(/https:\/\/([^.]+)\.blob\.vercel-storage\.com\/(.+)/);
      if (urlParts && urlParts[1] && urlParts[2]) {
        const publicUrl = `https://${urlParts[1]}.public.blob.vercel-storage.com/${urlParts[2]}`;
        
        // Update the stored URL to the public version
        await db
          .update(knowledgeStore)
          .set({ 
            url: publicUrl,
            fileData: item.fileData ? {
              ...item.fileData,
              blobUrl: publicUrl
            } : item.fileData
          })
          .where(eq(knowledgeStore.id, id));
        
        return NextResponse.json({ url: publicUrl });
      }
    }

    // For non-blob URLs, return as is
    return NextResponse.json({ url: item.url });
  } catch (error) {
    console.error('Error getting public URL:', error);
    return NextResponse.json(
      { error: 'Failed to get public URL' },
      { status: 500 }
    );
  }
} 