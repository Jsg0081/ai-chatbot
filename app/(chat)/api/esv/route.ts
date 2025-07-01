import { NextRequest, NextResponse } from 'next/server';
import { fetchESVPassage } from '@/lib/esv-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    
    if (!book || !chapter) {
      return NextResponse.json(
        { error: 'Book and chapter parameters are required' },
        { status: 400 }
      );
    }

    const reference = `${book} ${chapter}`;
    const data = await fetchESVPassage(reference);
    
    // Transform to match the expected format
    const response = {
      reference: data.reference,
      verses: data.verses,
      text: data.text,
      translation_id: 'esv',
      translation_name: 'English Standard Version',
      translation_note: '© 2001 by Crossway Bibles',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('ESV API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scripture' },
      { status: 500 }
    );
  }
} 