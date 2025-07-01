'use client';

import Image from 'next/image';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function FloatingSidebarToggle({ className }: { className?: string }) {
  const { toggleSidebar, open } = useSidebar();

  // Only show when sidebar is closed
  if (open) return null;

  return (
    <div className={cn("fixed left-2 top-2 z-50", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleSidebar}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl bg-background/95 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <Image
              src="/images/sparklogo_icon.png"
              alt="Open Sidebar"
              width={28}
              height={28}
              className="w-7 h-7"
              priority
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex items-center gap-2">
            <span>Open Sidebar</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>B
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
} 