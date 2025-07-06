'use client';

import { useState, useEffect } from 'react';
import { StickyNote, ChevronRight } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useScripture } from '@/lib/scripture-context';
import { cn } from '@/lib/utils';

interface VerseNote {
  id: string;
  book: string;
  chapter: string;
  verseStart: string;
  verseEnd?: string;
  content: string;
  updatedAt: Date | string;
}

export function SidebarVerseNotes() {
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const { setScripture } = useScripture();
  const { isMobile, setOpenMobile } = useSidebar();

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
        // Show only the 5 most recent notes
        setNotes(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading verse notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoteClick = (note: VerseNote) => {
    // Navigate to the scripture with the note
    setScripture(note.book, parseInt(note.chapter));
    const params = new URLSearchParams();
    params.set('book', note.book);
    params.set('chapter', note.chapter);
    router.push(`/?${params.toString()}`);
    
    // On mobile, close sidebar and switch to scripture tab
    if (isMobile) {
      setOpenMobile(false);
      // Switch to scripture tab
      const activeTabKey = 'bible-mobile-active-tab';
      localStorage.setItem(activeTabKey, 'scripture');
      // Dispatch custom event to notify ResizablePanels to switch tabs
      window.dispatchEvent(new CustomEvent('mobile-tab-switch', { detail: 'scripture' }));
    }
  };

  const handleViewAll = () => {
    // Navigate to the notes page with verse notes tab selected
    router.push('/notes?tab=verses');
  };

  if (!session?.user || session.user.type === 'guest') {
    return null;
  }

  if (loading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Verse Notes
        </div>
        <SidebarGroupContent>
          <div className="px-2 animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (notes.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <div className="px-2 py-1 text-xs text-sidebar-foreground/50 flex items-center justify-between">
        <span>Recent Verse Notes</span>
        {notes.length > 0 && (
          <button
            onClick={handleViewAll}
            className="text-primary hover:underline text-xs"
          >
            View all
          </button>
        )}
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {notes.map((note) => (
            <SidebarMenuItem key={note.id}>
              <SidebarMenuButton
                onClick={() => handleNoteClick(note)}
                className="group relative"
              >
                <StickyNote className="h-4 w-4 mr-2 flex-shrink-0 text-cyan-950 dark:text-[#00e599]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {note.book} {note.chapter}:{note.verseStart}
                    {note.verseEnd && note.verseEnd !== note.verseStart && `-${note.verseEnd}`}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {note.content}
                  </div>
                </div>
                <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
} 