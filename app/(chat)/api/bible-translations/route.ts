import { NextRequest, NextResponse } from 'next/server';
import { getAPIBibleClient } from '@/lib/api-bible';

// Cache translations for 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;
let translationsCache: {
  data: any;
  timestamp: number;
} | null = null;

export async function GET(request: NextRequest) {
  try {
    // Check if we have cached data
    if (translationsCache && Date.now() - translationsCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(translationsCache.data);
    }

    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language');

    const client = getAPIBibleClient();
    const translations = await client.getBibles(language || undefined);

    // Filter for English translations only
    const englishTranslations = translations.filter((bible: any) => 
      bible.language.id === 'eng' || 
      bible.language.name.toLowerCase() === 'english' ||
      bible.language.nameLocal.toLowerCase() === 'english'
    );

    // Remove duplicates based on name
    const uniqueTranslations = englishTranslations.reduce((acc: any[], translation: any) => {
      const exists = acc.some(t => 
        t.name.toLowerCase() === translation.name.toLowerCase() ||
        (t.abbreviation && translation.abbreviation && 
         t.abbreviation.toLowerCase() === translation.abbreviation.toLowerCase())
      );
      if (!exists) {
        acc.push(translation);
      }
      return acc;
    }, []);

    // Group translations by language
    const groupedTranslations = uniqueTranslations.reduce((acc, translation) => {
      const langName = translation.language.name;
      if (!acc[langName]) {
        acc[langName] = {
          language: translation.language,
          translations: [],
        };
      }
      acc[langName].translations.push({
        id: translation.id,
        abbreviation: translation.abbreviation,
        abbreviationLocal: translation.abbreviationLocal,
        name: translation.name,
        nameLocal: translation.nameLocal,
        description: translation.description,
        type: translation.type,
      });
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by language name
    const result = Object.values(groupedTranslations).sort((a: any, b: any) => 
      a.language.name.localeCompare(b.language.name)
    );

    // Cache the result
    translationsCache = {
      data: result,
      timestamp: Date.now(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bible translations API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Bible translations' },
      { status: 500 }
    );
  }
} 