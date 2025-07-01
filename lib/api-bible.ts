// API.Bible client for fetching Bible translations and passages
const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1';

export interface BibleTranslation {
  id: string;
  dblId: string;
  abbreviation: string;
  abbreviationLocal: string;
  name: string;
  nameLocal: string;
  description: string;
  descriptionLocal: string;
  language: {
    id: string;
    name: string;
    nameLocal: string;
    script: string;
    scriptDirection: string;
  };
  countries: Array<{
    id: string;
    name: string;
    nameLocal: string;
  }>;
  type: string;
  updatedAt: string;
  audioBibles: any[];
}

export interface BibleBook {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
  chapters: Array<{
    id: string;
    bibleId: string;
    bookId: string;
    number: string;
    reference: string;
  }>;
}

export interface BiblePassage {
  id: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  content: string;
  reference: string;
  verseCount: number;
  copyright: string;
  next?: {
    id: string;
    bookId: string;
    number: string;
  };
  previous?: {
    id: string;
    bookId: string;
    number: string;
  };
}

interface APIBibleResponse<T> {
  data: T;
}

class APIBibleClient {
  private apiKey: string;
  private headers: HeadersInit;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.headers = {
      'api-key': apiKey,
      'accept': 'application/json',
    };
  }

  async getBibles(language?: string): Promise<BibleTranslation[]> {
    try {
      const params = new URLSearchParams();
      if (language) {
        params.append('language', language);
      }

      const response = await fetch(
        `${API_BIBLE_BASE}/bibles${params.toString() ? `?${params.toString()}` : ''}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`API.Bible error: ${response.status} - ${response.statusText}`);
      }

      const data: APIBibleResponse<BibleTranslation[]> = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching Bibles:', error);
      throw error;
    }
  }

  async getBible(bibleId: string): Promise<BibleTranslation> {
    try {
      const response = await fetch(
        `${API_BIBLE_BASE}/bibles/${bibleId}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`API.Bible error: ${response.status} - ${response.statusText}`);
      }

      const data: APIBibleResponse<BibleTranslation> = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching Bible:', error);
      throw error;
    }
  }

  async getBooks(bibleId: string): Promise<BibleBook[]> {
    try {
      const response = await fetch(
        `${API_BIBLE_BASE}/bibles/${bibleId}/books`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`API.Bible error: ${response.status} - ${response.statusText}`);
      }

      const data: APIBibleResponse<BibleBook[]> = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching books:', error);
      throw error;
    }
  }

  async getPassage(
    bibleId: string,
    passageId: string,
    options: {
      contentType?: 'html' | 'json' | 'text';
      includeNotes?: boolean;
      includeVerseNumbers?: boolean;
      includeVerseSpans?: boolean;
      includeTitles?: boolean;
      includeChapterNumbers?: boolean;
    } = {}
  ): Promise<BiblePassage> {
    try {
      const params = new URLSearchParams({
        'content-type': options.contentType || 'json',
        'include-notes': String(options.includeNotes ?? false),
        'include-verse-numbers': String(options.includeVerseNumbers ?? true),
        'include-verse-spans': String(options.includeVerseSpans ?? false),
        'include-titles': String(options.includeTitles ?? true),
        'include-chapter-numbers': String(options.includeChapterNumbers ?? false),
      });

      const response = await fetch(
        `${API_BIBLE_BASE}/bibles/${bibleId}/passages/${passageId}?${params.toString()}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`API.Bible error: ${response.status} - ${response.statusText}`);
      }

      const data: APIBibleResponse<BiblePassage> = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching passage:', error);
      throw error;
    }
  }

  async getChapter(
    bibleId: string,
    chapterId: string,
    options: {
      contentType?: 'html' | 'json' | 'text';
      includeNotes?: boolean;
      includeVerseNumbers?: boolean;
      includeVerseSpans?: boolean;
      includeTitles?: boolean;
      includeChapterNumbers?: boolean;
    } = {}
  ): Promise<BiblePassage> {
    try {
      const params = new URLSearchParams({
        'content-type': options.contentType || 'json',
        'include-notes': String(options.includeNotes ?? false),
        'include-verse-numbers': String(options.includeVerseNumbers ?? true),
        'include-verse-spans': String(options.includeVerseSpans ?? false),
        'include-titles': String(options.includeTitles ?? true),
        'include-chapter-numbers': String(options.includeChapterNumbers ?? false),
      });

      const response = await fetch(
        `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/${chapterId}?${params.toString()}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`API.Bible error: ${response.status} - ${response.statusText}`);
      }

      const data: APIBibleResponse<BiblePassage> = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching chapter:', error);
      throw error;
    }
  }

  async searchPassages(
    bibleId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
      sort?: 'relevance' | 'canonical';
      range?: string;
      fuzziness?: 'AUTO' | 'ONE' | 'TWO' | 'ZERO';
    } = {}
  ): Promise<{
    query: string;
    data: Array<{
      id: string;
      orgId: string;
      bookId: string;
      bibleId: string;
      chapterId: string;
      verseId: string;
      text: string;
      reference: string;
    }>;
    meta: {
      fums: string;
      fumsId: string;
      fumsJsInclude: string;
      fumsJs: string;
      fumsNoScript: string;
    };
  }> {
    try {
      const params = new URLSearchParams({
        query,
        limit: String(options.limit || 10),
        offset: String(options.offset || 0),
        sort: options.sort || 'relevance',
        fuzziness: options.fuzziness || 'AUTO',
      });

      if (options.range) {
        params.append('range', options.range);
      }

      const response = await fetch(
        `${API_BIBLE_BASE}/bibles/${bibleId}/search?${params.toString()}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`API.Bible error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching passages:', error);
      throw error;
    }
  }
}

// Export a singleton instance
let apiBibleClient: APIBibleClient | null = null;

export function getAPIBibleClient(): APIBibleClient {
  const apiKey = process.env.API_BIBLE_KEY;
  
  if (!apiKey) {
    throw new Error('API_BIBLE_KEY environment variable is not set');
  }

  if (!apiBibleClient) {
    apiBibleClient = new APIBibleClient(apiKey);
  }

  return apiBibleClient;
}

// Helper function to convert book names to API.Bible book IDs
export function getBookId(bookName: string): string {
  // API.Bible uses specific book IDs
  const bookIdMap: Record<string, string> = {
    'Genesis': 'GEN',
    'Exodus': 'EXO',
    'Leviticus': 'LEV',
    'Numbers': 'NUM',
    'Deuteronomy': 'DEU',
    'Joshua': 'JOS',
    'Judges': 'JDG',
    'Ruth': 'RUT',
    '1 Samuel': '1SA',
    '2 Samuel': '2SA',
    '1 Kings': '1KI',
    '2 Kings': '2KI',
    '1 Chronicles': '1CH',
    '2 Chronicles': '2CH',
    'Ezra': 'EZR',
    'Nehemiah': 'NEH',
    'Esther': 'EST',
    'Job': 'JOB',
    'Psalms': 'PSA',
    'Psalm': 'PSA',
    'Proverbs': 'PRO',
    'Ecclesiastes': 'ECC',
    'Song of Solomon': 'SNG',
    'Song of Songs': 'SNG',
    'Isaiah': 'ISA',
    'Jeremiah': 'JER',
    'Lamentations': 'LAM',
    'Ezekiel': 'EZK',
    'Daniel': 'DAN',
    'Hosea': 'HOS',
    'Joel': 'JOL',
    'Amos': 'AMO',
    'Obadiah': 'OBA',
    'Jonah': 'JON',
    'Micah': 'MIC',
    'Nahum': 'NAM',
    'Habakkuk': 'HAB',
    'Zephaniah': 'ZEP',
    'Haggai': 'HAG',
    'Zechariah': 'ZEC',
    'Malachi': 'MAL',
    'Matthew': 'MAT',
    'Mark': 'MRK',
    'Luke': 'LUK',
    'John': 'JHN',
    'Acts': 'ACT',
    'Romans': 'ROM',
    '1 Corinthians': '1CO',
    '2 Corinthians': '2CO',
    'Galatians': 'GAL',
    'Ephesians': 'EPH',
    'Philippians': 'PHP',
    'Colossians': 'COL',
    '1 Thessalonians': '1TH',
    '2 Thessalonians': '2TH',
    '1 Timothy': '1TI',
    '2 Timothy': '2TI',
    'Titus': 'TIT',
    'Philemon': 'PHM',
    'Hebrews': 'HEB',
    'James': 'JAS',
    '1 Peter': '1PE',
    '2 Peter': '2PE',
    '1 John': '1JN',
    '2 John': '2JN',
    '3 John': '3JN',
    'Jude': 'JUD',
    'Revelation': 'REV',
  };

  return bookIdMap[bookName] || bookName.toUpperCase().replace(/\s+/g, '');
}

// Helper function to parse content from API.Bible
export function parseAPIBibleContent(content: string): Array<{ verse: number; text: string }> {
  try {
    // If content is already parsed JSON
    if (typeof content === 'object') {
      return extractVersesFromParsedContent(content);
    }

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(content);
      return extractVersesFromParsedContent(parsed);
    } catch {
      // If not JSON, it might be plain text with verse numbers
      return parseTextContent(content);
    }
  } catch (error) {
    console.error('Error parsing API.Bible content:', error);
    return [];
  }
}

function extractVersesFromParsedContent(parsed: any): Array<{ verse: number; text: string }> {
  const verses: Array<{ verse: number; text: string }> = [];

  if (parsed.verses) {
    parsed.verses.forEach((verse: any) => {
      const verseNum = parseInt(verse.number || verse.verseId?.split('.').pop() || '0');
      const text = verse.text || '';
      if (verseNum && text) {
        verses.push({ verse: verseNum, text });
      }
    });
  }

  return verses;
}

function parseTextContent(content: string): Array<{ verse: number; text: string }> {
  const verses: Array<{ verse: number; text: string }> = [];
  
  // Pattern to match verse numbers in brackets [1], [2], etc.
  const versePattern = /\[(\d+)\]\s*([^[]+)/g;
  let match;
  
  while ((match = versePattern.exec(content)) !== null) {
    const verseNumber = parseInt(match[1], 10);
    const verseText = match[2].trim();
    if (verseNumber && verseText) {
      verses.push({ verse: verseNumber, text: verseText });
    }
  }
  
  // If no verses found with brackets, try to parse as a single verse
  if (verses.length === 0 && content.trim()) {
    verses.push({ verse: 1, text: content.trim() });
  }
  
  return verses;
} 