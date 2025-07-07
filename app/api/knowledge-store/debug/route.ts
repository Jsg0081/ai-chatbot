import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all items for current user
    const userItems = await db
      .select()
      .from(knowledgeStore)
      .where(eq(knowledgeStore.userId, session.user.id));

    // Get user details
    const [userDetails] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id));

    // Get all items (for debugging)
    const allItems = await db
      .select({
        id: knowledgeStore.id,
        userId: knowledgeStore.userId,
        name: knowledgeStore.name,
        type: knowledgeStore.type,
        createdAt: knowledgeStore.createdAt,
      })
      .from(knowledgeStore);

    return NextResponse.json({
      currentUser: {
        id: session.user.id,
        email: session.user.email,
        type: session.user.type,
        dbUser: userDetails,
      },
      userItems: {
        count: userItems.length,
        items: userItems,
      },
      allItems: {
        count: allItems.length,
        items: allItems,
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug info' },
      { status: 500 }
    );
  }
} 