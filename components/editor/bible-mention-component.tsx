'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BookOpenIcon } from 'lucide-react';

interface VerseData {
  reference: string;
  text: string;
  translation: string;
}

export function BibleMentionComponent({ node }: { node: any }) {
  const [verseData, setVerseData] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchVerse = async () => {
    if (loading || verseData) return;
    
    const reference = node.attrs.reference || node.attrs.label;
    if (!reference) return;
    
    setLoading(true);
    setError(false);
    
    try {
      // Parse reference to extract book and chapter
      const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
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
          
          setVerseData({
            reference: reference,
            text: verses.map((v: any) => v.text).join(' '),
            translation: 'ESV',
          });
        }
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NodeViewWrapper className="bible-mention inline">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="text-primary underline decoration-dotted cursor-pointer hover:decoration-solid transition-all inline-flex items-center gap-1"
              onMouseEnter={() => fetchVerse()}
            >
              {node.attrs.label}
              <BookOpenIcon className="h-3 w-3 opacity-50" />
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
    </NodeViewWrapper>
  );
} 