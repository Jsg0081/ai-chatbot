'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, StickyNote, Trash2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { AuthModal } from '@/components/auth-modal';
import { VerseNoteDialog } from './verse-note-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface VerseNote {
  id: string;
  book: string;
  chapter: string;
  verseStart: string;
  verseEnd?: string;
  translation: string;
  content: string;
  verseText?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface GroupedNotes {
  [book: string]: {
    [chapter: string]: VerseNote[];
  };
}

export function VerseNotesBrowser() {
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<VerseNote | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { data: session } = useSession();

  // Load all verse notes
  useEffect(() => {
    loadNotes();
  }, [session]);

  const loadNotes = async () => {
    if (!session?.user || session.user.type === 'guest') {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/verse-notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Error loading verse notes:', error);
      toast.error('Failed to load verse notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteNoteId) return;

    try {
      const response = await fetch(`/api/verse-notes?id=${deleteNoteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      toast.success('Note deleted');
      loadNotes();
    } catch (error) {
      console.error('Error deleting verse note:', error);
      toast.error('Failed to delete note');
    }

    setShowDeleteDialog(false);
    setDeleteNoteId(null);
  };

  const handleEditClick = (note: VerseNote) => {
    setSelectedNote(note);
    setShowEditDialog(true);
  };

  // Group notes by book and chapter
  const groupedNotes: GroupedNotes = notes.reduce((acc, note) => {
    if (!acc[note.book]) {
      acc[note.book] = {};
    }
    if (!acc[note.book][note.chapter]) {
      acc[note.book][note.chapter] = [];
    }
    acc[note.book][note.chapter].push(note);
    return acc;
  }, {} as GroupedNotes);

  // Sort chapters numerically
  const sortChapters = (chapters: string[]) => {
    return chapters.sort((a, b) => parseInt(a) - parseInt(b));
  };

  if (!session?.user || session.user.type === 'guest') {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium mb-2">Sign in to save verse notes</p>
          <Button onClick={() => setShowAuthModal(true)}>Sign In</Button>
        </div>
        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No verse notes yet</p>
          <p className="text-sm mt-2">
            Add notes to verses while reading scripture
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-cyan-950 dark:text-[#00e599]" />
            Verse Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-6">
            {Object.entries(groupedNotes).map(([book, chapters]) => (
              <div key={book} className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {book}
                </h3>
                <div className="space-y-2 ml-6">
                  {sortChapters(Object.keys(chapters)).map((chapter) => (
                    <div key={`${book}-${chapter}`} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Chapter {chapter}
                      </h4>
                      <div className="space-y-2">
                        {chapters[chapter]
                          .sort((a, b) => parseInt(a.verseStart) - parseInt(b.verseStart))
                          .map((note) => (
                            <Card
                              key={note.id}
                              className="p-3 hover:shadow-md transition-shadow cursor-pointer group"
                              onClick={() => handleEditClick(note)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">
                                      Verse {note.verseStart}
                                      {note.verseEnd && note.verseEnd !== note.verseStart && `-${note.verseEnd}`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({note.translation})
                                    </span>
                                  </div>
                                  {note.verseText && (
                                    <p className="text-xs text-muted-foreground italic mb-2 line-clamp-2">
                                      &ldquo;{note.verseText}&rdquo;
                                    </p>
                                  )}
                                  <p className="text-sm line-clamp-2">{note.content}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteNoteId(note.id);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this verse note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedNote && (
        <VerseNoteDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          verse={{
            book: selectedNote.book,
            chapter: parseInt(selectedNote.chapter),
            verse: parseInt(selectedNote.verseStart),
            endVerse: selectedNote.verseEnd ? parseInt(selectedNote.verseEnd) : undefined,
            text: selectedNote.verseText || '',
            translation: selectedNote.translation,
          }}
          existingNote={{
            id: selectedNote.id,
            content: selectedNote.content,
          }}
          onNoteSaved={() => {
            loadNotes();
            setShowEditDialog(false);
          }}
        />
      )}
    </>
  );
} 