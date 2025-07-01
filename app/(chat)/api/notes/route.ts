import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  saveNote,
  updateNote,
  getNotesByUserId,
  deleteNoteById,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || session.user.type === 'guest') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notes = await getNotesByUserId({ userId: session.user.id });
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || session.user.type === 'guest') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, chatId } = body;

    const id = generateUUID();
    await saveNote({
      id,
      title: title || 'New Note',
      content: content || '',
      userId: session.user.id,
      chatId,
    });

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || session.user.type === 'guest') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    await updateNote({
      id,
      title: title || 'New Note',
      content: content || '',
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || session.user.type === 'guest') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    await deleteNoteById({
      id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
} 