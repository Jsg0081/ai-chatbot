'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface OnboardingTooltipProps {
  isVisible: boolean;
  onClose: () => void;
}

export function OnboardingTooltip({ isVisible, onClose }: OnboardingTooltipProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-40 left-4 right-4 sm:left-8 sm:right-8 lg:left-12 lg:right-12 z-50"
        >
          <div className="relative bg-popover text-popover-foreground rounded-lg shadow-lg border border-border p-3 sm:p-4 max-w-sm mx-auto">
            {/* Arrow pointing up to Genesis 1:1 */}
            <div className="absolute -top-2 left-12 sm:left-16 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-popover" />
            
            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-popover border border-border"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close</span>
            </Button>
            
            {/* Content */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Welcome to BibleSpark! ✨</h3>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <p>Click on any verse to select it, then chat directly with that verse</p>
                </div>
                
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <p>Drag and drop selected verses into your notes to save them</p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Genesis 1:1 is a good place to start!
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 