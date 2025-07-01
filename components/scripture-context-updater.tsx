'use client';

import { useEffect } from 'react';
import { useScripture } from '@/lib/scripture-context';

interface ScriptureContextUpdaterProps {
  book: string;
  chapter: number;
}

export function ScriptureContextUpdater({ book, chapter }: ScriptureContextUpdaterProps) {
  const { setScripture } = useScripture();

  useEffect(() => {
    setScripture(book, chapter);
  }, [book, chapter, setScripture]);

  return null;
} 