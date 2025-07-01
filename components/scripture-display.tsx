'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpenIcon } from 'lucide-react';
import { useVerse } from '@/lib/verse-context';
import { BIBLE_BOOKS_DATA } from './bible-books';

interface ScriptureDisplayProps {
  book: string;
  chapter: number;
}

interface Verse {
  verse: number;
  text: string;
}

interface ScriptureData {
  reference: string;
  verses: Verse[];
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

const TRANSLATIONS = [
  { id: 'esv', name: 'English Standard Version' },
  { id: 'asv', name: 'American Standard Version' },
  { id: 'bbe', name: 'Bible in Basic English' },
  { id: 'darby', name: 'Darby Translation' },
  { id: 'kjv', name: 'King James Version' },
  { id: 'web', name: 'World English Bible' },
  { id: 'ylt', name: "Young's Literal Translation" },
];

// Add the following CSS class to style selected verses
const selectedVerseStyle = {
  color: '#80ffdb', // Lime Green
  backgroundColor: 'rgba(128, 255, 219, 0.10)', // Lime Green with 15% opacity
  padding: '2px 4px',
  borderRadius: '4px',
  cursor: 'grab',
};

export function ScriptureDisplay({ book, chapter }: ScriptureDisplayProps) {
  const [scripture, setScripture] = useState<ScriptureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState('esv');
  const [isDragging, setIsDragging] = useState(false);
  const { addVerse, isVerseSelected, selectedVerses } = useVerse();

  // Calculate selected verses for current chapter
  const selectedVersesInChapter = selectedVerses.filter(
    v => v.book === book && v.chapter === chapter
  );

  useEffect(() => {
    const fetchScripture = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;
        
        if (translation === 'esv') {
          // Use our ESV API route
          response = await fetch(
            `/api/esv?book=${encodeURIComponent(book)}&chapter=${chapter}`
          );
        } else {
          // Use bible-api.com for other translations
          response = await fetch(
            `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation}`
          );
        }

        if (!response.ok) {
          throw new Error('Failed to fetch scripture');
        }

        const data = await response.json();
        setScripture(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scripture');
      } finally {
        setLoading(false);
      }
    };

    fetchScripture();
  }, [book, chapter, translation]);

  const handleVerseClick = (verse: Verse) => {
    addVerse({
      book,
      chapter,
      verse: verse.verse,
      text: verse.text,
      translation: scripture?.translation_name || 'King James Version',
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    
    // Get all selected verses
    const versesToDrag = selectedVerses.filter(v => v.book === book && v.chapter === chapter);
    
    if (versesToDrag.length === 0) {
      e.preventDefault();
      return;
    }
    
    // Format the verses for drag data
    const formattedVerses = versesToDrag
      .sort((a, b) => a.verse - b.verse)
      .map(v => `[${v.book} ${v.chapter}:${v.verse}] "${v.text}"`)
      .join('\n');
    
    e.dataTransfer.setData('text/plain', formattedVerses);
    e.dataTransfer.setData('application/bible-verses', JSON.stringify(versesToDrag));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleBookSelect = (bookName: string) => {
    // Logic to handle book selection, e.g., load the first chapter of the selected book
    console.log(`Selected book: ${bookName}`);
  };

  if (loading) {
    return (
      <Card className="p-6 h-full">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 h-full">
        <div className="text-center text-muted-foreground">
          <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Unable to load scripture</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </Card>
    );
  }

  if (!scripture) {
    return (
      <Card className="p-6 h-full">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Select a Book</h2>
          <div className="flex justify-around">
            <div>
              <h3 className="font-semibold mb-2">Old Testament</h3>
              <ul className="space-y-1">
                {BIBLE_BOOKS_DATA.oldTestament.map((book: { name: string; chapters: number }) => (
                  <li key={book.name}>
                    <button className="text-primary hover:underline" onClick={() => handleBookSelect(book.name)}>
                      {book.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">New Testament</h3>
              <ul className="space-y-1">
                {BIBLE_BOOKS_DATA.newTestament.map((book: { name: string; chapters: number }) => (
                  <li key={book.name}>
                    <button className="text-primary hover:underline" onClick={() => handleBookSelect(book.name)}>
                      {book.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Group verses into paragraphs
  // For Psalms and other poetry, use smaller groupings
  const isPoetry = ['Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'].includes(book);
  const versesPerParagraph = isPoetry ? 2 : 4;
  const paragraphs: Verse[][] = [];
  
  if (scripture.verses) {
    for (let i = 0; i < scripture.verses.length; i += versesPerParagraph) {
      paragraphs.push(scripture.verses.slice(i, i + versesPerParagraph));
    }
  }

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <div className="p-6 border-b bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <BookOpenIcon className="w-6 h-6 mt-1 text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-bold">{scripture.reference}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {scripture.translation_name || 'King James Version'}
              </p>
            </div>
          </div>
          <Select value={translation} onValueChange={setTranslation}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select translation" />
            </SelectTrigger>
            <SelectContent>
              {TRANSLATIONS.map((trans) => (
                <SelectItem key={trans.id} value={trans.id}>
                  {trans.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex-1 p-6 lg:p-8 overflow-auto bg-background">
        <div className="max-w-3xl mx-auto">
          {paragraphs.map((paragraph, index) => (
            <p 
              key={index} 
              className={`mb-6 leading-relaxed text-base ${
                isPoetry ? 'pl-4 border-l-2 border-muted' : ''
              }`}
            >
              {paragraph.map((verse, verseIndex) => {
                const isSelected = isVerseSelected(book, chapter, verse.verse);
                return (
                  <span 
                    key={verse.verse}
                    className={`
                      group cursor-pointer rounded px-1 -mx-1 transition-all
                      ${isSelected && isDragging ? 'opacity-50' : ''}
                      ${isSelected ? 'cursor-grab active:cursor-grabbing' : ''}
                    `}
                    style={isSelected ? selectedVerseStyle : undefined}
                    onClick={() => handleVerseClick(verse)}
                    draggable={isSelected}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    title={isSelected ? 'Drag to notes editor' : 'Click to select'}
                  >
                    <sup className={`
                      text-xs mr-1 font-bold transition-colors
                      ${isSelected 
                        ? 'text-green-700' 
                        : 'text-primary group-hover:text-primary/80'
                      }
                    `}>
                      {verse.verse}
                    </sup>
                    <span className={`
                      transition-colors
                      ${!isSelected && 'text-foreground/90 group-hover:text-foreground hover:bg-primary/10'}
                    `}>
                      {verse.text}
                    </span>
                    {verseIndex < paragraph.length - 1 && ' '}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      </div>
    </Card>
  );
} 