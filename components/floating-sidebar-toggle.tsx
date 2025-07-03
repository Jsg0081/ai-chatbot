'use client';

import { SparkIcon } from '@/components/icons';
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
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 size-12 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-accent"
          >
            <SparkIcon size={28} className="size-7" />
            <span className="sr-only">Toggle sidebar</span>
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