import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { knowledgeStore } from '@/lib/db/schema';
import { eq, and, or, like, inArray } from 'drizzle-orm';
import type { Session } from 'next-auth';

export const getKnowledge = ({ session }: { session: Session }) => {
  return tool({
    description: 'Query the knowledge store to retrieve information from uploaded documents. Use this when the user references a document or asks about information that might be in their knowledge store.',
    parameters: z.object({
      query: z.string().describe('The search query to find relevant documents'),
      knowledgeIds: z.array(z.string()).optional().describe('Specific knowledge IDs to retrieve'),
    }),
    execute: async ({ query, knowledgeIds }) => {
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
        
        // Format the results
        const formattedResults = results.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          content: item.content || '[No content available]',
          url: item.url,
          size: item.size,
        }));
        
        return {
          found: true,
          documents: formattedResults,
          count: formattedResults.length,
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