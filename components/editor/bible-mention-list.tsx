'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';

export interface BibleSuggestion {
  id: string;
  label: string;
  reference: string;
}

interface BibleMentionListProps {
  items: BibleSuggestion[];
  command: (item: BibleSuggestion) => void;
}

// Bible books organized by category for better UX
const BIBLE_BOOKS = {
  'Old Testament': [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
    'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms',
    'Proverbs', 'Ecclesiastes', 'Song of Solomon',
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
    'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
    'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
    'Zechariah', 'Malachi'
  ],
  'New Testament': [
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
    'Ephesians', 'Philippians', 'Colossians',
    '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
    'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation'
  ]
};

const ALL_BOOKS = [...BIBLE_BOOKS['Old Testament'], ...BIBLE_BOOKS['New Testament']];

// Popular verses for quick access
const POPULAR_VERSES = [
  'John 3:16',
  'Psalm 23:1',
  'Philippians 4:13',
  'Romans 8:28',
  'Proverbs 3:5-6',
  'Isaiah 40:31',
  'Matthew 28:19-20',
  'Jeremiah 29:11'
];

// Parse the query to understand what the user is typing
function parseQuery(query: string): { book?: string; chapter?: string; verse?: string; isComplete: boolean } {
  const trimmed = query.trim();
  
  // Check if it's a complete verse reference (e.g., "John 3:16" or "Matthew 5:1-10")
  const verseMatch = trimmed.match(/^(.+?)\s+(\d+):(\d+(?:-\d+)?)$/);
  if (verseMatch) {
    return {
      book: verseMatch[1],
      chapter: verseMatch[2],
      verse: verseMatch[3],
      isComplete: true
    };
  }
  
  // Check if it's book + chapter (e.g., "John 3")
  const chapterMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (chapterMatch) {
    return {
      book: chapterMatch[1],
      chapter: chapterMatch[2],
      isComplete: false
    };
  }
  
  // Otherwise it's just a book name being typed
  return {
    book: trimmed,
    isComplete: false
  };
}

export function getBibleSuggestions(query: string): BibleSuggestion[] {
  const parsed = parseQuery(query);
  
  // If it's a complete verse reference, return it as the only suggestion
  if (parsed.isComplete && parsed.book && parsed.chapter && parsed.verse) {
    const bookMatch = ALL_BOOKS.find(book => 
      book.toLowerCase().startsWith(parsed.book!.toLowerCase())
    );
    
    if (bookMatch) {
      const reference = `${bookMatch} ${parsed.chapter}:${parsed.verse}`;
      return [{
        id: reference.toLowerCase().replace(/\s+/g, '-'),
        label: reference,
        reference: reference
      }];
    }
  }
  
  // If we have book + chapter, suggest verse numbers
  if (parsed.book && parsed.chapter && !parsed.verse) {
    const bookMatch = ALL_BOOKS.find(book => 
      book.toLowerCase().startsWith(parsed.book!.toLowerCase())
    );
    
    if (bookMatch) {
      // Suggest common verse patterns
      const suggestions: BibleSuggestion[] = [];
      
      // Single verses
      for (let i = 1; i <= 5; i++) {
        const reference = `${bookMatch} ${parsed.chapter}:${i}`;
        suggestions.push({
          id: reference.toLowerCase().replace(/\s+/g, '-'),
          label: reference,
          reference: reference
        });
      }
      
      // Common verse ranges
      suggestions.push({
        id: `${bookMatch}-${parsed.chapter}-1-5`.toLowerCase(),
        label: `${bookMatch} ${parsed.chapter}:1-5`,
        reference: `${bookMatch} ${parsed.chapter}:1-5`
      });
      
      return suggestions;
    }
  }
  
  // If we're still typing the book name
  if (parsed.book && !parsed.chapter) {
    const matchingBooks = ALL_BOOKS.filter(book =>
      book.toLowerCase().includes(parsed.book!.toLowerCase())
    );
    
    if (matchingBooks.length > 0) {
      return matchingBooks.slice(0, 8).map(book => ({
        id: book.toLowerCase().replace(/\s+/g, '-'),
        label: book,
        reference: book
      }));
    }
  }
  
  // Default: show popular verses
  if (!query || query.length === 0) {
    return POPULAR_VERSES.map(verse => ({
      id: verse.toLowerCase().replace(/\s+/g, '-'),
      label: verse,
      reference: verse
    }));
  }
  
  return [];
}

export const BibleMentionList = forwardRef<any, BibleMentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="p-2 text-sm text-muted-foreground">
          Type a book name, chapter, and verse (e.g., John 3:16)
        </div>
      );
    }

    return (
      <div className="max-h-[300px] overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => selectItem(index)}
            className={cn(
              'flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent',
              index === selectedIndex && 'bg-accent'
            )}
          >
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    );
  }
);

BibleMentionList.displayName = 'BibleMentionList'; 