// ESV API client for fetching Bible verses
const ESV_API_BASE = 'https://api.esv.org/v3/passage/text/';

export interface ESVOptions {
  includePassageReferences?: boolean;
  includeVerseNumbers?: boolean;
  includeFootnotes?: boolean;
  includeHeadings?: boolean;
  includeShortCopyright?: boolean;
  includePassageHorizontalLines?: boolean;
  includeHeadingHorizontalLines?: boolean;
  horizontalLineLength?: number;
  includeSelahs?: boolean;
  indentUsing?: string;
  indentParagraphs?: number;
  indentPoetry?: boolean;
  indentPoetryLines?: number;
  indentDeclares?: number;
  indentPsalmDoxology?: number;
  lineLength?: number;
}

export async function fetchESVPassage(
  reference: string,
  options: ESVOptions = {}
): Promise<{
  reference: string;
  text: string;
  verses: Array<{ verse: number; text: string }>;
}> {
  const apiKey = process.env.ESV_API_KEY;
  
  if (!apiKey) {
    throw new Error('ESV API key not configured');
  }

  const defaultOptions: ESVOptions = {
    includePassageReferences: false,
    includeVerseNumbers: true,
    includeFootnotes: false,
    includeHeadings: false,
    includeShortCopyright: false,
    includePassageHorizontalLines: false,
    includeHeadingHorizontalLines: false,
    indentUsing: 'space',
    indentPoetry: true,
    indentPoetryLines: 2,
    lineLength: 0,
    ...options
  };

  const params = new URLSearchParams();
  params.append('q', reference);
  
  Object.entries(defaultOptions).forEach(([key, value]) => {
    if (value !== undefined) {
      // Convert camelCase to snake_case for API parameters
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      params.append(snakeKey, String(value));
    }
  });

  const response = await fetch(`${ESV_API_BASE}?${params.toString()}`, {
    headers: {
      'Authorization': `Token ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ESV API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // Parse the text to extract individual verses
  const text = data.passages[0] || '';
  const verses = parseESVVerses(text);
  
  return {
    reference: data.canonical || reference,
    text,
    verses,
  };
}

function parseESVVerses(text: string): Array<{ verse: number; text: string }> {
  const verses: Array<{ verse: number; text: string }> = [];
  
  // ESV API returns text with verse numbers in brackets like [1], [2], etc.
  const versePattern = /\[(\d+)\]\s*([^[]+)/g;
  let match;
  
  while ((match = versePattern.exec(text)) !== null) {
    const verseNumber = parseInt(match[1], 10);
    const verseText = match[2].trim();
    verses.push({ verse: verseNumber, text: verseText });
  }
  
  return verses;
} 