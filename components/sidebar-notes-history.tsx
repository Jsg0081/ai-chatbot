'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  chatId?: string;
}

export function SidebarNotesHistory() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | undefined>();

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Listen for note updates
  useEffect(() => {
    const handleNotesUpdate = () => {
      loadNotes();
    };

    window.addEventListener('notes-updated', handleNotesUpdate);
    return () => {
      window.removeEventListener('notes-updated', handleNotesUpdate);
    };
  }, []);

  const loadNotes = () => {
    try {
      const notesListKey = 'notes-list';
      const notesList = localStorage.getItem(notesListKey);
      if (!notesList) return;

      const noteIds: string[] = JSON.parse(notesList);
      const loadedNotes: Note[] = [];

      noteIds.forEach((noteId) => {
        const noteKey = `note-${noteId}`;
        const noteData = localStorage.getItem(noteKey);
        if (noteData) {
          try {
            const note: Note = JSON.parse(noteData);
            // Parse dates
            note.createdAt = new Date(note.createdAt);
            note.updatedAt = new Date(note.updatedAt);
            // Ensure title exists for backward compatibility
            if (!note.title) {
              note.title = getPreviewText(note.content) || 'New Note';
            }
            loadedNotes.push(note);
          } catch (error) {
            console.error('Error parsing note:', error);
          }
        }
      });

      setNotes(loadedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleNoteSelect = (noteId: string) => {
    // Call the window handler if available
    if (typeof window !== 'undefined' && (window as any).handleNoteSelect) {
      (window as any).handleNoteSelect(noteId);
      setActiveNoteId(noteId);
    }
  };

  const getPreviewText = (htmlContent: string) => {
    // Strip HTML tags and get preview
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.slice(0, 50) + (text.length > 50 ? '...' : '');
  };

  const handleDelete = async () => {
    if (!deleteNoteId) return;

    try {
      // Remove note from storage
      localStorage.removeItem(`note-${deleteNoteId}`);

      // Update notes list
      const notesListKey = 'notes-list';
      const notesList = localStorage.getItem(notesListKey);
      if (notesList) {
        const noteIds: string[] = JSON.parse(notesList);
        const updatedNoteIds = noteIds.filter(id => id !== deleteNoteId);
        localStorage.setItem(notesListKey, JSON.stringify(updatedNoteIds));
      }

      // Trigger update event
      window.dispatchEvent(new Event('notesUpdated'));

      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
      console.error('Error deleting note:', error);
    }

    setShowDeleteDialog(false);
    setDeleteNoteId(null);
  };

  if (notes.length === 0) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Notes
        </div>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Your notes will appear here
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Notes
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {notes.map((note) => (
              <SidebarMenuItem key={note.id} className="relative group">
                <SidebarMenuButton
                  onClick={() => handleNoteSelect(note.id)}
                  className={cn(
                    activeNoteId === note.id && "bg-sidebar-accent"
                  )}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate font-medium">
                      {note.title || 'New Note'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(note.updatedAt, 'MMM d, h:mm a')}
                    </div>
                  </div>
                </SidebarMenuButton>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 z-10 pointer-events-none group-hover:pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteNoteId(note.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 