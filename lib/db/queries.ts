import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  note,
  type Note,
  verseNote,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    return await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(desc(stream.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// Note-related queries
export async function saveNote({
  id,
  title,
  content,
  userId,
  chatId,
}: {
  id: string;
  title: string;
  content: string;
  userId: string;
  chatId?: string;
}) {
  try {
    console.log('Attempting to save note with userId:', userId);
    const noteData = {
      id,
      title,
      content,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(chatId ? { chatId } : {})
    };
    
    const result = await db.insert(note).values(noteData);
    console.log('Note saved successfully');
    return result;
  } catch (error) {
    console.error('Database error in saveNote:', error);
    console.error('Failed to save note with data:', { id, title: title.substring(0, 50), userId, chatId });
    if (error instanceof Error && 'code' in error) {
      // PostgreSQL error codes
      if ((error as any).code === '23503') {
        // Foreign key violation
        console.error('Foreign key violation - userId or chatId does not exist');
      }
    }
    throw new ChatSDKError('bad_request:database', 'Failed to save note');
  }
}

export async function updateNote({
  id,
  title,
  content,
  userId,
}: {
  id: string;
  title: string;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .update(note)
      .set({ title, content, updatedAt: new Date() })
      .where(and(eq(note.id, id), eq(note.userId, userId)));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update note');
  }
}

export async function getNotesByUserId({
  userId,
  limit = 50,
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(note)
      .where(eq(note.userId, userId))
      .orderBy(desc(note.updatedAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get notes by user id',
    );
  }
}

export async function getNoteById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [selectedNote] = await db
      .select()
      .from(note)
      .where(and(eq(note.id, id), eq(note.userId, userId)));
    return selectedNote;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get note by id');
  }
}

export async function deleteNoteById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [deletedNote] = await db
      .delete(note)
      .where(and(eq(note.id, id), eq(note.userId, userId)))
      .returning();
    return deletedNote;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete note by id',
    );
  }
}

// Verse Note queries
export async function saveVerseNote({
  id,
  userId,
  book,
  chapter,
  verseStart,
  verseEnd,
  translation,
  content,
  verseText,
}: {
  id: string;
  userId: string;
  book: string;
  chapter: string;
  verseStart: string;
  verseEnd?: string;
  translation: string;
  content: string;
  verseText?: string;
}) {
  try {
    const verseNoteData = {
      id,
      userId,
      book,
      chapter,
      verseStart,
      verseEnd,
      translation,
      content,
      verseText,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.insert(verseNote).values(verseNoteData);
    return result;
  } catch (error) {
    console.error('Database error in saveVerseNote:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to save verse note');
  }
}

export async function updateVerseNote({
  id,
  userId,
  content,
}: {
  id: string;
  userId: string;
  content: string;
}) {
  try {
    return await db
      .update(verseNote)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(verseNote.id, id), eq(verseNote.userId, userId)));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update verse note');
  }
}

export async function getVerseNotesByUserId({
  userId,
  limit = 100,
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(verseNote)
      .where(eq(verseNote.userId, userId))
      .orderBy(desc(verseNote.updatedAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get verse notes by user id',
    );
  }
}

export async function getVerseNotesByReference({
  userId,
  book,
  chapter,
  verseStart,
  verseEnd,
}: {
  userId: string;
  book: string;
  chapter: string;
  verseStart?: string;
  verseEnd?: string;
}) {
  try {
    const conditions = [
      eq(verseNote.userId, userId),
      eq(verseNote.book, book),
      eq(verseNote.chapter, chapter),
    ];
    
    if (verseStart) {
      // Get notes that include this verse
      conditions.push(lte(verseNote.verseStart, verseStart));
      if (verseEnd) {
        conditions.push(gte(verseNote.verseEnd || verseNote.verseStart, verseEnd));
      } else {
        conditions.push(gte(verseNote.verseEnd || verseNote.verseStart, verseStart));
      }
    }
    
    return await db
      .select()
      .from(verseNote)
      .where(and(...conditions))
      .orderBy(asc(verseNote.verseStart));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get verse notes by reference',
    );
  }
}

export async function getVerseNoteById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [selectedNote] = await db
      .select()
      .from(verseNote)
      .where(and(eq(verseNote.id, id), eq(verseNote.userId, userId)));
    return selectedNote;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get verse note by id');
  }
}

export async function deleteVerseNoteById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [deletedNote] = await db
      .delete(verseNote)
      .where(and(eq(verseNote.id, id), eq(verseNote.userId, userId)))
      .returning();
    return deletedNote;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete verse note by id',
    );
  }
}

export async function getVerseNotesForChapter({
  userId,
  book,
  chapter,
}: {
  userId: string;
  book: string;
  chapter: string;
}) {
  try {
    return await db
      .select()
      .from(verseNote)
      .where(
        and(
          eq(verseNote.userId, userId),
          eq(verseNote.book, book),
          eq(verseNote.chapter, chapter)
        )
      )
      .orderBy(asc(verseNote.verseStart));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get verse notes for chapter',
    );
  }
}
