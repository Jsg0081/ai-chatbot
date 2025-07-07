import { NextRequest, NextResponse } from 'next/server';
import { searchBibleVerse, searchSpotifyContent, type SpotifyEpisode, type SpotifyAudiobook } from '@/lib/spotify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verses, query, types } = body;
    
    console.log('Spotify search request:', { 
      hasVerses: !!verses, 
      verseCount: verses?.length,
      hasQuery: !!query,
      types 
    });

    let results;
    
    if (verses && verses.length > 0) {
      // Search based on Bible verses
      // For multiple verses, combine results
      const allResults = await Promise.all(
        verses.map((verse: any) => searchBibleVerse(verse))
      );
      
      // Merge results and remove duplicates
      const mergedEpisodes = new Map();
      const mergedAudiobooks = new Map();
      
      allResults.forEach(result => {
        if (result.episodes?.items) {
          result.episodes.items.forEach((episode: SpotifyEpisode) => {
            if (!mergedEpisodes.has(episode.id)) {
              mergedEpisodes.set(episode.id, episode);
            }
          });
        }
        
        if (result.audiobooks?.items) {
          result.audiobooks.items.forEach((book: SpotifyAudiobook) => {
            if (!mergedAudiobooks.has(book.id)) {
              mergedAudiobooks.set(book.id, book);
            }
          });
        }
      });
      
      results = {
        episodes: {
          items: Array.from(mergedEpisodes.values()).slice(0, 20),
          total: mergedEpisodes.size,
        },
        audiobooks: {
          items: Array.from(mergedAudiobooks.values()).slice(0, 20),
          total: mergedAudiobooks.size,
        },
      };
    } else if (query) {
      // General search
      results = await searchSpotifyContent(query, types);
    } else {
      return NextResponse.json(
        { error: 'Either verses or query must be provided' },
        { status: 400 }
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Spotify search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search Spotify' },
      { status: 500 }
    );
  }
} 