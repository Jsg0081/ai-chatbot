import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { ScriptureDisplayWrapper } from '@/components/scripture-display-wrapper';
import { NotesWrapper } from '@/components/notes-wrapper';
import { ResizablePanels } from '@/components/resizable-panels';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { DBMessage } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  if (chat.visibility === 'private') {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  const chatComponent = !chatModelFromCookie ? (
    <Chat
      id={chat.id}
      initialMessages={convertToUIMessages(messagesFromDb)}
      initialChatModel={DEFAULT_CHAT_MODEL}
      initialVisibilityType={chat.visibility}
      isReadonly={session?.user?.id !== chat.userId}
      session={session}
      autoResume={true}
    />
  ) : (
    <Chat
      id={chat.id}
      initialMessages={convertToUIMessages(messagesFromDb)}
      initialChatModel={chatModelFromCookie.value}
      initialVisibilityType={chat.visibility}
      isReadonly={session?.user?.id !== chat.userId}
      session={session}
      autoResume={true}
    />
  );

  return (
    <>
      <div className="h-screen overflow-hidden">
        <ResizablePanels
          scriptureContent={<ScriptureDisplayWrapper />}
          notesContent={<NotesWrapper chatId={id} />}
          chatContent={chatComponent}
        />
      </div>
      <DataStreamHandler id={id} />
    </>
  );
}
