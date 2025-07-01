// Spotify API service for searching Bible-related content
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifySearchResult {
  shows?: {
    items: SpotifyShow[];
    total: number;
  };
  audiobooks?: {
    items: SpotifyAudiobook[];
    total: number;
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
  types: ('show' | 'audiobook')[] = ['show', 'audiobook']
): Promise<SpotifySearchResult> {
  const token = await getAccessToken();
  
  // Enhance query with Bible-related terms for better results
  const enhancedQuery = `${query} Bible Christian sermon devotional`;
  
  const params = new URLSearchParams({
    q: enhancedQuery,
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
    verseReference,
    `"${verseReference}"`,
    `${verse.book} chapter ${verse.chapter}`,
  ];

  // If we have the verse text, extract key themes (simple keyword extraction)
  if (verse.text) {
    const keywords = extractKeywords(verse.text);
    if (keywords.length > 0) {
      queries.push(`Bible ${keywords.join(' ')}`);
    }
  }

  // Try queries in order until we get results
  for (const query of queries) {
    try {
      const results = await searchSpotifyContent(query);
      
      // Filter results to ensure they're actually Bible-related
      if (results.shows?.items) {
        results.shows.items = results.shows.items.filter(show => 
          isBibleRelated(show.name, show.description)
        );
      }
      
      if (results.audiobooks?.items) {
        results.audiobooks.items = results.audiobooks.items.filter(book => 
          isBibleRelated(book.name, book.description)
        );
      }
      
      // If we have results, return them
      if (
        (results.shows?.items && results.shows.items.length > 0) ||
        (results.audiobooks?.items && results.audiobooks.items.length > 0)
      ) {
        return results;
      }
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error);
    }
  }

  // Return empty results if nothing found
  return { shows: { items: [], total: 0 }, audiobooks: { items: [], total: 0 } };
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