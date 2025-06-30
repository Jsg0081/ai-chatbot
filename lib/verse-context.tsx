'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VerseReference {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
}

interface VerseContextType {
  selectedVerses: VerseReference[];
  addVerse: (verse: VerseReference) => void;
  removeVerse: (book: string, chapter: number, verse: number) => void;
  clearVerses: () => void;
  isVerseSelected: (book: string, chapter: number, verse: number) => boolean;
}

const VerseContext = createContext<VerseContextType | undefined>(undefined);

export function VerseProvider({ children }: { children: ReactNode }) {
  const [selectedVerses, setSelectedVerses] = useState<VerseReference[]>([]);

  const addVerse = (verse: VerseReference) => {
    setSelectedVerses(prev => {
      // Check if verse already exists
      const exists = prev.some(
        v => v.book === verse.book && v.chapter === verse.chapter && v.verse === verse.verse
      );
      if (exists) {
        // Remove it if it exists (toggle behavior)
        return prev.filter(
          v => !(v.book === verse.book && v.chapter === verse.chapter && v.verse === verse.verse)
        );
      }
      // Add it if it doesn't exist
      return [...prev, verse];
    });
  };

  const removeVerse = (book: string, chapter: number, verse: number) => {
    setSelectedVerses(prev => 
      prev.filter(v => !(v.book === book && v.chapter === chapter && v.verse === verse))
    );
  };

  const clearVerses = () => {
    setSelectedVerses([]);
  };

  const isVerseSelected = (book: string, chapter: number, verse: number) => {
    return selectedVerses.some(
      v => v.book === book && v.chapter === chapter && v.verse === verse
    );
  };

  return (
    <VerseContext.Provider value={{ 
      selectedVerses, 
      addVerse, 
      removeVerse, 
      clearVerses,
      isVerseSelected 
    }}>
      {children}
    </VerseContext.Provider>
  );
}

export function useVerse() {
  const context = useContext(VerseContext);
  if (context === undefined) {
    throw new Error('useVerse must be used within a VerseProvider');
  }
  return context;
} 