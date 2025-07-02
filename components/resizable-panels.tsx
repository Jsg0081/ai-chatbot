'use client';

import { ReactNode, useState, useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { GripVertical, BookOpen, FileText, MessageSquare, Menu, ChevronRight } from 'lucide-react';
import { useWindowSize } from 'usehooks-ts';
import { FloatingSidebarToggle } from './floating-sidebar-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { useScripture } from '@/lib/scripture-context';
import { Button } from './ui/button';
import { useSidebar } from './ui/sidebar';

interface ResizablePanelsProps {
  scriptureContent: ReactNode;
  notesContent: ReactNode;
  chatContent: ReactNode;
}

export function ResizablePanels({ scriptureContent, notesContent, chatContent }: ResizablePanelsProps) {
  const { width } = useWindowSize();
  const isMobile = width && width < 768;
  const [savedLayout, setSavedLayout] = useState<number[]>([33, 33, 34]);
  const [activeTab, setActiveTab] = useState<string>('chat');
  const { book, chapter } = useScripture();
  const { toggleSidebar } = useSidebar();

  // Load saved layout after mount to avoid hydration mismatch
  useEffect(() => {
    const key = isMobile ? 'bible-panels-mobile-3col' : 'bible-panels-desktop-3col';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as number[];
        // Ensure we have 3 values for 3 columns
        if (parsed.length === 3) {
          setSavedLayout(parsed);
        }
      } catch {
        // Keep default values on parse error
      }
    }
    
    // Load saved active tab for mobile
    if (isMobile) {
      const savedTab = localStorage.getItem('bible-mobile-active-tab');
      if (savedTab && ['scripture', 'notes', 'chat'].includes(savedTab)) {
        setActiveTab(savedTab);
      }
    }
  }, [isMobile]);

  // Save panel layout to localStorage
  const onLayout = (sizes: number[]) => {
    const key = isMobile ? 'bible-panels-mobile-3col' : 'bible-panels-desktop-3col';
    localStorage.setItem(key, JSON.stringify(sizes));
  };

  // Save active tab for mobile
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('bible-mobile-active-tab', value);
  };

  // On mobile, use tabs for better navigation
  if (isMobile) {
    return (
      <>
        <FloatingSidebarToggle className="hidden" />
        <div className="flex flex-col h-full w-full max-h-screen">
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="flex flex-col h-full"
          >
            {/* Mobile header for Scripture tab */}
            {activeTab === 'scripture' && (
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="flex items-center justify-between p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="flex items-center gap-2"
                  >
                    <Menu className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {book && chapter ? `${book} ${chapter}` : 'Select Book'}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <TabsList className="grid w-full grid-cols-3 sticky top-0 z-10 mx-0 rounded-none border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <TabsTrigger 
                value="scripture" 
                className="flex items-center gap-2 data-[state=active]:bg-muted"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden xs:inline">Scripture</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notes"
                className="flex items-center gap-2 data-[state=active]:bg-muted"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden xs:inline">Notes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                className="flex items-center gap-2 data-[state=active]:bg-muted"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden xs:inline">Chat</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent 
              value="scripture" 
              className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden"
            >
              <div className="h-full overflow-y-auto p-4 pb-20">
                {scriptureContent}
              </div>
            </TabsContent>
            
            <TabsContent 
              value="notes"
              className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden"
            >
              <div className="h-full overflow-hidden p-4">
                {notesContent}
              </div>
            </TabsContent>
            
            <TabsContent 
              value="chat"
              className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden"
            >
              <div className="h-full overflow-hidden flex flex-col">
                {activeTab === 'chat' && <FloatingSidebarToggle />}
                {chatContent}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </>
    );
  }

  // Desktop horizontal layout
  return (
    <>
      <FloatingSidebarToggle />
      <div className="flex h-full w-full p-4 max-h-screen">
        <PanelGroup direction="horizontal" className="h-full" onLayout={onLayout}>
          <Panel 
            defaultSize={savedLayout[0]}
            minSize={20}
            maxSize={50}
            className="min-w-[250px]"
          >
            <div className="h-full pr-2 overflow-y-auto ml-16">
              {scriptureContent}
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-3 bg-transparent hover:bg-primary/10 transition-colors relative flex items-center justify-center group cursor-col-resize">
            <div className="absolute inset-y-0 left-1/2 w-px bg-border -translate-x-1/2" />
            <div className="relative z-10 flex h-8 w-3 items-center justify-center rounded-sm border bg-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3" />
            </div>
          </PanelResizeHandle>
          
          <Panel 
            defaultSize={savedLayout[1]}
            minSize={20}
            maxSize={50}
            className="min-w-[250px]"
          >
            <div className="h-full px-2 overflow-hidden">
              {notesContent}
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-3 bg-transparent hover:bg-primary/10 transition-colors relative flex items-center justify-center group cursor-col-resize">
            <div className="absolute inset-y-0 left-1/2 w-px bg-border -translate-x-1/2" />
            <div className="relative z-10 flex h-8 w-3 items-center justify-center rounded-sm border bg-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3" />
            </div>
          </PanelResizeHandle>
          
          <Panel 
            defaultSize={savedLayout[2]}
            minSize={20}
            className="min-w-[250px]"
          >
            <div className="h-full pl-2 overflow-hidden flex flex-col">
              {chatContent}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </>
  );
} 