// Spotify API service for searching Bible-related content
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifySearchResult {
  episodes?: {
    items: SpotifyEpisode[];
    total: number;
  };
  audiobooks?: {
    items: SpotifyAudiobook[];
    total: number;
  };
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  duration_ms: number;
  release_date: string;
  external_urls: {
    spotify: string;
  };
  show?: {
    id: string;
    name: string;
    publisher: string;
  };
}

export interface SpotifyShow {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  publisher: string;
  external_urls: {
    spotify: string;
  };
  total_episodes: number;
}

export interface SpotifyAudiobook {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  authors: Array<{ name: string }>;
  publisher: string;
  external_urls: {
    spotify: string;
  };
  total_chapters: number;
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Cache for access token
let tokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Spotify credentials missing:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret 
    });
    throw new Error('Spotify credentials not configured - please check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables');
  }

  // Get new token using Client Credentials flow
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data: SpotifyTokenResponse = await response.json();
  
  // Cache the token
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // Subtract 1 minute for safety
  };

  return data.access_token;
}

export async function searchSpotifyContent(
  query: string,
  types: ('episode' | 'audiobook')[] = ['episode', 'audiobook'],
  enhanceQuery: boolean = true
): Promise<SpotifySearchResult> {
  const token = await getAccessToken();
  
  // Only enhance query with generic terms if requested
  const finalQuery = enhanceQuery ? `${query} Bible Christian sermon devotional` : query;
  
  const params = new URLSearchParams({
    q: finalQuery,
    type: types.join(','),
    market: 'US', // You might want to make this configurable
    limit: '20',
  });

  const response = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to search Spotify');
  }

  const data = await response.json();
  return data;
}

export async function searchBibleVerse(verse: {
  book: string;
  chapter: number;
  verse: number;
  text?: string;
}): Promise<SpotifySearchResult> {
  // Create search queries optimized for Bible content
  const verseReference = `${verse.book} ${verse.chapter}:${verse.verse}`;
  
  // Try different query strategies for better results
  const queries = [
    // Most specific first - exact verse reference
    { query: `"${verseReference}" Bible`, enhance: false },
    { query: `${verseReference} sermon`, enhance: false },
    { query: `${verse.book} ${verse.chapter} verse ${verse.verse}`, enhance: false },
    // Then book and chapter
    { query: `"${verse.book} ${verse.chapter}" Bible study`, enhance: false },
    { query: `${verse.book} chapter ${verse.chapter} sermon`, enhance: false },
    // Finally, if we have verse text, search by themes
    ...(verse.text ? [{ query: `${verse.book} ${extractKeywords(verse.text).join(' ')}`, enhance: true }] : [])
  ];

  // Try queries in order until we get results
  for (const { query, enhance } of queries) {
    try {
      const results = await searchSpotifyContent(query, ['episode', 'audiobook'], enhance);
      
      // Filter results to ensure they're related to the specific verse/book
      if (results.episodes?.items) {
        results.episodes.items = results.episodes.items.filter(episode => {
          const showName = episode.show?.name ?? '';
          const combined = `${episode.name} ${episode.description} ${showName}`.toLowerCase();
          
          // Check if it's Bible-related AND mentions the specific book
          return (
            isBibleRelated(episode.name, episode.description) ||
            isBibleRelated(showName, '')
          ) && (
            combined.includes(verse.book.toLowerCase()) ||
            combined.includes(`${verse.chapter}:${verse.verse}`) ||
            combined.includes(`chapter ${verse.chapter}`)
          );
        });
      }
      
      if (results.audiobooks?.items) {
        results.audiobooks.items = results.audiobooks.items.filter(book => {
          const combined = `${book.name} ${book.description}`.toLowerCase();
          
          return isBibleRelated(book.name, book.description) && (
            combined.includes(verse.book.toLowerCase()) ||
            combined.includes(`${verse.chapter}:${verse.verse}`) ||
            combined.includes(`chapter ${verse.chapter}`)
          );
        });
      }
      
      // If we have results, return them
      if (
        (results.episodes?.items && results.episodes.items.length > 0) ||
        (results.audiobooks?.items && results.audiobooks.items.length > 0)
      ) {
        return results;
      }
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error);
    }
  }

  // If no specific results found, do one more broad search
  try {
    const broadResults = await searchSpotifyContent(`${verse.book} Bible`, ['episode', 'audiobook'], true);
    
    // Still filter by book name at minimum
    if (broadResults.episodes?.items) {
      broadResults.episodes.items = broadResults.episodes.items.filter(episode => {
        const combined = `${episode.name} ${episode.description} ${episode.show?.name || ''}`.toLowerCase();
        return combined.includes(verse.book.toLowerCase());
      });
    }
    
    if (broadResults.audiobooks?.items) {
      broadResults.audiobooks.items = broadResults.audiobooks.items.filter(book => {
        const combined = `${book.name} ${book.description}`.toLowerCase();
        return combined.includes(verse.book.toLowerCase());
      });
    }
    
    return broadResults;
  } catch (error) {
    console.error('Broad search failed:', error);
  }

  // Return empty results if nothing found
  return { episodes: { items: [], total: 0 }, audiobooks: { items: [], total: 0 } };
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - remove common words and return significant ones
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'cannot',
    'he', 'she', 'it', 'they', 'them', 'their', 'his', 'her', 'its',
    'i', 'you', 'we', 'us', 'our', 'your', 'this', 'that', 'these', 'those'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  // Return top 3 most significant words
  return [...new Set(words)].slice(0, 3);
}

function isBibleRelated(title: string, description: string): boolean {
  const bibleKeywords = [
    'bible', 'biblical', 'christian', 'christ', 'jesus', 'god', 'lord',
    'scripture', 'gospel', 'testament', 'sermon', 'devotional', 'prayer',
    'faith', 'church', 'pastor', 'ministry', 'theology', 'worship'
  ];

  const combined = `${title} ${description}`.toLowerCase();
  
  return bibleKeywords.some(keyword => combined.includes(keyword));
} 