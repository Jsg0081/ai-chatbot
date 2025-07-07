import * as cheerio from 'cheerio';

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  links: string[];
}

interface ScrapeOptions {
  maxDepth?: number;
  maxPages?: number;
  allowedDomains?: string[];
  excludePatterns?: RegExp[];
}

export class WebScraper {
  private visitedUrls = new Set<string>();
  private scrapedPages: ScrapedPage[] = [];
  private options: Required<ScrapeOptions>;
  private lastRequestTime = 0;
  private minRequestDelay = 1000; // 1 second between requests

  constructor(options: ScrapeOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth ?? 2,
      maxPages: options.maxPages ?? 10,
      allowedDomains: options.allowedDomains ?? [],
      excludePatterns: options.excludePatterns ?? [
        /\.(jpg|jpeg|png|gif|pdf|zip|exe|dmg|svg|ico)$/i,
        /^mailto:/i,
        /^tel:/i,
        /^javascript:/i,
        /#$/,
      ],
    };
  }

  async scrapeUrl(url: string, depth = 0): Promise<ScrapedPage[]> {
    // Reset for new scraping session
    if (depth === 0) {
      this.visitedUrls.clear();
      this.scrapedPages = [];
    }

    // Check if we've reached limits
    if (
      depth > this.options.maxDepth ||
      this.scrapedPages.length >= this.options.maxPages ||
      this.visitedUrls.has(url)
    ) {
      return this.scrapedPages;
    }

    // Mark URL as visited
    this.visitedUrls.add(url);

    try {
      console.log(`Scraping ${url} at depth ${depth}`);
      
      // Add delay between requests to be respectful
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestDelay - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();
      
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        // If it's a 403, it might be blocking scrapers
        if (response.status === 403) {
          console.error(`Access forbidden for ${url}. The website may be blocking automated requests.`);
        }
        return this.scrapedPages;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      // Remove script and style elements
      $('script, style, noscript').remove();

      // Extract main content
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '#content',
        '.post',
        '.entry-content',
        'body',
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }

      // Clean up content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Extract links
      const links: string[] = [];
      const baseUrl = new URL(url);

      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        if (!href) return;

        try {
          // Resolve relative URLs
          const absoluteUrl = new URL(href, baseUrl).toString();
          
          // Check if URL should be excluded
          if (this.shouldExcludeUrl(absoluteUrl, baseUrl)) {
            return;
          }

          // Check if URL is from allowed domain
          if (this.isAllowedDomain(absoluteUrl, baseUrl)) {
            links.push(absoluteUrl);
          }
        } catch (error) {
          // Invalid URL, skip it
        }
      });

      // Store the scraped page
      const scrapedPage: ScrapedPage = {
        url,
        title,
        content: content.substring(0, 50000), // Limit content size
        links: [...new Set(links)], // Remove duplicates
      };

      this.scrapedPages.push(scrapedPage);

      // Recursively scrape child pages
      if (depth < this.options.maxDepth) {
        for (const link of scrapedPage.links) {
          if (this.scrapedPages.length >= this.options.maxPages) {
            break;
          }
          await this.scrapeUrl(link, depth + 1);
        }
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }

    return this.scrapedPages;
  }

  private shouldExcludeUrl(url: string, baseUrl: URL): boolean {
    return this.options.excludePatterns.some((pattern) => pattern.test(url));
  }

  private isAllowedDomain(url: string, baseUrl: URL): boolean {
    try {
      const urlObj = new URL(url);
      
      // If no allowed domains specified, only allow same domain as base URL
      if (this.options.allowedDomains.length === 0) {
        return urlObj.hostname === baseUrl.hostname;
      }

      // Check if URL is from allowed domains
      return this.options.allowedDomains.some((domain) => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }
}

// Helper function to extract domain from URL
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// Helper function to clean and format scraped content
export function formatScrapedContent(pages: ScrapedPage[]): string {
  if (pages.length === 0) {
    return 'No content scraped';
  }

  let formattedContent = '';

  for (const page of pages) {
    formattedContent += `\n\n--- Page: ${page.title} ---\n`;
    formattedContent += `URL: ${page.url}\n\n`;
    formattedContent += page.content;
    formattedContent += '\n';
  }

  return formattedContent.trim();
} 