'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { AuthModal } from '@/components/auth-modal';

interface VerseNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verse: {
    book: string;
    chapter: number;
    verse: number;
    endVerse?: number;
    text: string;
    translation: string;
  } | null;
  existingNote?: {
    id: string;
    content: string;
  } | null;
  onNoteSaved?: () => void;
}

export function VerseNoteDialog({
  open,
  onOpenChange,
  verse,
  existingNote,
  onNoteSaved,
}: VerseNoteDialogProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (existingNote) {
      setContent(existingNote.content);
    } else {
      setContent('');
    }
  }, [existingNote, open]);

  const handleSave = async () => {
    if (!verse || !content.trim()) return;

    // Check authentication
    if (!session || session.user?.type === 'guest') {
      setShowAuthModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const noteData = {
        id: existingNote?.id || generateUUID(),
        book: verse.book,
        chapter: verse.chapter.toString(),
        verseStart: verse.verse.toString(),
        verseEnd: verse.endVerse?.toString(),
        translation: verse.translation,
        content: content.trim(),
        verseText: verse.text,
      };

      const response = await fetch('/api/verse-notes', {
        method: existingNote ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      toast.success(existingNote ? 'Note updated' : 'Note saved');
      onNoteSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving verse note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingNote?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/verse-notes?id=${existingNote.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      toast.success('Note deleted');
      onNoteSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting verse note:', error);
      toast.error('Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!verse) return null;

  const verseReference = `${verse.book} ${verse.chapter}:${verse.verse}${
    verse.endVerse ? `-${verse.endVerse}` : ''
  }`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="sm:max-w-[600px]"
          onCloseAutoFocus={(e) => {
            // Prevent the dialog from focusing on the trigger element
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {existingNote ? 'Edit Note' : 'Add Note'} for {verseReference}
            </DialogTitle>
            <DialogDescription className="text-sm italic mt-2">
              "{verse.text}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Textarea
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] resize-none"
              autoFocus
            />
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            {existingNote && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!content.trim() || isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {existingNote ? 'Update' : 'Save'} Note
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        onSuccess={handleSave}
      />
    </>
  );
} 