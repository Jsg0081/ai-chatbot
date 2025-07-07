import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';

export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const testItem = await db
      .insert(knowledgeStore)
      .values({
        userId: session.user.id,
        name: `Test Item ${new Date().toISOString()}`,
        type: 'text',
        content: 'This is a test item created to verify database operations work correctly.',
        size: '82 B',
      })
      .returning();

    console.log('Test item created:', testItem[0]);

    return NextResponse.json({
      success: true,
      item: testItem[0],
      message: 'Test item created successfully',
    });
  } catch (error) {
    console.error('Test create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test item' },
      { status: 500 }
    );
  }
} 