'use client';

import { useState } from 'react';
import { NotesEditor } from '@/components/notes-editor';

interface NotesWrapperProps {
  chatId?: string;
}

export function NotesWrapper({ chatId }: NotesWrapperProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();

  // This will be called from the sidebar through a context or prop drilling
  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  // Store the handler in window for sidebar to access
  if (typeof window !== 'undefined') {
    (window as any).handleNoteSelect = handleNoteSelect;
    (window as any).getActiveNoteId = () => selectedNoteId;
  }

  return (
    <NotesEditor 
      chatId={chatId} 
      noteId={selectedNoteId}
      onNoteIdChange={setSelectedNoteId}
    />
  );
} 