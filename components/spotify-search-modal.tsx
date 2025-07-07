'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Headphones, BookOpen, Search, AlertTriangle, Clock } from 'lucide-react';
import { X as CloseIcon } from 'lucide-react';
import Image from 'next/image';
import type { SpotifyEpisode, SpotifyAudiobook } from '@/lib/spotify';
import { SpotifyIcon } from '@/components/icons';
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
  const [episodes, setEpisodes] = useState<SpotifyEpisode[]>([]);
  const [audiobooks, setAudiobooks] = useState<SpotifyAudiobook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery || '');
  const [activeTab, setActiveTab] = useState<'episodes' | 'audiobooks'>('episodes');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hasValidData = useCallback(() => {
    const hasVerses = verses && verses.length > 0;
    const hasQuery = query && query.trim().length > 0;
    return hasVerses || hasQuery;
  }, [verses, query]);

  useEffect(() => {
    // When the modal opens, run a search if we have data
    if (open && hasValidData()) {
      searchSpotify();
    } 
    // When the modal closes, reset everything
    else if (!open) {
      setEpisodes([]);
      setAudiobooks([]);
      setError(null);
      setLoading(false);
      setActiveTab('episodes');
    }
  }, [open, verses, query]); // Re-run when open state or data changes

  const searchSpotify = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    
    try {
      const requestBody = { verses, query };
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
      setEpisodes(data.episodes?.items || []);
      setAudiobooks(data.audiobooks?.items || []);
      
      if ((!data.episodes?.items || data.episodes.items.length === 0) && 
          data.audiobooks?.items && data.audiobooks.items.length > 0) {
        setActiveTab('audiobooks');
      }
    } catch (err) {
      console.error('SpotifySearchModal - Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="max-w-4xl max-h-[85vh] p-0" 
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          closeButtonRef.current?.focus();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b relative">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <SpotifyIcon size={24} />
            Spotify Content
            <Button
              ref={closeButtonRef}
              variant="ghost"
              className="absolute right-4 top-4 p-1 h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <CloseIcon className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="mt-2">
            Podcast episodes and audiobooks related to <span className="font-semibold">{getSearchTitle()}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'episodes' | 'audiobooks')} className="h-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="episodes" className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Episodes ({episodes.length})
                </TabsTrigger>
                <TabsTrigger value="audiobooks" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Audiobooks ({audiobooks.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[calc(85vh-200px)]">
              <div className="px-6 pb-6">
                <TabsContent value="episodes" className="mt-4 space-y-4">
                  {loading ? (
                    <LoadingSkeleton />
                  ) : error ? (
                    <ErrorMessage error={error} />
                  ) : episodes.length === 0 ? (
                    <EmptyState type="episodes" />
                  ) : (
                    episodes.map((episode) => <EpisodeCard key={episode.id} episode={episode} />)
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

function EpisodeCard({ episode }: { episode: SpotifyEpisode }) {
  const imageUrl = episode.images[0]?.url || '/placeholder-podcast.png';
  
  // Format duration from milliseconds to minutes/hours
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes} min`;
  };
  
  // Format release date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          src={imageUrl}
          alt={episode.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg line-clamp-1">{episode.name}</h3>
        <p className="text-sm text-muted-foreground mb-1">
          {episode.show?.name ? `${episode.show.name}${episode.show.publisher ? ` • ${episode.show.publisher}` : ''}` : 'Unknown Podcast'}
        </p>
        <p className="text-sm line-clamp-2 mb-3">{episode.description}</p>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(episode.duration_ms)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(episode.release_date)}
          </span>
          <Button
            size="sm"
            className="h-7 gap-1"
            onClick={() => window.open(episode.external_urls.spotify, '_blank')}
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
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Search Failed</h3>
      <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
    </div>
  );
}

function EmptyState({ type }: { type: 'episodes' | 'audiobooks' }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No {type} found</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        We couldn&apos;t find any {type === 'episodes' ? 'podcast episodes' : type} related to this Bible verse. Try searching for a different verse or topic.
      </p>
    </div>
  );
} 