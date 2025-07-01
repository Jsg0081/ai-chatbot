import { NextRequest, NextResponse } from 'next/server';
import { getAPIBibleClient, getBookId, parseAPIBibleContent } from '@/lib/api-bible';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bibleId = searchParams.get('bibleId');
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    const endVerse = searchParams.get('endVerse');
    
    if (!bibleId || !book || !chapter) {
      return NextResponse.json(
        { error: 'Bible ID, book, and chapter parameters are required' },
        { status: 400 }
      );
    }

    const client = getAPIBibleClient();
    const bookId = getBookId(book);
    
    // Construct the passage ID
    let passageId = `${bookId}.${chapter}`;
    if (verse) {
      passageId += `.${verse}`;
      if (endVerse) {
        passageId += `-${bookId}.${chapter}.${endVerse}`;
      }
    }

    // Fetch the passage with text content for easier parsing
    const passage = await client.getPassage(bibleId, passageId, {
      contentType: 'text',
      includeNotes: false,
      includeVerseNumbers: true,
      includeVerseSpans: false,
      includeTitles: false,
      includeChapterNumbers: false,
    });

    // Parse the content to extract verses
    const verses = parseAPIBibleContent(passage.content);
    
    // If no verses were parsed, create them from the full text
    if (verses.length === 0 && passage.content) {
      // Split by verse numbers if present
      const verseMatches = passage.content.match(/\[(\d+)\]([^[]+)/g);
      if (verseMatches) {
        verseMatches.forEach((match: string) => {
          const verseMatch = match.match(/\[(\d+)\]([^[]+)/);
          if (verseMatch) {
            verses.push({
              verse: parseInt(verseMatch[1]),
              text: verseMatch[2].trim()
            });
          }
        });
      } else {
        // Fallback: treat the whole content as verse 1
        verses.push({ verse: 1, text: passage.content });
      }
    }
    
    // Transform to match the expected format
    const response = {
      reference: passage.reference,
      verses: verses,
      text: passage.content || verses.map(v => v.text).join(' '),
      translation_id: bibleId,
      translation_name: '', // This would need to be fetched separately or passed in
      translation_note: passage.copyright || '',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Bible passage API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scripture' },
      { status: 500 }
    );
  }
} 