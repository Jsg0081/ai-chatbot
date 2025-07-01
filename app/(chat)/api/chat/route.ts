import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';
import { extractTextFromPDF } from '@/lib/pdf-utils';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    // Log the incoming message with attachments
    console.log('Message with attachments:', {
      content: message.content,
      attachments: message.experimental_attachments,
      parts: message.parts,
    });

    // Ensure the message includes experimental_attachments
    const formattedMessage = {
      ...message,
      experimental_attachments: message.experimental_attachments || [],
    };

    // Log what we're sending to the AI
    if (formattedMessage.experimental_attachments.length > 0) {
      console.log('Sending message with attachments to AI:', {
        hasContent: !!formattedMessage.content,
        attachmentCount: formattedMessage.experimental_attachments.length,
        attachments: formattedMessage.experimental_attachments.map(a => ({
          name: a.name,
          contentType: a.contentType,
          url: a.url.substring(0, 100) + '...',
        })),
      });
    }

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message: formattedMessage,
    });

    // Transform messages to handle attachments properly
    const transformedMessages = await Promise.all(messages.map(async (msg: any) => {
      if (msg.experimental_attachments && msg.experimental_attachments.length > 0) {
        console.log('Transforming message with attachments:', {
          originalContent: msg.content,
          attachmentCount: msg.experimental_attachments.length,
        });
        
        // Convert attachments to proper format for the AI model
        const contentParts = [];
        let extractedPdfText = '';
        
        // Add text content if present
        if (msg.content) {
          contentParts.push({
            type: 'text',
            text: msg.content,
          });
        }
        
        // Process attachments
        for (const attachment of msg.experimental_attachments) {
          console.log('Processing attachment:', {
            name: attachment.name,
            contentType: attachment.contentType,
            urlPreview: attachment.url.substring(0, 100) + '...',
          });
          
          if (attachment.contentType === 'application/pdf') {
            // For PDFs, extract text and append to message
            try {
              const pdfText = await extractTextFromPDF(attachment.url);
              extractedPdfText += `\n\n--- Content from ${attachment.name} ---\n${pdfText}\n--- End of ${attachment.name} ---\n`;
              console.log('Successfully extracted PDF text, length:', pdfText.length);
            } catch (error) {
              console.error('Failed to extract PDF text:', error);
              extractedPdfText += `\n\n--- Error reading ${attachment.name} ---\nCould not extract text from this PDF.\n`;
            }
          } else if (attachment.contentType?.startsWith('image/')) {
            // For images, pass as image type (xAI supports images)
            contentParts.push({
              type: 'image',
              image: attachment.url,
            });
          }
        }
        
        // If we extracted PDF text, add it to the message
        if (extractedPdfText) {
          const textContent = msg.content ? `${msg.content}\n${extractedPdfText}` : extractedPdfText;
          // Replace or add the text content with PDF content included
          const textPartIndex = contentParts.findIndex(part => part.type === 'text');
          if (textPartIndex >= 0) {
            contentParts[textPartIndex].text = textContent;
          } else {
            contentParts.push({
              type: 'text',
              text: textContent,
            });
          }
        }
        
        console.log('Transformed message content parts:', contentParts.length);
        
        // Return message with transformed content
        // If only text content, return as string for compatibility
        if (contentParts.length === 1 && contentParts[0].type === 'text') {
          return {
            ...msg,
            content: contentParts[0].text,
          };
        }
        
        return {
          ...msg,
          content: contentParts,
        };
      }
      
      // Return message as-is if no attachments
      return msg;
    }));

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    // Check if the message contains Bible verse references
    const messageContent = message.content || '';
    const messageParts = message.parts || [];
    
    // Get text from either content or parts
    let messageText = messageContent;
    if (!messageText && messageParts.length > 0) {
      messageText = messageParts.map(part => 
        part.type === 'text' ? part.text : ''
      ).join(' ');
    }
    
    // More robust Bible verse detection - check for multiple patterns
    const bibleVersePatterns = [
      /\[[A-Za-z0-9\s]+\s+\d+:\d+\]/,  // [Book Chapter:Verse]
      /\[[\w\s]+\s+\d+:\d+\]/,         // Any word characters
      /\[[^\]]+\d+:\d+\]/              // Any format with numbers:numbers
    ];
    
    const hasBibleVerses = bibleVersePatterns.some(pattern => pattern.test(messageText));
    
    // Log for debugging
    console.log('Full message object:', JSON.stringify(message, null, 2));
    console.log('Message content:', messageContent);
    console.log('Message parts:', messageParts);
    console.log('Extracted message text:', messageText);
    console.log('Has Bible verses:', hasBibleVerses);

    const stream = createDataStream({
      execute: (dataStream) => {
        console.log('Calling streamText with:', {
          model: selectedChatModel,
          messagesCount: transformedMessages.length,
          lastMessage: transformedMessages[transformedMessages.length - 1],
        });
        
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints, hasBibleVerses }),
          messages: transformedMessages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId.id,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
