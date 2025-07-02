'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Bold, Italic, List, ListOrdered, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn, generateUUID } from '@/lib/utils';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BibleMention } from '@/lib/editor/bible-mention';
import { BibleMentionList, getBibleSuggestions } from '@/components/editor/bible-mention-list';
import tippy, { Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AuthModal } from '@/components/auth-modal';

interface NotesEditorProps {
  chatId?: string;
  noteId?: string;
  onNoteIdChange?: (noteId: string) => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  chatId?: string | null;
  userId?: string;
}

export function NotesEditor({ chatId, noteId, onNoteIdChange }: NotesEditorProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(noteId || null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  // Removed auth dialog states - now redirecting immediately

  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5 my-2',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5 my-2',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'mb-1',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-2',
          },
        },
      }),
      BibleMention.configure({
        HTMLAttributes: {
          class: 'bible-mention',
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            console.log('Bible mention triggered with query:', query);
            return getBibleSuggestions(query);
          },
          allowSpaces: true,
          char: '@',
          startOfLine: false,
          render: () => {
            let component: ReactRenderer | null = null;
            let popup: Instance[] | null = null;

            return {
              onStart: (props: any) => {
                console.log('Bible mention popup starting', props);
                component = new ReactRenderer(BibleMentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                // @ts-ignore
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'light',
                });
              },

              onUpdate(props: any) {
                component?.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },

              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }

                // @ts-ignore
                return component?.ref?.onKeyDown(props);
              },

              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    content: content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'w-full h-full p-3 text-sm rounded-md',
          'bg-background focus:outline-none',
          'min-h-full',
          // Prose-like styles for better typography
          'prose prose-sm max-w-none',
          'prose-p:my-2',
          'prose-ul:list-disc prose-ul:pl-5',
          'prose-ol:list-decimal prose-ol:pl-5',
          'prose-li:my-0',
          'dark:prose-invert'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      
      // Check if user is typing and not authenticated (including guest users)
      if (newContent && newContent !== '<p></p>' && (!session || session.user?.type === 'guest') && status !== 'loading') {
        // Show auth modal instead of redirecting
        setShowAuthModal(true);
        return;
      }
      
      setContent(newContent);
      
      // Mark that user has interacted if they've typed something
      if (newContent && newContent !== '<p></p>' && !hasUserInteracted) {
        setHasUserInteracted(true);
      }
    },
    onCreate: ({ editor }) => {
      console.log('Editor created successfully');
      // Test if suggestion is working
      setTimeout(() => {
        console.log('Editor extensions:', editor.extensionManager.extensions.map(e => e.name));
        const bibleMentionExt = editor.extensionManager.extensions.find(e => e.name === 'bibleMention');
        console.log('Bible mention extension:', bibleMentionExt);
        console.log('Bible mention options:', bibleMentionExt?.options);
      }, 100);
    },
    onSelectionUpdate: ({ editor }) => {
      // Log when @ is typed
      const { from } = editor.state.selection;
      const char = editor.state.doc.textBetween(Math.max(0, from - 1), from);
      if (char === '@') {
        console.log('@ character detected at position:', from);
      }
    },
  });

  // Test editor functionality after mount
  useEffect(() => {
    if (editor) {
      console.log('Editor is ready, testing @ mention...');
      // Focus the editor
      editor.commands.focus();
      
      // Log all plugins
      const plugins = editor.view.state.plugins;
      console.log('Editor plugins count:', plugins.length);
      
      // Check extensions instead
      const extensions = editor.extensionManager.extensions;
      console.log('Extensions:', extensions.map(ext => ext.name));
      
      // Find bible mention extension
      const bibleMentionExt = extensions.find(ext => ext.name === 'bibleMention');
      console.log('Bible mention extension found:', !!bibleMentionExt);
    }
  }, [editor]);

  // Update currentNoteId when noteId prop changes
  useEffect(() => {
    if (noteId && noteId !== currentNoteId) {
      setCurrentNoteId(noteId);
    }
  }, [noteId]);

  // Set up global handler for note selection from sidebar
  useEffect(() => {
    const handleNoteSelect = (noteId: string) => {
      setCurrentNoteId(noteId);
      onNoteIdChange?.(noteId);
    };

    // Make it available globally
    (window as any).handleNoteSelect = handleNoteSelect;

    return () => {
      delete (window as any).handleNoteSelect;
    };
  }, [onNoteIdChange]);

  // Load current note from API on mount or when currentNoteId changes
  useEffect(() => {
    if (currentNoteId && session?.user?.id && session.user.type !== 'guest') {
      loadNote(currentNoteId);
    }
  }, [currentNoteId, session]);

  // Load a specific note
  const loadNote = async (noteId: string) => {
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      
      const notes = await response.json();
      const note = notes.find((n: Note) => n.id === noteId);
      
      if (note) {
        setTitle(note.title || '');
        setContent(note.content || '');
        setIsNoteSaved(true);
        setHasUserInteracted(true);
        
        if (editor && note.content) {
          editor.commands.setContent(note.content);
        }
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast.error('Failed to load note');
    }
  };

  // Track if this note has been saved to the database
  const [isNoteSaved, setIsNoteSaved] = useState(false);

  // Save note to API
  const saveNote = async () => {
    if (!currentNoteId || !hasUserInteracted) return;
    
    // Check if user is authenticated (excluding guest users) and session is loaded
    if (status === 'loading' || !session || !session.user || session.user.type === 'guest') {
      // Show auth modal if not authenticated or is guest (but not while loading)
      if (status !== 'loading') {
        setShowAuthModal(true);
      }
      return;
    }

    try {
      const response = await fetch('/api/notes', {
        method: isNoteSaved ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentNoteId,
          title: title || 'New Note',
          content,
          chatId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      // If this was a POST (new note), we might need to handle the response
      const result = await response.json();
      
      // Mark as saved after first successful save
      if (!isNoteSaved) {
        setIsNoteSaved(true);
        // If the server returned a different ID, update it
        if (result.id && result.id !== currentNoteId) {
          setCurrentNoteId(result.id);
          onNoteIdChange?.(result.id);
        }
      }

      setLastSaved(new Date());
      setIsAutoSaving(false);

      // Notify sidebar to refresh
      window.dispatchEvent(new Event('notes-updated'));
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  // Auto-save content after delay
  useEffect(() => {
    if (!hasUserInteracted || !currentNoteId) return;
    
    // Don't auto-save for guest users or while session is loading
    if (status === 'loading' || !session || !session.user || session.user.type === 'guest') {
      return;
    }
    
    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      saveNote();
    }, 2000); // Increased to 2 seconds to reduce frequency

    return () => clearTimeout(timer);
  }, [content, currentNoteId, hasUserInteracted]); // Removed session and status from deps to prevent loops

  // Auto-save title after delay
  useEffect(() => {
    if (!hasUserInteracted || !currentNoteId || !title) return;
    
    // Don't auto-save for guest users or while session is loading
    if (status === 'loading' || !session || !session.user || session.user.type === 'guest') {
      return;
    }
    
    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      saveNote();
    }, 1000); // Increased to 1 second

    return () => clearTimeout(timer);
  }, [title, currentNoteId, hasUserInteracted]); // Removed session and status from deps to prevent loops

  // Create new note
  const createNewNote = () => {
    const newId = generateUUID();
    setCurrentNoteId(newId);
    setContent('');
    setTitle('');
    setHasUserInteracted(false);
    setIsNoteSaved(false);
    if (editor) {
      editor.commands.clearContent();
    }
    onNoteIdChange?.(newId);
  };

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if user is typing and not authenticated (including guest users)
    if ((!session || session.user?.type === 'guest') && status !== 'loading') {
      // Show auth modal instead of redirecting
      setShowAuthModal(true);
      return;
    }
    
    setTitle(e.target.value);
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
  };

  // Handle title editing
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingTitle(false);
    }
  };

  // Create note ID when user starts interacting
  useEffect(() => {
    if (hasUserInteracted && !currentNoteId) {
      const newId = generateUUID();
      setCurrentNoteId(newId);
      onNoteIdChange?.(newId);
    }
  }, [hasUserInteracted, currentNoteId, onNoteIdChange]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Check if user is not authenticated (including guest users)
    if ((!session || session.user?.type === 'guest') && status !== 'loading') {
      // Show auth modal instead of redirecting
      setShowAuthModal(true);
      return;
    }

    const verseData = e.dataTransfer.getData('text/plain');
    if (verseData && editor) {
      // Mark as interacted when dropping content
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
      }
      
      // Insert the dropped verse at cursor position or at the end
      editor.chain().focus().insertContent(verseData + '\n\n').run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="size-5 text-muted-foreground flex-shrink-0" />
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 min-w-0"
                autoFocus
                placeholder="Enter note title..."
              />
            ) : (
              <h3
                className="text-lg font-semibold cursor-text hover:bg-muted/50 px-2 py-1 rounded -mx-2 -my-1 transition-colors flex-1 truncate"
                onClick={() => setIsEditingTitle(true)}
                title={title || 'New Note'}
              >
                {title || 'New Note'}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {isAutoSaving && session?.user && session.user.type !== 'guest' && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Saving...
              </span>
            )}
            {lastSaved && !isAutoSaving && session?.user && session.user.type !== 'guest' && (
              <span className="text-xs text-muted-foreground truncate">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={createNewNote}
              size="sm"
              variant="outline"
              title="Create new note"
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 pt-2 border-t">
          <Button
            onClick={() => {
              console.log('Testing @ insertion');
              editor.chain().focus().insertContent('@').run();
            }}
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            title="Test @ mention"
          >
            @
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive('bold') && "bg-muted"
            )}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive('italic') && "bg-muted"
            )}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive('bulletList') && "bg-muted"
            )}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive('orderedList') && "bg-muted"
            )}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div 
          className={cn(
            "relative h-full transition-colors overflow-hidden",
            isDragOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {(!content || content === '<p></p>') && (
            <div className="absolute top-3 left-3 text-sm text-muted-foreground pointer-events-none">
              {(!session || session.user?.type === 'guest') && status !== 'loading' 
                ? 'Sign in to create and save notes...' 
                : 'Start typing your notes...'}
            </div>
          )}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-md shadow-lg">
                Drop verses here
              </div>
            </div>
          )}
          <EditorContent editor={editor} className="h-full overflow-y-auto" />
        </div>
      </CardContent>
      
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          // Re-trigger save after successful auth
          if (hasUserInteracted) {
            saveNote();
          }
        }}
      />
    </Card>
  );
} 