'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, FileText, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { toast } from '@/components/toast';
import { cn } from '@/lib/utils';

interface NotesEditorProps {
  chatId?: string;
}

export function NotesEditor({ chatId }: NotesEditorProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const storageKey = chatId ? `notes-${chatId}` : 'notes-global';
    const savedNotes = localStorage.getItem(storageKey);
    if (savedNotes) {
      setContent(savedNotes);
    }
  }, [chatId]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (content) {
        saveNotes(true);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [content]);

  const saveNotes = (isAutoSave = false) => {
    setIsSaving(true);
    const storageKey = chatId ? `notes-${chatId}` : 'notes-global';
    
    try {
      localStorage.setItem(storageKey, content);
      setLastSaved(new Date());
      
      if (!isAutoSave) {
        toast({ type: 'success', description: 'Notes saved successfully' });
      }
    } catch (error) {
      toast({ type: 'error', description: 'Failed to save notes' });
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // Format text helper functions
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    
    setContent(newText);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertList = (ordered: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const prefix = ordered ? '1. ' : '• ';
    
    const newText = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
    }, 0);
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="pb-3 px-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveNotes(false)}
              disabled={isSaving}
              className="h-8"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Formatting toolbar */}
      <div className="px-4 pb-2 flex items-center gap-1 border-b">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => insertFormatting('**', '**')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => insertFormatting('*', '*')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => insertList(false)}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => insertList(true)}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="flex-1 px-4 pb-4 pt-3 overflow-hidden">
        <div className="h-full relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Start typing your notes here...&#10;&#10;Use **text** for bold, *text* for italic"
            className={cn(
              "w-full h-full p-3 text-sm resize-none border rounded-md",
              "bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "font-mono"
            )}
            style={{ minHeight: '100%' }}
            onKeyDown={(e) => {
              // Add keyboard shortcuts
              if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') {
                  e.preventDefault();
                  insertFormatting('**', '**');
                } else if (e.key === 'i') {
                  e.preventDefault();
                  insertFormatting('*', '*');
                } else if (e.key === 's') {
                  e.preventDefault();
                  saveNotes(false);
                }
              }
            }}
          />
          {isSaving && (
            <div className="absolute top-2 right-2 text-xs text-muted-foreground">
              Saving...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 