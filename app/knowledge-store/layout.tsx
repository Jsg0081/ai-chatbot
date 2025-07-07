import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { VerseProvider } from '@/lib/verse-context';
import { ScriptureProvider } from '@/lib/scripture-context';
import { auth } from '../(auth)/auth';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session] = await Promise.all([auth(), cookies()]);

  return (
    <VerseProvider>
      <ScriptureProvider>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar user={session?.user} />
          <SidebarInset className="h-screen max-h-screen overflow-hidden">{children}</SidebarInset>
        </SidebarProvider>
      </ScriptureProvider>
    </VerseProvider>
  );
} 