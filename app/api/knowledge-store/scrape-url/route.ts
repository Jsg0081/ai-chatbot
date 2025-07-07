import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import { WebScraper, formatScrapedContent, extractDomain } from '@/lib/web-scraper';
import { generateUUID } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, options } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Create scraper with options
    const scraper = new WebScraper({
      maxDepth: options?.maxDepth ?? 1,
      maxPages: options?.maxPages ?? 5,
      allowedDomains: options?.allowedDomains,
    });

    // Scrape the URL
    console.log(`Starting to scrape ${url}`);
    let scrapedPages;
    
    try {
      scrapedPages = await scraper.scrapeUrl(url);
    } catch (scrapeError) {
      console.error('Scraping error:', scrapeError);
      return NextResponse.json({ 
        error: 'Failed to access the website. This could be due to network issues, the site blocking automated requests, or requiring authentication. Please try a different URL.' 
      }, { status: 400 });
    }

    if (scrapedPages.length === 0) {
      return NextResponse.json({ 
        error: 'No content could be extracted from the URL. The website may be blocking automated requests, require authentication, or have no readable content. Please try a different URL.' 
      }, { status: 400 });
    }

    // Format the scraped content
    const formattedContent = formatScrapedContent(scrapedPages);
    const domain = extractDomain(url);
    const title = scrapedPages[0].title || domain;

    // Calculate size
    const sizeInBytes = new TextEncoder().encode(formattedContent).length;
    const sizeInKB = sizeInBytes / 1024;
    const size = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB.toFixed(1)} KB`;

    // Save to knowledge store
    const [savedItem] = await db
      .insert(knowledgeStore)
      .values({
        id: generateUUID(),
        userId: session.user.id,
        name: title,
        type: 'url',
        content: formattedContent,
        url: url,
        fileData: {
          scrapedPages: scrapedPages.length,
          domain,
          timestamp: new Date().toISOString(),
        },
        size,
      })
      .returning();

    return NextResponse.json({
      id: savedItem.id,
      name: savedItem.name,
      pagesScraped: scrapedPages.length,
      size,
    });
  } catch (error) {
    console.error('Error scraping URL:', error);
    return NextResponse.json(
      { error: 'Failed to scrape URL' },
      { status: 500 }
    );
  }
} 