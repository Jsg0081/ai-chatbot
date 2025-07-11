'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
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
import { useSession } from 'next-auth/react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  chatId?: string | null;
  userId?: string;
}

export function SidebarNotesHistory() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | undefined>();
  const { data: session, status } = useSession();
  const lastFetchRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();

  // Load notes on mount and when session changes (but prevent duplicate fetches)
  useEffect(() => {
    const sessionKey = session?.user?.id || 'no-session';
    
    // Only fetch if session has changed and we're not already loading
    if (sessionKey !== lastFetchRef.current && !isLoadingRef.current) {
      lastFetchRef.current = sessionKey;
      
      if (session?.user?.id && session.user.type !== 'guest' && status === 'authenticated') {
        loadNotes();
      } else {
        setNotes([]);
      }
    }
  }, [session?.user?.id, session?.user?.type, status]);

  // Listen for note updates
  useEffect(() => {
    const handleNotesUpdate = () => {
      if (session?.user?.id && session.user.type !== 'guest' && status === 'authenticated') {
        loadNotes();
      }
    };

    window.addEventListener('notes-updated', handleNotesUpdate);
    return () => {
      window.removeEventListener('notes-updated', handleNotesUpdate);
    };
  }, [session?.user?.id, session?.user?.type, status]);

  const loadNotes = async () => {
    // Prevent concurrent fetches
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      
      const notesData = await response.json();
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleNoteSelect = (noteId: string) => {
    setActiveNoteId(noteId);
    
    // Navigate to root with noteId parameter
    router.push(`/?noteId=${noteId}`);
    
    // If already on the page, also trigger the direct handler
    if (typeof window !== 'undefined' && (window as any).handleNoteSelect) {
      (window as any).handleNoteSelect(noteId);
    }
    
    // For mobile, close sidebar and dispatch the tab switch event
    if (isMobile) {
      setOpenMobile(false);
      // Save to localStorage for persistence
      const activeTabKey = 'bible-mobile-active-tab';
      localStorage.setItem(activeTabKey, 'notes');
      
      // Dispatch event with a small delay to ensure navigation has started
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mobile-tab-switch', { detail: 'notes' }));
      }, 100);
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
      const response = await fetch(`/api/notes?id=${deleteNoteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      // Trigger update event
      window.dispatchEvent(new Event('notes-updated'));

      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
      console.error('Error deleting note:', error);
    }

    setShowDeleteDialog(false);
    setDeleteNoteId(null);
  };

  if (!session?.user || session.user.type === 'guest') {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Notes
        </div>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Sign in to save notes
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

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
                      {format(new Date(note.updatedAt), 'MMM d, h:mm a')}
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