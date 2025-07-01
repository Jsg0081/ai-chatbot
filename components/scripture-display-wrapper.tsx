'use client';

import { ScriptureDisplay } from './scripture-display';
import { useScripture } from '@/lib/scripture-context';

export function ScriptureDisplayWrapper() {
  const { book, chapter } = useScripture();

  if (!book || !chapter) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-sm">Select a book and chapter from the sidebar</p>
          <p className="text-xs">to view scripture here</p>
        </div>
      </div>
    );
  }

  return <ScriptureDisplay book={book} chapter={chapter} />;
} 