import type { CoreAssistantMessage, CoreToolMessage, UIMessage } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string): string {
  return text.trim();
}

export function truncateVerseReferences(text: string): { displayText: string; hasVerses: boolean } {
  // Pattern to match Bible verse references like [Book Chapter:Verse] "text"
  const versePattern = /\[([^\]]+)\s+(\d+):(\d+)\]\s*"([^"]+)"/g;
  
  const verses: string[] = [];
  let lastIndex = 0;
  let match;
  
  // Find all verse references
  while ((match = versePattern.exec(text)) !== null) {
    if (match.index === lastIndex) {
      verses.push(`${match[1]} ${match[2]}:${match[3]}`);
      lastIndex = versePattern.lastIndex;
    }
  }
  
  // If no verses found, return original text
  if (verses.length === 0) {
    return { displayText: text, hasVerses: false };
  }
  
  // Extract the user's actual message (text after all verse references)
  const userMessage = text.substring(lastIndex).trim();
  
  // Create truncated display text
  let displayText = '';
  
  if (verses.length === 1) {
    displayText = `📖 ${verses[0]}`;
  } else if (verses.length <= 3) {
    displayText = `📖 ${verses.join(', ')}`;
  } else {
    displayText = `📖 ${verses.slice(0, 2).join(', ')} + ${verses.length - 2} more`;
  }
  
  // Add the user's message if it exists
  if (userMessage) {
    displayText += `\n\n${userMessage}`;
  }
  
  return { displayText, hasVerses: true };
}

export function getMissingKeys() {
  const missingKeys: string[] = [];

  if (!process.env.OPENAI_API_KEY) {
    missingKeys.push('OPENAI_API_KEY');
  }

  return missingKeys;
}

export function sanitizeForPostgres(text: string): string {
  if (!text) return '';
  
  // Remove null bytes (0x00) which PostgreSQL cannot store in text columns
  // Also remove other problematic control characters
  return text
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control chars except \t, \n, \r
    .trim();
}
