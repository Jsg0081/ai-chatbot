'use client';

import { ReactNode, useState, useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { GripVertical } from 'lucide-react';
import { useWindowSize } from 'usehooks-ts';
import { FloatingSidebarToggle } from './floating-sidebar-toggle';

interface ResizablePanelsProps {
  scriptureContent: ReactNode;
  notesContent: ReactNode;
  chatContent: ReactNode;
}

export function ResizablePanels({ scriptureContent, notesContent, chatContent }: ResizablePanelsProps) {
  const { width } = useWindowSize();
  const isMobile = width && width < 768;
  const [savedLayout, setSavedLayout] = useState<number[]>([33, 33, 34]);

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
  }, [isMobile]);

  // Save panel layout to localStorage
  const onLayout = (sizes: number[]) => {
    const key = isMobile ? 'bible-panels-mobile-3col' : 'bible-panels-desktop-3col';
    localStorage.setItem(key, JSON.stringify(sizes));
  };

  // On mobile, stack vertically
  if (isMobile) {
    return (
      <>
        <FloatingSidebarToggle />
        <div className="flex flex-col h-full w-full p-2 max-h-screen">
          <PanelGroup direction="vertical" className="h-full" onLayout={onLayout}>
            <Panel 
              defaultSize={savedLayout[0]}
              minSize={20}
              maxSize={60}
              className="min-h-[20vh]"
            >
              <div className="h-full pb-2 overflow-y-auto ml-16">
                {scriptureContent}
              </div>
            </Panel>
            
            <PanelResizeHandle className="h-3 bg-transparent hover:bg-primary/10 transition-colors relative flex items-center justify-center cursor-row-resize">
              <div className="absolute h-1 w-10 rounded-full bg-border" />
            </PanelResizeHandle>
            
            <Panel 
              defaultSize={savedLayout[1]}
              minSize={20}
              maxSize={60}
              className="min-h-[20vh]"
            >
              <div className="h-full py-2 overflow-hidden">
                {notesContent}
              </div>
            </Panel>
            
            <PanelResizeHandle className="h-3 bg-transparent hover:bg-primary/10 transition-colors relative flex items-center justify-center cursor-row-resize">
              <div className="absolute h-1 w-10 rounded-full bg-border" />
            </PanelResizeHandle>
            
            <Panel 
              defaultSize={savedLayout[2]}
              minSize={20}
              className="min-h-[20vh]"
            >
              <div className="h-full pt-2 overflow-hidden flex flex-col">
                {chatContent}
              </div>
            </Panel>
          </PanelGroup>
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