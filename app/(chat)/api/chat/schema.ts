import { z } from 'zod';

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text']),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    createdAt: z.coerce.date(),
    role: z.enum(['user']),
    content: z.string().min(1).max(2000),
    parts: z.array(textPartSchema),
    experimental_attachments: z
      .array(
        z.object({
          url: z.string(), // Allow data URLs and regular URLs
          name: z.string().min(1).max(2000),
          contentType: z.enum([
            'image/png', 
            'image/jpg', 
            'image/jpeg',
            'image/gif',
            'image/webp',
            'application/pdf'
          ]),
        }),
      )
      .optional(),
  }),
  selectedChatModel: z.enum([
    'chat-model', 
    'chat-model-reasoning',
    'chatgpt-4o-latest',
    'gpt-4.1-2025-04-14',
    'o3-2025-04-16',
    'claude-4-sonnet',
    'claude-3.7-sonnet',
    'grok-4-0709'
  ]),
  selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
