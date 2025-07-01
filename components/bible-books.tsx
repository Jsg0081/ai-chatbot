'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

// Bible books with their chapter counts
const BIBLE_BOOKS_DATA = {
  oldTestament: [
    // Torah / Pentateuch
    { name: 'Genesis', chapters: 50 },
    { name: 'Exodus', chapters: 40 },
    { name: 'Leviticus', chapters: 27 },
    { name: 'Numbers', chapters: 36 },
    { name: 'Deuteronomy', chapters: 34 },
    // Historical Books
    { name: 'Joshua', chapters: 24 },
    { name: 'Judges', chapters: 21 },
    { name: 'Ruth', chapters: 4 },
    { name: '1 Samuel', chapters: 31 },
    { name: '2 Samuel', chapters: 24 },
    { name: '1 Kings', chapters: 22 },
    { name: '2 Kings', chapters: 25 },
    { name: '1 Chronicles', chapters: 29 },
    { name: '2 Chronicles', chapters: 36 },
    { name: 'Ezra', chapters: 10 },
    { name: 'Nehemiah', chapters: 13 },
    { name: 'Esther', chapters: 10 },
    // Wisdom Literature
    { name: 'Job', chapters: 42 },
    { name: 'Psalms', chapters: 150 },
    { name: 'Proverbs', chapters: 31 },
    { name: 'Ecclesiastes', chapters: 12 },
    { name: 'Song of Solomon', chapters: 8 },
    // Major Prophets
    { name: 'Isaiah', chapters: 66 },
    { name: 'Jeremiah', chapters: 52 },
    { name: 'Lamentations', chapters: 5 },
    { name: 'Ezekiel', chapters: 48 },
    { name: 'Daniel', chapters: 12 },
    // Minor Prophets
    { name: 'Hosea', chapters: 14 },
    { name: 'Joel', chapters: 3 },
    { name: 'Amos', chapters: 9 },
    { name: 'Obadiah', chapters: 1 },
    { name: 'Jonah', chapters: 4 },
    { name: 'Micah', chapters: 7 },
    { name: 'Nahum', chapters: 3 },
    { name: 'Habakkuk', chapters: 3 },
    { name: 'Zephaniah', chapters: 3 },
    { name: 'Haggai', chapters: 2 },
    { name: 'Zechariah', chapters: 14 },
    { name: 'Malachi', chapters: 4 },
  ],
  newTestament: [
    // Gospels
    { name: 'Matthew', chapters: 28 },
    { name: 'Mark', chapters: 16 },
    { name: 'Luke', chapters: 24 },
    { name: 'John', chapters: 21 },
    // History
    { name: 'Acts', chapters: 28 },
    // Paul's Letters
    { name: 'Romans', chapters: 16 },
    { name: '1 Corinthians', chapters: 16 },
    { name: '2 Corinthians', chapters: 13 },
    { name: 'Galatians', chapters: 6 },
    { name: 'Ephesians', chapters: 6 },
    { name: 'Philippians', chapters: 4 },
    { name: 'Colossians', chapters: 4 },
    { name: '1 Thessalonians', chapters: 5 },
    { name: '2 Thessalonians', chapters: 3 },
    { name: '1 Timothy', chapters: 6 },
    { name: '2 Timothy', chapters: 4 },
    { name: 'Titus', chapters: 3 },
    { name: 'Philemon', chapters: 1 },
    // General Letters
    { name: 'Hebrews', chapters: 13 },
    { name: 'James', chapters: 5 },
    { name: '1 Peter', chapters: 5 },
    { name: '2 Peter', chapters: 3 },
    { name: '1 John', chapters: 5 },
    { name: '2 John', chapters: 1 },
    { name: '3 John', chapters: 1 },
    { name: 'Jude', chapters: 1 },
    // Apocalyptic
    { name: 'Revelation', chapters: 22 },
  ],
};

export { BIBLE_BOOKS_DATA };

interface BibleBooksProps {
  onBookSelect?: (book: string, chapter?: number) => void;
}

export function BibleBooks({ onBookSelect }: BibleBooksProps) {
  const [isOldTestamentOpen, setIsOldTestamentOpen] = useState(false);
  const [isNewTestamentOpen, setIsNewTestamentOpen] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const handleBookClick = (book: string) => {
    setExpandedBook(expandedBook === book ? null : book);
    if (onBookSelect) {
      onBookSelect(book);
    }
  };

  const handleChapterClick = (book: string, chapter: number) => {
    if (onBookSelect) {
      onBookSelect(book, chapter);
    }
  };

  const renderBookWithChapters = (book: { name: string; chapters: number }) => {
    // Determine grid columns based on number of chapters
    const getGridCols = () => {
      if (book.chapters <= 10) return 'grid-cols-5';
      if (book.chapters <= 30) return 'grid-cols-6';
      if (book.chapters <= 50) return 'grid-cols-7';
      return 'grid-cols-8';
    };

    // For books with many chapters (>50), add max-height and scrolling
    const needsScroll = book.chapters > 50;

    return (
      <div key={book.name}>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => handleBookClick(book.name)}
            className="text-xs py-1 h-7"
          >
            <span className="flex-1">{book.name}</span>
            {expandedBook === book.name ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
        {expandedBook === book.name && (
          <div 
            className={`px-4 py-2 ${needsScroll ? 'max-h-48 overflow-y-auto' : ''}`}
          >
            <div className={`grid ${getGridCols()} gap-1`}>
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => (
                <Button
                  key={chapter}
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleChapterClick(book.name, chapter)}
                >
                  {chapter}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-8 font-medium text-sidebar-foreground/70"
            onClick={() => setIsOldTestamentOpen(!isOldTestamentOpen)}
          >
            <span>Old Testament</span>
            {isOldTestamentOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        </SidebarGroupLabel>
        {isOldTestamentOpen && (
          <SidebarGroupContent>
            <SidebarMenu>
              {BIBLE_BOOKS_DATA.oldTestament.map(renderBookWithChapters)}
            </SidebarMenu>
          </SidebarGroupContent>
        )}
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-8 font-medium text-sidebar-foreground/70"
            onClick={() => setIsNewTestamentOpen(!isNewTestamentOpen)}
          >
            <span>New Testament</span>
            {isNewTestamentOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        </SidebarGroupLabel>
        {isNewTestamentOpen && (
          <SidebarGroupContent>
            <SidebarMenu>
              {BIBLE_BOOKS_DATA.newTestament.map(renderBookWithChapters)}
            </SidebarMenu>
          </SidebarGroupContent>
        )}
      </SidebarGroup>
    </>
  );
} 