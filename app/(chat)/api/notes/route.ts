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

  console.log('Session in POST /api/notes:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userType: session?.user?.type,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
  });

  if (!session || !session.user || session.user.type === 'guest') {
    console.log('Unauthorized: Guest or no user');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, content, chatId } = body;

    // Log the data being saved
    console.log('Saving note with data:', {
      id: id || 'will be generated',
      title: title || 'New Note',
      contentLength: content?.length || 0,
      userId: session.user.id,
      chatId: chatId || 'null',
    });

    // Use provided ID or generate a new one
    const noteId = id || generateUUID();
    
    // Check if chat exists before including chatId
    let validChatId: string | undefined;
    if (chatId && chatId !== 'new') {
      try {
        const { getChatById } = await import('@/lib/db/queries');
        const chat = await getChatById({ id: chatId });
        if (chat) {
          validChatId = chatId;
        } else {
          console.log(`Chat with id ${chatId} does not exist yet, saving note without chatId`);
        }
      } catch (error) {
        console.log('Error checking chat existence:', error);
        // If there's an error checking, save without chatId
      }
    }
    
    const noteData = {
      id: noteId,
      title: title || 'New Note',
      content: content || '',
      userId: session.user.id,
      ...(validChatId ? { chatId: validChatId } : {})
    };
    
    await saveNote(noteData);
    
    return NextResponse.json({ success: true, id: noteId });
  } catch (error) {
    console.error('Error saving note:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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