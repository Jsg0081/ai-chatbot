'use client';

import { useState, useEffect, ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BookOpenIcon } from 'lucide-react';
import { useVerse } from '@/lib/verse-context';

interface VerseData {
  reference: string;
  text: string;
  translation: string;
}

interface BibleVerseTooltipProps {
  children: string;
}

// Bible verse patterns to match various formats:
// - Book Chapter:Verse (e.g., John 3:16)
// - Book Chapter:Verse-Verse (e.g., John 3:16-17)
// - (Book Chapter:Verse) with parentheses
// - Book Chapter:Verse,Verse (e.g., John 3:16,18)
// - [Book Chapter:Verse] with square brackets
const VERSE_PATTERNS = [
  // Standard format: Book Chapter:Verse or Book Chapter:Verse-Verse
  /\b([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?\b/g,
  // With parentheses: (Book Chapter:Verse)
  /\(([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?\)/g,
  // With square brackets: [Book Chapter:Verse]
  /\[([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?\]/g,
  // Multiple verses with commas: Book Chapter:Verse,Verse
  /\b([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+):(\d+(?:,\d+)*)\b/g,
];

// Common Bible book names (including abbreviations)
const BIBLE_BOOKS = [
  'Genesis', 'Gen', 'Exodus', 'Exod', 'Ex', 'Leviticus', 'Lev', 
  'Numbers', 'Num', 'Deuteronomy', 'Deut',
  'Joshua', 'Josh', 'Judges', 'Judg', 'Ruth', 
  '1 Samuel', '1 Sam', '2 Samuel', '2 Sam',
  '1 Kings', '2 Kings', '1 Chronicles', '1 Chron', '2 Chronicles', '2 Chron',
  'Ezra', 'Nehemiah', 'Neh', 'Esther', 'Esth', 
  'Job', 'Psalms', 'Psalm', 'Ps', 'Psa',
  'Proverbs', 'Prov', 'Pr', 'Ecclesiastes', 'Eccl', 
  'Song of Solomon', 'Song', 'Isaiah', 'Isa',
  'Jeremiah', 'Jer', 'Lamentations', 'Lam', 'Ezekiel', 'Ezek', 
  'Daniel', 'Dan', 'Hosea', 'Hos',
  'Joel', 'Amos', 'Obadiah', 'Obad', 'Jonah', 'Micah', 'Mic', 'Nahum', 'Nah',
  'Habakkuk', 'Hab', 'Zephaniah', 'Zeph', 'Haggai', 'Hag', 
  'Zechariah', 'Zech', 'Malachi', 'Mal',
  'Matthew', 'Matt', 'Mt', 'Mark', 'Mk', 'Luke', 'Lk', 'John', 'Jn', 
  'Acts', 'Romans', 'Rom',
  '1 Corinthians', '1 Cor', '2 Corinthians', '2 Cor', 
  'Galatians', 'Gal', 'Ephesians', 'Eph',
  'Philippians', 'Phil', 'Colossians', 'Col', 
  '1 Thessalonians', '1 Thess', '2 Thessalonians', '2 Thess',
  '1 Timothy', '1 Tim', '2 Timothy', '2 Tim', 'Titus', 'Tit', 
  'Philemon', 'Phlm', 'Hebrews', 'Heb',
  'James', 'Jas', '1 Peter', '1 Pet', '2 Peter', '2 Pet', 
  '1 John', '2 John', '3 John',
  'Jude', 'Revelation', 'Rev'
];

// Add a simple cache for verses
const verseCache = new Map<string, VerseData>();

function BibleVerseTooltip({ reference, children }: { reference: string; children: ReactNode }) {
  const [verseData, setVerseData] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { isVerseSelected } = useVerse();

  // Parse reference to check if verse is selected
  const parseReference = (ref: string) => {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (match) {
      const [, book, chapter, startVerse, endVerse] = match;
      return {
        book: book.trim(),
        chapter: parseInt(chapter),
        startVerse: parseInt(startVerse),
        endVerse: endVerse ? parseInt(endVerse) : parseInt(startVerse)
      };
    }
    return null;
  };

  const parsedRef = parseReference(reference);
  
  // Check if any verse in the range is selected
  const isSelected = parsedRef ? (() => {
    for (let v = parsedRef.startVerse; v <= parsedRef.endVerse; v++) {
      if (isVerseSelected(parsedRef.book, parsedRef.chapter, v)) {
        return true;
      }
    }
    return false;
  })() : false;

  const fetchVerse = async () => {
    if (loading || verseData) return;
    
    // Clean up the reference for the API
    const cleanReference = reference.replace(/[()]/g, '').trim();
    
    // Check cache first
    const cached = verseCache.get(cleanReference);
    if (cached) {
      setVerseData(cached);
      return;
    }
    
    setLoading(true);
    setError(false);
    
    try {
      // Check if we should use ESV API
      const useESV = true; // Default to ESV
      let data: VerseData | null = null;
      
      if (useESV) {
        // Parse reference to extract book and chapter
        const match = cleanReference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
        if (match) {
          const [, book, chapter] = match;
          const response = await fetch(`/api/esv?book=${encodeURIComponent(book)}&chapter=${chapter}`);
          if (response.ok) {
            const esvData = await response.json();
            // Find the specific verse(s) from the chapter data
            const verseNum = parseInt(match[3]);
            const endVerseNum = match[4] ? parseInt(match[4]) : verseNum;
            
            const verses = esvData.verses.filter((v: any) => 
              v.verse >= verseNum && v.verse <= endVerseNum
            );
            
            data = {
              reference: cleanReference,
              text: verses.map((v: any) => v.text).join(' '),
              translation: 'ESV',
            };
          }
        }
      }
      
      // Fallback to bible-api.com if ESV fails
      if (!data) {
        const response = await fetch(
          `https://bible-api.com/${encodeURIComponent(cleanReference)}?translation=kjv`
        );
        if (response.ok) {
          const apiData = await response.json();
          data = {
            reference: apiData.reference,
            text: apiData.text.trim(),
            translation: apiData.translation_name || 'King James Version',
          };
        }
      }
      
      if (data) {
        setVerseData(data);
        // Cache the verse data
        verseCache.set(cleanReference, data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`
              underline decoration-dotted cursor-pointer hover:decoration-solid transition-all inline-flex items-center gap-1
              ${isSelected 
                ? 'text-cyan-950 dark:text-[#80ffdb] bg-cyan-300/40 dark:bg-[#80ffdb]/10 px-1 rounded' 
                : 'text-primary'
              }
            `}
            onMouseEnter={() => fetchVerse()}
          >
            {children}
            <BookOpenIcon className={`h-3 w-3 ${isSelected ? 'opacity-70' : 'opacity-50'}`} />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-md p-4" side="top">
          {loading && (
            <div className="flex items-center gap-2 text-sm">
              <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
              Loading verse...
            </div>
          )}
          {error && (
            <div className="text-sm text-muted-foreground">
              Unable to load verse
            </div>
          )}
          {verseData && !loading && !error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <BookOpenIcon className="h-4 w-4" />
                {verseData.reference}
              </div>
              <p className="text-sm leading-relaxed">{verseData.text}</p>
              <p className="text-xs text-muted-foreground">{verseData.translation}</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BibleVerseParser({ children }: BibleVerseTooltipProps) {
  const parseText = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    const matches: Array<{index: number, length: number, element: ReactNode}> = [];
    
    // Find all matches from all patterns
    VERSE_PATTERNS.forEach(pattern => {
      pattern.lastIndex = 0; // Reset the regex
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        const [fullMatch, book, chapter, versesPart, verseEnd] = match;
        
        // Check if this is actually a Bible book
        const normalizedBook = book.trim();
        const isValidBook = BIBLE_BOOKS.some(
          b => b.toLowerCase() === normalizedBook.toLowerCase()
        );
        
        if (!isValidBook) continue;

        // Create the verse reference
        let reference = `${normalizedBook} ${chapter}:${versesPart}`;
        if (verseEnd) {
          reference = `${normalizedBook} ${chapter}:${versesPart}-${verseEnd}`;
        }

        // Store the match
        matches.push({
          index: match.index,
          length: fullMatch.length,
          element: (
            <BibleVerseTooltip key={`${match.index}-${fullMatch}`} reference={reference}>
              {fullMatch}
            </BibleVerseTooltip>
          )
        });
      }
    });
    
    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);
    
    // Build the result, avoiding overlaps
    let lastIndex = 0;
    matches.forEach(match => {
      if (match.index >= lastIndex) {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        // Add the match
        parts.push(match.element);
        lastIndex = match.index + match.length;
      }
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return <>{parseText(children)}</>;
} 