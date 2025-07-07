import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { knowledgeStore } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq, and, ilike, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('Knowledge store search - query:', query, 'userId:', session.user.id);

    let items;
    
    if (!query) {
      // Return recent items when no query
      items = await db
        .select({
          id: knowledgeStore.id,
          name: knowledgeStore.name,
          type: knowledgeStore.type,
          size: knowledgeStore.size,
          createdAt: knowledgeStore.createdAt,
        })
        .from(knowledgeStore)
        .where(eq(knowledgeStore.userId, session.user.id))
        .limit(limit)
        .orderBy(desc(knowledgeStore.updatedAt));
    } else {
      // Search by name
      items = await db
        .select({
          id: knowledgeStore.id,
          name: knowledgeStore.name,
          type: knowledgeStore.type,
          size: knowledgeStore.size,
          createdAt: knowledgeStore.createdAt,
        })
        .from(knowledgeStore)
        .where(
          and(
            eq(knowledgeStore.userId, session.user.id),
            ilike(knowledgeStore.name, `%${query}%`)
          )
        )
        .limit(limit)
        .orderBy(desc(knowledgeStore.updatedAt));
    }

    console.log('Knowledge store search results:', items.length, 'items found');
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error searching knowledge store:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge store' },
      { status: 500 }
    );
  }
} 