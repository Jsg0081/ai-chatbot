import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { knowledgeStore } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await db
      .select()
      .from(knowledgeStore)
      .where(eq(knowledgeStore.userId, session.user.id))
      .orderBy(desc(knowledgeStore.updatedAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching knowledge store items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge store items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type, content, url, fileData, size } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const newItem = await db
      .insert(knowledgeStore)
      .values({
        userId: session.user.id,
        name,
        type,
        content,
        url,
        fileData,
        size,
      })
      .returning();

    return NextResponse.json(newItem[0]);
  } catch (error) {
    console.error('Error creating knowledge store item:', error);
    return NextResponse.json(
      { error: 'Failed to create knowledge store item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, content, url } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const updatedItem = await db
      .update(knowledgeStore)
      .set({
        name,
        content,
        url,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeStore.id, id),
          eq(knowledgeStore.userId, session.user.id)
        )
      )
      .returning();

    if (updatedItem.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedItem[0]);
  } catch (error) {
    console.error('Error updating knowledge store item:', error);
    return NextResponse.json(
      { error: 'Failed to update knowledge store item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const deletedItem = await db
      .delete(knowledgeStore)
      .where(
        and(
          eq(knowledgeStore.id, id),
          eq(knowledgeStore.userId, session.user.id)
        )
      )
      .returning();

    if (deletedItem.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting knowledge store item:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge store item' },
      { status: 500 }
    );
  }
} 