'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ScriptureContextType {
  book: string | null;
  chapter: number | null;
  setScripture: (book: string | null, chapter: number | null) => void;
}

const ScriptureContext = createContext<ScriptureContextType | undefined>(undefined);

export function ScriptureProvider({ children }: { children: ReactNode }) {
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);

  // Load saved scripture selection from localStorage on mount
  useEffect(() => {
    const savedBook = localStorage.getItem('current-scripture-book');
    const savedChapter = localStorage.getItem('current-scripture-chapter');
    
    if (savedBook) {
      setBook(savedBook);
    }
    if (savedChapter) {
      setChapter(parseInt(savedChapter));
    }
  }, []);

  const setScripture = (newBook: string | null, newChapter: number | null) => {
    setBook(newBook);
    setChapter(newChapter);
    
    // Save to localStorage
    if (newBook) {
      localStorage.setItem('current-scripture-book', newBook);
    } else {
      localStorage.removeItem('current-scripture-book');
    }
    
    if (newChapter) {
      localStorage.setItem('current-scripture-chapter', newChapter.toString());
    } else {
      localStorage.removeItem('current-scripture-chapter');
    }
  };

  return (
    <ScriptureContext.Provider value={{ book, chapter, setScripture }}>
      {children}
    </ScriptureContext.Provider>
  );
}

export function useScripture() {
  const context = useContext(ScriptureContext);
  if (context === undefined) {
    throw new Error('useScripture must be used within a ScriptureProvider');
  }
  return context;
} 