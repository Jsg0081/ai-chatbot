'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';

import { SidebarLeftIcon, SparkLogo } from '@/components/icons';
import { BibleBooks } from '@/components/bible-books';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarNotesHistory } from '@/components/sidebar-notes-history';
import { SidebarVerseNotes } from '@/components/sidebar-verse-notes';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarSeparator,
  useSidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useScripture } from '@/lib/scripture-context';
import { X, Database } from 'lucide-react';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { setScripture } = useScripture();

  const handleBookSelect = (book: string, chapter?: number) => {
    // Update scripture context
    if (chapter) {
      setScripture(book, chapter);
    } else {
      setScripture(book, null);
    }
    
    // Create URL with book and optionally chapter
    const params = new URLSearchParams();
    params.set('book', book);
    if (chapter) {
      params.set('chapter', chapter.toString());
    }
    router.push(`/?${params.toString()}`);
    
    // Only close mobile sidebar when a chapter is selected
    if (chapter) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <div className="px-2 hover:bg-muted rounded-md cursor-pointer flex items-center">
                <SparkLogo width={120} height={32} className="h-8 w-auto" />
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={toggleSidebar}
                  >
                    <SidebarLeftIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">Collapse Sidebar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit md:hidden"
                    onClick={toggleSidebar}
                  >
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">Close Sidebar</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <BibleBooks onBookSelect={handleBookSelect} />
        <SidebarSeparator />
        <SidebarNotesHistory />
        <SidebarSeparator />
        <SidebarVerseNotes />
        <SidebarSeparator />
        <SidebarGroup>
          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
            Knowledge Base
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    router.push('/knowledge-store');
                    setOpenMobile(false);
                  }}
                  className="group relative"
                >
                  <Database className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="flex-1">Manage Knowledge</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
