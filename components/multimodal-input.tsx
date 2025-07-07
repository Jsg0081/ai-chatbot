'use client';

import type { Attachment, UIMessage } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { createPortal } from 'react-dom';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, X, AudioLines, Paperclip, Send, StopCircle, FileText } from 'lucide-react';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import type { VisibilityType } from './visibility-selector';
import { useVerse } from '@/lib/verse-context';
import { SpotifySearchModal } from './spotify-search-modal';
import { ModelSelector } from './model-selector';
import type { Session } from 'next-auth';
import { SpotifyIcon } from '@/components/icons';
import { KnowledgeStoreMention } from './knowledge-store-mention';
import { cn } from '@/lib/utils';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  selectedVisibilityType,
  session,
  selectedModelId,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  selectedVisibilityType: VisibilityType;
  session: Session;
  selectedModelId: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const isMobile = width && width < 768;
  const { selectedVerses, clearVerses } = useVerse();
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  
  // Knowledge Store mention state
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ bottom: 0, left: 0, width: 0 });
  const [selectedKnowledgeItems, setSelectedKnowledgeItems] = useState<Array<{ id: string; name: string }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const updateMentionPosition = () => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    setDropdownPosition({
      bottom: window.innerHeight - rect.top + 8, // Position above the container with 8px gap
      left: rect.left,
      width: rect.width
    });
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    const cursorPosition = event.target.selectionStart;
    
    setInput(value);
    adjustHeight();

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @
      console.log('@ typed, showing mention dropdown');
      setShowMention(true);
      setMentionQuery('');
      // Use setTimeout to ensure the position is calculated after render
      setTimeout(updateMentionPosition, 0);
    } else if (lastAtIndex !== -1) {
      // Check if we're in a mention
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      if (spaceIndex === -1) {
        // Still in mention mode
        console.log('Still in mention mode, query:', textAfterAt);
        setShowMention(true);
        setMentionQuery(textAfterAt);
        setTimeout(updateMentionPosition, 0);
      } else {
        setShowMention(false);
      }
    } else {
      setShowMention(false);
    }
  };

  const handleKnowledgeSelect = (item: { id: string; name: string }) => {
    if (!textareaRef.current) return;
    
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = input.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const newValue = 
        input.substring(0, lastAtIndex) + 
        `@${item.name} ` + 
        input.substring(cursorPosition);
      
      setInput(newValue);
      setSelectedKnowledgeItems([...selectedKnowledgeItems, item]);
      setShowMention(false);
      
      // Move cursor after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + item.name.length + 2;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // If there are selected verses, prepend the references to the message
    let messageToSend = input;
    
    // Add verse references if any
    if (selectedVerses.length > 0) {
      const verseRefs = selectedVerses
        .map(v => `[${v.book} ${v.chapter}:${v.verse}] "${v.text}"`)
        .join('\n');
      messageToSend = verseRefs + '\n\n' + input;
      
      // Debug logging
      console.log('Selected verses:', selectedVerses);
      console.log('Message being sent:', messageToSend);
    }

    // Add knowledge store references if any
    if (selectedKnowledgeItems.length > 0) {
      const knowledgeRefs = selectedKnowledgeItems
        .map(item => `[Knowledge: ${item.id}]`)
        .join(' ');
      messageToSend = messageToSend + '\n\n' + knowledgeRefs;
    }

    // Use append to send the message with verses included
    append({
      role: 'user',
      content: messageToSend,
      experimental_attachments: attachments,
    });

    // Clear everything after submission
    setInput('');
    clearVerses();
    setAttachments([]);
    setLocalStorageInput('');
    setSelectedKnowledgeItems([]);
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    append,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    input,
    selectedVerses,
    clearVerses,
    setInput,
    selectedKnowledgeItems,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === 'submitted') {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  // Create a formatted string of all selected verses
  const getFormattedVerses = () => {
    if (selectedVerses.length === 0) return '';
    
    if (selectedVerses.length === 1) {
      const v = selectedVerses[0];
      return `${v.book} ${v.chapter}:${v.verse} - ${v.text}`;
    }
    
    // For multiple verses, show abbreviated format
    const versesText = selectedVerses
      .map(v => `${v.book} ${v.chapter}:${v.verse}`)
      .join(', ');
    
    const allText = selectedVerses.map(v => v.text).join(' ');
    const truncatedText = allText.length > 100 ? allText.substring(0, 100) + '...' : allText;
    
    return `${versesText} - ${truncatedText}`;
  };

  const updateMentionDropdownPosition = () => {
    if (showMention && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const inputHeight = containerRef.current.offsetHeight;
      
      setDropdownPosition({
        bottom: window.innerHeight - rect.top + 8, // Position above the input with 8px gap
        left: rect.left,
        width: rect.width
      });
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'relative flex w-full flex-col gap-4 rounded-xl bg-muted/25 p-4',
          className
        )}
      >
        <AnimatePresence>
          {!isAtBottom && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute left-1/2 bottom-28 -translate-x-1/2 z-50"
            >
              <Button
                data-testid="scroll-to-bottom-button"
                className="rounded-full"
                size="icon"
                variant="outline"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToBottom();
                }}
              >
                <ArrowDown />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.length === 0 &&
          attachments.length === 0 &&
          uploadQueue.length === 0 && (
            <SuggestedActions
              append={append}
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
            />
          )}

        <input
          type="file"
          className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
          ref={fileInputRef}
          multiple
          accept="image/*,.pdf,application/pdf"
          onChange={handleFileChange}
          tabIndex={-1}
        />

        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            data-testid="attachments-preview"
            className="flex flex-row gap-2 overflow-x-scroll items-end"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                key={filename}
                attachment={{
                  url: '',
                  name: filename,
                  contentType: '',
                }}
                isUploading={true}
              />
            ))}
          </div>
        )}

        {selectedVerses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-start gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg border border-border/50 overflow-hidden mx-2 sm:mx-0"
          >
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {selectedVerses.length} verse{selectedVerses.length > 1 ? 's' : ''} selected
                </span>
                {selectedVerses[0]?.translation && (
                  <span className="text-xs text-muted-foreground truncate">
                    ({selectedVerses[0].translation})
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm line-clamp-2 text-cyan-950 dark:text-[#00e599] font-medium">
                {getFormattedVerses()}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setShowSpotifyModal(true)}
                title="Search Spotify for related content"
              >
                <SpotifyIcon size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => clearVerses()}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        <div className="relative px-2 sm:px-0">
          <Textarea
            data-testid="multimodal-input"
            ref={textareaRef}
            placeholder="Send a message..."
            value={input}
            onChange={handleInput}
            className={cx(
              'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-muted pb-12 sm:pb-10 dark:border-zinc-700',
              className,
            )}
            rows={2}
            autoFocus={!isMobile}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();

                if (status !== 'ready') {
                  toast.error('Please wait for the model to finish its response!');
                } else {
                  submitForm();
                }
              }
            }}
          />

          <div className="absolute bottom-0 p-2 w-fit flex flex-row items-center justify-start gap-1 sm:gap-2">
            <AttachmentsButton fileInputRef={fileInputRef} status={status} />
            <ModelSelector
              session={session}
              selectedModelId={selectedModelId}
            />
          </div>

          <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
            {status === 'submitted' ? (
              <StopButton stop={stop} setMessages={setMessages} />
            ) : (
              <SendButton
                input={input}
                submitForm={submitForm}
                uploadQueue={uploadQueue}
              />
            )}
          </div>
        </div>
        
        <SpotifySearchModal 
          open={showSpotifyModal}
          onOpenChange={setShowSpotifyModal}
          verses={selectedVerses}
        />

        {showMention && typeof window !== 'undefined' && createPortal(
          <div 
            style={{
              position: 'fixed',
              bottom: dropdownPosition.bottom + 'px',
              left: dropdownPosition.left + 'px',
              width: dropdownPosition.width + 'px',
              zIndex: 50, // High z-index to appear above everything
              pointerEvents: 'auto'
            }}
            className="shadow-lg"
          >
            <KnowledgeStoreMention
              onSelect={handleKnowledgeSelect}
              searchQuery={mentionQuery}
              onClose={() => setShowMention(false)}
            />
          </div>,
          document.body
        )}
      </div>
    </>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
