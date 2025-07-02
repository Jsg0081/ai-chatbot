'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Headphones, BookOpen, Search, Music, X } from 'lucide-react';
import { X as CloseIcon } from 'lucide-react';
import Image from 'next/image';
import type { SpotifyShow, SpotifyAudiobook } from '@/lib/spotify';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface SpotifySearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verses?: Array<{
    book: string;
    chapter: number;
    verse: number;
    text: string;
    translation?: string;
  }>;
  query?: string;
}

export function SpotifySearchModal({ 
  open, 
  onOpenChange, 
  verses,
  query: initialQuery 
}: SpotifySearchModalProps) {
  const [podcasts, setPodcasts] = useState<SpotifyShow[]>([]);
  const [audiobooks, setAudiobooks] = useState<SpotifyAudiobook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery || '');
  const [activeTab, setActiveTab] = useState<'podcasts' | 'audiobooks'>('podcasts');
  const [isModalReady, setIsModalReady] = useState(false);
  
  // Use refs to track state without causing re-renders
  const isSearchingRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const openTimeRef = useRef<number>(0);
  
  // Store the open state in a ref to prevent stale closures
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Debug logging
  useEffect(() => {
    console.log('SpotifySearchModal state:', { 
      open, 
      isModalReady,
      versesCount: verses?.length,
      query: query?.substring(0, 20),
      loading,
      hasResults: podcasts.length > 0 || audiobooks.length > 0
    });
  }, [open, isModalReady, verses, query, loading, podcasts.length, audiobooks.length]);

  // Validate that we have searchable data
  const hasValidData = useCallback(() => {
    const hasVerses = verses && verses.length > 0;
    const hasQuery = query && query.trim().length > 0;
    return hasVerses || hasQuery;
  }, [verses, query]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      console.log('SpotifySearchModal - Opening with data:', { 
        hasVerses: verses && verses.length > 0,
        verseCount: verses?.length || 0,
        hasQuery: query && query.trim().length > 0,
        query: query?.substring(0, 50)
      });
      
      openTimeRef.current = Date.now();
      setError(null);
      setPodcasts([]);
      setAudiobooks([]);
      setActiveTab('podcasts');
      
      // Only search if we have valid data
      if (hasValidData()) {
        // Clear any existing timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        
        // Delay the search to ensure modal is fully rendered
        searchTimeoutRef.current = setTimeout(() => {
          if (open && hasValidData() && !isSearchingRef.current) {
            searchSpotify();
          }
        }, 300);
      } else {
        console.warn('SpotifySearchModal - No valid search data provided');
        setError('No search data provided');
      }
      
      // Set modal ready after a delay
      setTimeout(() => {
        setIsModalReady(true);
      }, 300);
    } else {
      // Clear timeout when closing
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [open, hasValidData]);

  const searchSpotify = async () => {
    // Double-check we have valid data before making request
    if (!hasValidData()) {
      console.warn('SpotifySearchModal - Attempted search without valid data');
      setError('No search data available');
      return;
    }

    // Prevent duplicate searches
    if (isSearchingRef.current) {
      console.log('SpotifySearchModal - Search already performed, skipping');
      return;
    }

    isSearchingRef.current = true;
    setLoading(true);
    setError(null);
    
    console.log('SpotifySearchModal - Starting search with:', { 
      verses: verses?.length || 0,
      query: query?.substring(0, 50) || 'none'
    });
    
    try {
      const requestBody = { verses, query };
      console.log('SpotifySearchModal - Making API request:', requestBody);
      
      const response = await fetch('/api/spotify-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search Spotify');
      }

      const data = await response.json();
      console.log('SpotifySearchModal - Search results:', {
        showCount: data.shows?.items?.length || 0,
        audiobookCount: data.audiobooks?.items?.length || 0
      });
      
      setPodcasts(data.shows?.items || []);
      setAudiobooks(data.audiobooks?.items || []);
      
      // Switch to audiobooks tab if no podcasts found but audiobooks exist
      if ((!data.shows?.items || data.shows.items.length === 0) && 
          data.audiobooks?.items && data.audiobooks.items.length > 0) {
        setActiveTab('audiobooks');
      }
    } catch (err) {
      console.error('SpotifySearchModal - Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  const getSearchTitle = () => {
    if (verses && verses.length > 0) {
      if (verses.length === 1) {
        const v = verses[0];
        return `${v.book} ${v.chapter}:${v.verse}`;
      }
      return `${verses.length} selected verses`;
    }
    return query || 'Search';
  };

  const handleOpenChange = (newOpen: boolean) => {
    const now = Date.now();

    // Ignore the very first state flip Radix triggers during mount
    if (newOpen && !openRef.current) {
      return;
    }

    // Block any auto-close that happens within the first 800 ms
    if (!newOpen && now - openTimeRef.current < 800) {
      console.log('SpotifySearchModal – swallowed spurious close');
      return;
    }

    if (!newOpen) setIsModalReady(false);

    onOpenChange(newOpen);
  };

  // Prevent interaction events from closing modal too quickly
  const preventEarlyClose = (e: Event) => {
    const timeSinceOpen = Date.now() - openTimeRef.current;
    if (timeSinceOpen < 500) {
      console.log('SpotifySearchModal - Preventing early interaction close');
      e.preventDefault();
      return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent 
        className="max-w-4xl max-h-[85vh] p-0" 
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus issues
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (!preventEarlyClose(e)) return;
        }}
        onEscapeKeyDown={(e) => {
          if (!preventEarlyClose(e)) return;
        }}
        onPointerDownOutside={(e) => {
          if (!preventEarlyClose(e)) return;
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b relative">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Music className="h-6 w-6 text-green-500" />
            Spotify Content
            <Button
              variant="ghost"
              className="absolute right-4 top-4 p-1 h-7 w-7"
              onClick={() => handleOpenChange(false)}
            >
              <CloseIcon className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="mt-2">
            Podcasts and audiobooks related to <span className="font-semibold">{getSearchTitle()}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'podcasts' | 'audiobooks')} className="h-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="podcasts" className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Podcasts ({podcasts.length})
                </TabsTrigger>
                <TabsTrigger value="audiobooks" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Audiobooks ({audiobooks.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[calc(85vh-200px)]">
              <div className="px-6 pb-6">
                <TabsContent value="podcasts" className="mt-4 space-y-4">
                  {loading ? (
                    <LoadingSkeleton />
                  ) : error ? (
                    <ErrorMessage error={error} />
                  ) : podcasts.length === 0 ? (
                    <EmptyState type="podcasts" />
                  ) : (
                    podcasts.map((show) => <ShowCard key={show.id} show={show} />)
                  )}
                </TabsContent>

                <TabsContent value="audiobooks" className="mt-4 space-y-4">
                  {loading ? (
                    <LoadingSkeleton />
                  ) : error ? (
                    <ErrorMessage error={error} />
                  ) : audiobooks.length === 0 ? (
                    <EmptyState type="audiobooks" />
                  ) : (
                    audiobooks.map((book) => <AudiobookCard key={book.id} audiobook={book} />)
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShowCard({ show }: { show: SpotifyShow }) {
  const imageUrl = show.images[0]?.url || '/placeholder-podcast.png';
  
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          src={imageUrl}
          alt={show.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg line-clamp-1">{show.name}</h3>
        <p className="text-sm text-muted-foreground mb-2">{show.publisher}</p>
        <p className="text-sm line-clamp-2 mb-3">{show.description}</p>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            {show.total_episodes} episodes
          </Badge>
          <Button
            size="sm"
            className="h-7 gap-1"
            onClick={() => window.open(show.external_urls.spotify, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            Listen on Spotify
          </Button>
        </div>
      </div>
    </div>
  );
}

function AudiobookCard({ audiobook }: { audiobook: SpotifyAudiobook }) {
  const imageUrl = audiobook.images[0]?.url || '/placeholder-audiobook.png';
  const authors = audiobook.authors.map(a => a.name).join(', ');
  
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          src={imageUrl}
          alt={audiobook.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg line-clamp-1">{audiobook.name}</h3>
        <p className="text-sm text-muted-foreground mb-1">by {authors}</p>
        <p className="text-sm text-muted-foreground mb-2">{audiobook.publisher}</p>
        <p className="text-sm line-clamp-2 mb-3">{audiobook.description}</p>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            {audiobook.total_chapters} chapters
          </Badge>
          <Button
            size="sm"
            className="h-7 gap-1"
            onClick={() => window.open(audiobook.external_urls.spotify, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            Listen on Spotify
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 p-4">
          <Skeleton className="h-24 w-24 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-7 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorMessage({ error }: { error: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
        <X className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Search Failed</h3>
      <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
    </div>
  );
}

function EmptyState({ type }: { type: 'podcasts' | 'audiobooks' }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No {type} found</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        We couldn&apos;t find any {type} related to this Bible verse. Try searching for a different verse or topic.
      </p>
    </div>
  );
} 