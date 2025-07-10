import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import { eq, and, or, like, inArray } from 'drizzle-orm';
import type { Session } from 'next-auth';

// Maximum content length to return directly (in characters)
// Claude has 200k token limit, leaving room for conversation history and response
// Roughly 1 char = 0.25 tokens, so 150k tokens = ~600k characters
const MAX_CONTENT_LENGTH = 500000; // ~125k tokens, leaving plenty of room
const EXCERPT_CONTEXT = 2000; // Context around search matches

function truncateContent(content: string, maxLength: number = MAX_CONTENT_LENGTH): string {
  if (!content || content.length <= maxLength) {
    return content;
  }
  
  // Find a good break point (end of sentence or paragraph)
  let truncateAt = maxLength;
  const sentenceEnd = content.lastIndexOf('.', maxLength);
  const paragraphEnd = content.lastIndexOf('\n', maxLength);
  
  if (sentenceEnd > maxLength * 0.9) {
    truncateAt = sentenceEnd + 1;
  } else if (paragraphEnd > maxLength * 0.9) {
    truncateAt = paragraphEnd + 1;
  }
  
  return content.substring(0, truncateAt) + '\n\n[Document continues beyond token limit. Search for specific sections to see more.]';
}

function searchWithinContent(content: string, query: string): string {
  if (!content || !query) return '';
  
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Find all occurrences of the query
  const matches: { index: number; context: string }[] = [];
  let searchIndex = 0;
  
  while (searchIndex < contentLower.length) {
    const matchIndex = contentLower.indexOf(queryLower, searchIndex);
    if (matchIndex === -1) break;
    
    // Extract context around the match
    const contextStart = Math.max(0, matchIndex - EXCERPT_CONTEXT);
    const contextEnd = Math.min(content.length, matchIndex + queryLower.length + EXCERPT_CONTEXT);
    
    // Find sentence boundaries for cleaner extraction
    let actualStart = contextStart;
    let actualEnd = contextEnd;
    
    // Look for paragraph or sentence start
    const paragraphStart = content.lastIndexOf('\n\n', matchIndex);
    const sentenceStart = content.lastIndexOf('.', matchIndex);
    
    if (paragraphStart > contextStart && paragraphStart > matchIndex - EXCERPT_CONTEXT * 2) {
      actualStart = paragraphStart + 2;
    } else if (sentenceStart > contextStart && sentenceStart > matchIndex - 500) {
      actualStart = sentenceStart + 1;
    }
    
    // Look for paragraph or sentence end
    const paragraphEnd = content.indexOf('\n\n', matchIndex + queryLower.length);
    const sentenceEnd = content.indexOf('.', matchIndex + queryLower.length);
    
    if (paragraphEnd !== -1 && paragraphEnd < contextEnd && paragraphEnd < matchIndex + EXCERPT_CONTEXT * 2) {
      actualEnd = paragraphEnd;
    } else if (sentenceEnd !== -1 && sentenceEnd < contextEnd && sentenceEnd < matchIndex + 500) {
      actualEnd = sentenceEnd + 1;
    }
    
    const context = content.substring(actualStart, actualEnd).trim();
    matches.push({ index: matchIndex, context });
    
    searchIndex = matchIndex + queryLower.length;
  }
  
  if (matches.length === 0) {
    // If no matches found, return the beginning of the document
    return truncateContent(content, 50000) + '\n\n[No matches found for "' + query + '". Showing document beginning.]';
  }
  
  // Calculate how much content we can return
  const maxExcerpts = Math.floor(MAX_CONTENT_LENGTH / (EXCERPT_CONTEXT * 2));
  const excerptsToReturn = Math.min(matches.length, maxExcerpts);
  
  // Return all matches if they fit, otherwise return the most relevant ones
  const excerpts = matches.slice(0, excerptsToReturn).map((match, i) => 
    `[Match ${i + 1} of ${matches.length}]:\n${match.context}`
  ).join('\n\n---\n\n');
  
  const header = `Found ${matches.length} matches for "${query}" in the document.\n`;
  const footer = matches.length > excerptsToReturn 
    ? `\n\n[Showing first ${excerptsToReturn} of ${matches.length} matches. Refine your search for more specific results.]`
    : '';
  
  return header + '\n' + excerpts + footer;
}

function comprehensiveSearch(content: string, queries: string[]): string {
  if (!content || queries.length === 0) return '';
  
  const allMatches: { query: string; index: number; context: string }[] = [];
  const contentLower = content.toLowerCase();
  
  // Search for each query
  for (const query of queries) {
    const queryLower = query.toLowerCase();
    let searchIndex = 0;
    
    while (searchIndex < contentLower.length) {
      const matchIndex = contentLower.indexOf(queryLower, searchIndex);
      if (matchIndex === -1) break;
      
      // Extract larger context for comprehensive search
      const contextStart = Math.max(0, matchIndex - 3000);
      const contextEnd = Math.min(content.length, matchIndex + queryLower.length + 3000);
      
      // Find paragraph boundaries
      let actualStart = contextStart;
      let actualEnd = contextEnd;
      
      const paragraphStart = content.lastIndexOf('\n\n', matchIndex);
      if (paragraphStart > contextStart && paragraphStart > matchIndex - 5000) {
        actualStart = paragraphStart + 2;
      }
      
      const paragraphEnd = content.indexOf('\n\n', matchIndex + queryLower.length);
      if (paragraphEnd !== -1 && paragraphEnd < contextEnd && paragraphEnd < matchIndex + 5000) {
        actualEnd = paragraphEnd;
      }
      
      const context = content.substring(actualStart, actualEnd).trim();
      
      // Check if this match overlaps with existing matches
      const isOverlapping = allMatches.some(existing => 
        (matchIndex >= existing.index - 1000 && matchIndex <= existing.index + existing.context.length + 1000)
      );
      
      if (!isOverlapping) {
        allMatches.push({ query, index: matchIndex, context });
      }
      
      searchIndex = matchIndex + queryLower.length;
    }
  }
  
  // Sort matches by position in document
  allMatches.sort((a, b) => a.index - b.index);
  
  if (allMatches.length === 0) {
    return truncateContent(content, 100000) + '\n\n[No matches found. Showing document beginning.]';
  }
  
  // Build comprehensive result
  let result = `Comprehensive search found ${allMatches.length} total matches across all search terms.\n\n`;
  
  // Group consecutive matches that are close together
  const groupedMatches: { startIndex: number; endIndex: number; contexts: typeof allMatches }[] = [];
  let currentGroup: typeof allMatches = [];
  
  for (const match of allMatches) {
    if (currentGroup.length === 0 || match.index - currentGroup[currentGroup.length - 1].index < 10000) {
      currentGroup.push(match);
    } else {
      if (currentGroup.length > 0) {
        groupedMatches.push({
          startIndex: currentGroup[0].index,
          endIndex: currentGroup[currentGroup.length - 1].index,
          contexts: [...currentGroup]
        });
      }
      currentGroup = [match];
    }
  }
  
  if (currentGroup.length > 0) {
    groupedMatches.push({
      startIndex: currentGroup[0].index,
      endIndex: currentGroup[currentGroup.length - 1].index,
      contexts: [...currentGroup]
    });
  }
  
  // Return grouped matches with clear separation
  for (let i = 0; i < groupedMatches.length; i++) {
    const group = groupedMatches[i];
    result += `\n=== Section ${i + 1} of ${groupedMatches.length} ===\n`;
    result += `[Document position: approximately ${Math.round(group.startIndex / content.length * 100)}% through]\n\n`;
    
    for (const match of group.contexts) {
      result += `[Match for "${match.query}"]:\n${match.context}\n\n`;
    }
    
    if (i < groupedMatches.length - 1) {
      result += '\n' + '='.repeat(50) + '\n';
    }
  }
  
  return result;
}

export const getKnowledge = ({ session }: { session: Session }) => {
  return tool({
    description: 'Query the knowledge store to retrieve information from uploaded documents. Use this when the user references a document or asks about information that might be in their knowledge store. Can handle large documents up to ~500k characters.',
    parameters: z.object({
      query: z.string().describe('The search query to find relevant documents or content within documents'),
      knowledgeIds: z.array(z.string()).optional().describe('Specific knowledge IDs to retrieve'),
      searchWithinDocument: z.boolean().optional().describe('If true and a specific document is found, search for the query within that document'),
      comprehensiveSearch: z.boolean().optional().describe('If true, perform an exhaustive search through the entire document'),
      additionalQueries: z.array(z.string()).optional().describe('Additional search terms for comprehensive search'),
    }),
    execute: async ({ query, knowledgeIds, searchWithinDocument = true, comprehensiveSearch: doComprehensiveSearch = false, additionalQueries = [] }) => {
      try {
        const userId = session.user?.id;
        if (!userId) {
          return { found: false, message: 'User not authenticated' };
        }
        
        let results;
        
        if (knowledgeIds && knowledgeIds.length > 0) {
          // If specific IDs are provided, fetch those documents
          results = await db
            .select({
              id: knowledgeStore.id,
              name: knowledgeStore.name,
              type: knowledgeStore.type,
              content: knowledgeStore.content,
              url: knowledgeStore.url,
              size: knowledgeStore.size,
            })
            .from(knowledgeStore)
            .where(
              and(
                eq(knowledgeStore.userId, userId),
                inArray(knowledgeStore.id, knowledgeIds)
              )
            );
        } else {
          // Otherwise, search by query
          const searchPattern = `%${query}%`;
          results = await db
            .select({
              id: knowledgeStore.id,
              name: knowledgeStore.name,
              type: knowledgeStore.type,
              content: knowledgeStore.content,
              url: knowledgeStore.url,
              size: knowledgeStore.size,
            })
            .from(knowledgeStore)
            .where(
              and(
                eq(knowledgeStore.userId, userId),
                or(
                  like(knowledgeStore.name, searchPattern),
                  like(knowledgeStore.content, searchPattern)
                )
              )
            )
            .limit(5);
        }
        
        if (results.length === 0) {
          return { found: false, message: 'No matching documents found in the knowledge store.' };
        }
        
        // Format the results with intelligent content handling
        const formattedResults = results.map(item => {
          let processedContent = item.content || '[No content available]';
          const contentLength = item.content?.length || 0;
          
          // Determine if this is a general document request or specific search
          const isGeneralRequest = knowledgeIds && knowledgeIds.length > 0 && (!query || query.toLowerCase() === item.name.toLowerCase());
          
          // If comprehensive search is requested
          if (doComprehensiveSearch && item.content) {
            const allQueries = [query, ...additionalQueries].filter(q => q && q.length > 0);
            processedContent = comprehensiveSearch(item.content, allQueries);
          }
          // If we have a specific query and searchWithinDocument is true, search within it
          else if (searchWithinDocument && query && item.content && !isGeneralRequest) {
            // This is a specific search within the document
            processedContent = searchWithinContent(item.content, query);
          } else {
            // This is a general document request - return as much as possible
            processedContent = truncateContent(item.content || '');
          }
          
          return {
            id: item.id,
            name: item.name,
            type: item.type,
            content: processedContent,
            url: item.url,
            size: item.size,
            contentLength: contentLength,
            isTruncated: contentLength > MAX_CONTENT_LENGTH,
          };
        });
        
        // Log for debugging
        console.log('Knowledge retrieval:', {
          query,
          comprehensiveSearch: doComprehensiveSearch,
          additionalQueries,
          documentsFound: formattedResults.length,
          contentLengths: formattedResults.map(d => ({
            name: d.name,
            originalLength: d.contentLength,
            returnedLength: d.content.length,
            truncated: d.isTruncated
          }))
        });
        
        return {
          found: true,
          documents: formattedResults,
          count: formattedResults.length,
          message: formattedResults.some(doc => doc.isTruncated) 
            ? doComprehensiveSearch 
              ? 'Performed comprehensive search across the entire document.'
              : 'Large documents may be truncated at ~500k characters. Use comprehensiveSearch=true for exhaustive search.' 
            : undefined,
        };
      } catch (error) {
        console.error('Error querying knowledge store:', error);
        return {
          found: false,
          error: 'Failed to query knowledge store',
        };
      }
    },
  });
}; 