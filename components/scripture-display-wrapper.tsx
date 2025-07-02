'use client';

import { ScriptureDisplay } from './scripture-display';
import { useScripture } from '@/lib/scripture-context';

export function ScriptureDisplayWrapper() {
  const { book, chapter } = useScripture();

  // This should rarely happen now since we have defaults, but keeping it as a safety check
  if (!book || !chapter) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-sm">Loading scripture...</p>
        </div>
      </div>
    );
  }

  return <ScriptureDisplay book={book} chapter={chapter} />;
} 