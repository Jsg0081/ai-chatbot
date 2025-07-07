import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { knowledgeId } = await request.json();
    
    if (!knowledgeId) {
      return NextResponse.json({ error: 'Knowledge ID required' }, { status: 400 });
    }

    // Fetch the knowledge store item
    const [item] = await db
      .select()
      .from(knowledgeStore)
      .where(
        and(
          eq(knowledgeStore.id, knowledgeId),
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

    // Check if the URL is a Vercel Blob URL
    if (item.url.includes('blob.vercel-storage.com')) {
      // If it's already a public URL (has downloadUrl format), return as is
      if (item.url.includes('/public/') || item.url.includes('?download=1')) {
        return NextResponse.json({ url: item.url });
      }
      
      // Otherwise, we need to create a public URL
      // For now, we'll append a download parameter which might help
      const publicUrl = `${item.url}?download=1`;
      
      // Update the stored URL to the public version
      await db
        .update(knowledgeStore)
        .set({ url: publicUrl })
        .where(eq(knowledgeStore.id, knowledgeId));
      
      return NextResponse.json({ url: publicUrl });
    }

    // For non-blob URLs, return as is
    return NextResponse.json({ url: item.url });
  } catch (error) {
    console.error('Error generating public URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate public URL' },
      { status: 500 }
    );
  }
} 