import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all items for the current user
    const items = await db
      .select()
      .from(knowledgeStore)
      .where(eq(knowledgeStore.userId, session.user.id));

    let fixed = 0;
    
    for (const item of items) {
      if (item.type === 'file' && item.url && item.url.includes('blob.vercel-storage.com')) {
        // Check if URL needs fixing
        if (!item.url.includes('.public.blob.vercel-storage.com')) {
          // Extract store ID and pathname
          const urlMatch = item.url.match(/https:\/\/([^.\/]+)\.blob\.vercel-storage\.com\/(.+)/);
          if (urlMatch && urlMatch[1] && urlMatch[2]) {
            const storeId = urlMatch[1];
            const pathname = urlMatch[2];
            const publicUrl = `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;
            
            // Update the URL
            await db
              .update(knowledgeStore)
              .set({ 
                url: publicUrl,
                fileData: item.fileData ? {
                  ...item.fileData,
                  blobUrl: publicUrl
                } : item.fileData
              })
              .where(eq(knowledgeStore.id, item.id));
            
            fixed++;
          }
        }
      }
    }

    return NextResponse.json({ 
      message: `Fixed ${fixed} blob URLs`,
      totalItems: items.length 
    });
  } catch (error) {
    console.error('Error fixing blob URLs:', error);
    return NextResponse.json(
      { error: 'Failed to fix blob URLs' },
      { status: 500 }
    );
  }
} 