import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  saveVerseNote,
  updateVerseNote,
  getVerseNotesByUserId,
  getVerseNotesByReference,
  deleteVerseNoteById,
  getVerseNotesForChapter,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || session.user.type === 'guest') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const verseStart = searchParams.get('verseStart');
    const verseEnd = searchParams.get('verseEnd');

    if (book && chapter) {
      // Get notes for specific reference
      if (verseStart) {
        const notes = await getVerseNotesByReference({
          userId: session.user.id,
          book,
          chapter,
          verseStart,
          verseEnd: verseEnd || undefined,
        });
        return NextResponse.json(notes);
      } else {
        // Get all notes for a chapter
        const notes = await getVerseNotesForChapter({
          userId: session.user.id,
          book,
          chapter,
        });
        return NextResponse.json(notes);
      }
    } else {
      // Get all verse notes for user
      const notes = await getVerseNotesByUserId({ userId: session.user.id });
      return NextResponse.json(notes);
    }
  } catch (error) {
    console.error('Error fetching verse notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verse notes' },
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
    const {
      id,
      book,
      chapter,
      verseStart,
      verseEnd,
      translation,
      content,
      verseText,
    } = body;

    if (!book || !chapter || !verseStart || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const noteId = id || generateUUID();

    await saveVerseNote({
      id: noteId,
      userId: session.user.id,
      book,
      chapter,
      verseStart,
      verseEnd,
      translation: translation || 'ESV',
      content,
      verseText,
    });

    return NextResponse.json({ success: true, id: noteId });
  } catch (error) {
    console.error('Error saving verse note:', error);
    return NextResponse.json(
      { error: 'Failed to save verse note' },
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
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json(
        { error: 'Note ID and content are required' },
        { status: 400 }
      );
    }

    await updateVerseNote({
      id,
      userId: session.user.id,
      content,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating verse note:', error);
    return NextResponse.json(
      { error: 'Failed to update verse note' },
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    await deleteVerseNoteById({
      id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting verse note:', error);
    return NextResponse.json(
      { error: 'Failed to delete verse note' },
      { status: 500 }
    );
  }
} 