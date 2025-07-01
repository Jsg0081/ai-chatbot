import { cookies } from 'next/headers';
import type { UIMessage } from 'ai';

import { Chat } from '@/components/chat';
import { ScriptureDisplay } from '@/components/scripture-display';
import { NotesEditor } from '@/components/notes-editor';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { ResizablePanels } from '@/components/resizable-panels';

interface PageProps {
  searchParams: Promise<{ book?: string; chapter?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();
  const { book, chapter } = await searchParams;

  // Create initial message if a book was selected
  let initialMessages: UIMessage[] = [];
  if (book) {
    let messageText = '';
    if (chapter) {
      messageText = `Tell me about ${book} chapter ${chapter} from the Bible.`;
    } else {
      messageText = `Tell me about the book of ${book} from the Bible.`;
    }
    
    initialMessages = [
      {
        id: generateUUID(),
        role: 'user' as const,
        parts: [
          {
            type: 'text' as const,
            text: messageText,
          },
        ],
        content: '',
        createdAt: new Date(),
      },
    ];
  }

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  const chatComponent = !modelIdFromCookie ? (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      initialChatModel={DEFAULT_CHAT_MODEL}
      initialVisibilityType="private"
      isReadonly={false}
      session={session}
      autoResume={false}
    />
  ) : (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      initialChatModel={modelIdFromCookie.value}
      initialVisibilityType="private"
      isReadonly={false}
      session={session}
      autoResume={false}
    />
  );

  // Show scripture display when both book and chapter are selected
  if (book && chapter) {
    return (
      <>
        <div className="h-screen overflow-hidden">
          <ResizablePanels
            scriptureContent={<ScriptureDisplay book={book} chapter={parseInt(chapter)} />}
            notesContent={<NotesEditor chatId={id} />}
            chatContent={chatComponent}
          />
        </div>
        <DataStreamHandler id={id} />
      </>
    );
  }

  // Default view - show notes and chat
  return (
    <>
      <div className="h-screen overflow-hidden">
        <ResizablePanels
          scriptureContent={
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-sm">Select a book and chapter from the sidebar</p>
                <p className="text-xs">to view scripture here</p>
              </div>
            </div>
          }
          notesContent={<NotesEditor chatId={id} />}
          chatContent={chatComponent}
        />
      </div>
      <DataStreamHandler id={id} />
    </>
  );
}
