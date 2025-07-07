'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpenIcon, StickyNote, X, Pencil } from 'lucide-react';
import { useVerse } from '@/lib/verse-context';
import { BIBLE_BOOKS_DATA } from './bible-books';
import { SpotifySearchModal } from './spotify-search-modal';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { OnboardingTooltip } from './onboarding-tooltip';
import { useSession } from 'next-auth/react';
import { VerseNoteDialog } from './verse-note-dialog';
import { SpotifyIcon } from '@/components/icons';

interface ScriptureDisplayProps {
  book: string;
  chapter: number;
}

interface Verse {
  verse: number;
  text: string;
}

interface ScriptureData {
  reference: string;
  verses: Verse[];
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

// Default translations for fallback
const DEFAULT_TRANSLATIONS = [
  { id: 'esv', name: 'English Standard Version', type: 'local' },
  { id: 'asv', name: 'American Standard Version', type: 'bible-api' },
  { id: 'bbe', name: 'Bible in Basic English', type: 'bible-api' },
  { id: 'darby', name: 'Darby Translation', type: 'bible-api' },
  { id: 'kjv', name: 'King James Version', type: 'bible-api' },
  { id: 'web', name: 'World English Bible', type: 'bible-api' },
  { id: 'ylt', name: "Young's Literal Translation", type: 'bible-api' },
];

// Add the following CSS class to style selected verses
const selectedVerseStyle = {
  color: '#00e599', // Bright Green
  backgroundColor: 'rgba(0, 229, 153, 0.10)', // Bright Green with 10% opacity
  padding: '2px 4px',
  borderRadius: '4px',
  cursor: 'grab',
};

export function ScriptureDisplay({ book, chapter }: ScriptureDisplayProps) {
  const [scripture, setScripture] = useState<ScriptureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState('esv');
  const [isDragging, setIsDragging] = useState(false);
  const [translations, setTranslations] = useState<any[]>([]);
  const [loadingTranslations, setLoadingTranslations] = useState(true);
  const { addVerse, isVerseSelected, selectedVerses } = useVerse();
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [spotifySearchVerse, setSpotifySearchVerse] = useState<Verse | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const session = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasShownOnboarding, setHasShownOnboarding] = useState(false);
  
  // Verse notes state
  const [verseNotes, setVerseNotes] = useState<Record<string, any>>({});
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedVerseForNote, setSelectedVerseForNote] = useState<{
    book: string;
    chapter: number;
    verse: number;
    endVerse?: number;
    text: string;
    translation: string;
  } | null>(null);
  const [existingNote, setExistingNote] = useState<{ id: string; content: string } | null>(null);
  
  // Long press state for mobile
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileMenuVerse, setMobileMenuVerse] = useState<Verse | null>(null);
  const [mobileMenuPosition, setMobileMenuPosition] = useState({ x: 0, y: 0 });
  
  // Mobile hint state
  const [showMobileHint, setShowMobileHint] = useState(false);
  
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Show mobile hint
  useEffect(() => {
    if (isMobile && !localStorage.getItem('mobile-verse-hint-dismissed')) {
      setShowMobileHint(true);
    }
  }, [isMobile]);
  
  const dismissMobileHint = () => {
    setShowMobileHint(false);
    localStorage.setItem('mobile-verse-hint-dismissed', 'true');
  };

  // Onboarding logic for guest users
  useEffect(() => {
    // Skip if session is still loading
    if (session.status === 'loading') return;
    
    // Check if user is a guest and hasn't seen onboarding
    const isGuest = !session.data?.user || session.data?.user?.type === 'guest';
    const hasSeenOnboarding = localStorage.getItem('has-seen-onboarding') === 'true';
    
    if (isGuest && !hasSeenOnboarding && !hasShownOnboarding && book === 'Genesis' && chapter === 1 && scripture?.verses && scripture.verses.length > 0) {
      // Pre-select Genesis 1:1
      const firstVerse = scripture.verses.find(v => v.verse === 1);
      if (firstVerse && !isVerseSelected('Genesis', 1, 1)) {
        // Add a small delay to ensure the scripture is rendered
        setTimeout(() => {
          console.log('Pre-selecting Genesis 1:1 for onboarding');
          addVerse({
            book: 'Genesis',
            chapter: 1,
            verse: 1,
            text: firstVerse.text,
            translation: scripture.translation_name || 'English Standard Version',
          });
          setShowOnboarding(true);
          setHasShownOnboarding(true);
        }, 800);
      }
    }
  }, [session.status, session.data, book, chapter, scripture, addVerse, isVerseSelected, hasShownOnboarding]);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('has-seen-onboarding', 'true');
  };

  // When the modal is closed, clear the verse data after a delay
  // to allow for the exit animation to complete.
  useEffect(() => {
    if (!showSpotifyModal) {
      const timer = setTimeout(() => {
        setSpotifySearchVerse(null);
      }, 200); // Should match modal animation duration
      return () => clearTimeout(timer);
    }
  }, [showSpotifyModal]);

  // Debug effect to log modal state changes
  useEffect(() => {
    console.log('Scripture Display - Spotify modal state changed:', { 
      showSpotifyModal, 
      hasVerse: !!spotifySearchVerse,
      verseText: spotifySearchVerse?.text?.substring(0, 50) 
    });
  }, [showSpotifyModal, spotifySearchVerse]);

  // Calculate selected verses for current chapter
  const selectedVersesInChapter = selectedVerses.filter(
    v => v.book === book && v.chapter === chapter
  );

  // Fetch available translations from API.Bible
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        setLoadingTranslations(true);
        const response = await fetch('/api/bible-translations');
        if (response.ok) {
          const data = await response.json();
          // Flatten the grouped translations and remove duplicates
          const allTranslations: any[] = [];
          const seenNames = new Set<string>();
          
          // Add default translation names to the seen set to avoid duplicates
          DEFAULT_TRANSLATIONS.forEach(trans => {
            seenNames.add(trans.name.toLowerCase().trim());
          });
          
          data.forEach((group: any) => {
            group.translations.forEach((trans: any) => {
              const normalizedName = trans.name.toLowerCase().trim();
              // Skip if we've already seen this translation name
              if (!seenNames.has(normalizedName)) {
                seenNames.add(normalizedName);
                allTranslations.push({
                  id: trans.id,
                  name: trans.name,
                  abbreviation: trans.abbreviation,
                  language: group.language.name,
                  type: 'api-bible'
                });
              }
            });
          });
          setTranslations(allTranslations);
        }
      } catch (err) {
        console.error('Failed to fetch translations:', err);
      } finally {
        setLoadingTranslations(false);
      }
    };

    fetchTranslations();
  }, []);

  useEffect(() => {
    const fetchScripture = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;
        let data;
        
        // Check if this is an API.Bible translation
        const selectedTranslation = translations.find(t => t.id === translation) || 
                                  DEFAULT_TRANSLATIONS.find(t => t.id === translation);
        
        if (translation === 'esv') {
          // Use our ESV API route
          response = await fetch(
            `/api/esv?book=${encodeURIComponent(book)}&chapter=${chapter}`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch scripture');
          }
          data = await response.json();
        } else if (selectedTranslation?.type === 'api-bible') {
          // Use API.Bible
          response = await fetch(
            `/api/bible-passage?bibleId=${encodeURIComponent(translation)}&book=${encodeURIComponent(book)}&chapter=${chapter}`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch scripture');
          }
          data = await response.json();
          // Add the translation name from our cached data
          data.translation_name = selectedTranslation.name;
        } else {
          // Use bible-api.com for other translations
          response = await fetch(
            `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${translation}`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch scripture');
          }
          data = await response.json();
        }

        setScripture(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scripture');
      } finally {
        setLoading(false);
      }
    };

    fetchScripture();
  }, [book, chapter, translation]);

  const handleVerseClick = (verse: Verse) => {
    addVerse({
      book,
      chapter,
      verse: verse.verse,
      text: verse.text,
      translation: scripture?.translation_name || 'King James Version',
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    
    // Get all selected verses
    const versesToDrag = selectedVerses.filter(v => v.book === book && v.chapter === chapter);
    
    if (versesToDrag.length === 0) {
      e.preventDefault();
      return;
    }
    
    // Format the verses for drag data
    const formattedVerses = versesToDrag
      .sort((a, b) => a.verse - b.verse)
      .map(v => `[${v.book} ${v.chapter}:${v.verse}] "${v.text}"`)
      .join('\n');
    
    e.dataTransfer.setData('text/plain', formattedVerses);
    e.dataTransfer.setData('application/bible-verses', JSON.stringify(versesToDrag));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleBookSelect = (bookName: string) => {
    // Logic to handle book selection, e.g., load the first chapter of the selected book
    console.log(`Selected book: ${bookName}`);
  };

  // Load verse notes for current chapter
  useEffect(() => {
    const loadVerseNotes = async () => {
      if (!session.data?.user || session.data.user.type === 'guest') return;
      
      try {
        const response = await fetch(
          `/api/verse-notes?book=${encodeURIComponent(book)}&chapter=${chapter}`
        );
        if (response.ok) {
          const notes = await response.json();
          const notesMap: Record<string, any> = {};
          notes.forEach((note: any) => {
            const key = `${note.verseStart}${note.verseEnd ? `-${note.verseEnd}` : ''}`;
            notesMap[key] = note;
          });
          setVerseNotes(notesMap);
        }
      } catch (err) {
        console.error('Failed to load verse notes:', err);
      }
    };

    loadVerseNotes();
  }, [book, chapter, session.data?.user]);

  const handleAddNoteClick = (verse: Verse) => {
    // Check if there's an existing note for this verse
    const noteKey = verse.verse.toString();
    const existing = verseNotes[noteKey];
    
    setSelectedVerseForNote({
      book,
      chapter,
      verse: verse.verse,
      text: verse.text,
      translation: scripture?.translation_name || 'King James Version',
    });
    
    if (existing) {
      setExistingNote({ id: existing.id, content: existing.content });
    } else {
      setExistingNote(null);
    }
    
    setShowNoteDialog(true);
  };

  const handleNoteSaved = () => {
    // Reload verse notes
    const loadVerseNotes = async () => {
      if (!session.data?.user || session.data.user.type === 'guest') return;
      
      try {
        const response = await fetch(
          `/api/verse-notes?book=${encodeURIComponent(book)}&chapter=${chapter}`
        );
        if (response.ok) {
          const notes = await response.json();
          const notesMap: Record<string, any> = {};
          notes.forEach((note: any) => {
            const key = `${note.verseStart}${note.verseEnd ? `-${note.verseEnd}` : ''}`;
            notesMap[key] = note;
          });
          setVerseNotes(notesMap);
        }
      } catch (err) {
        console.error('Failed to reload verse notes:', err);
      }
    };

    loadVerseNotes();
  };

  // Handle long press for mobile
  const handleTouchStart = (e: React.TouchEvent, verse: Verse) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      setMobileMenuVerse(verse);
      setMobileMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowMobileMenu(true);
    }, 500); // 500ms for long press
    
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
    setMobileMenuVerse(null);
  };

  if (loading) {
    return (
      <Card className="p-6 h-full">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 h-full">
        <div className="text-center text-muted-foreground">
          <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Unable to load scripture</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </Card>
    );
  }

  if (!scripture) {
    return (
      <Card className="p-6 h-full">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Select a Book</h2>
          <div className="flex justify-around">
            <div>
              <h3 className="font-semibold mb-2">Old Testament</h3>
              <ul className="space-y-1">
                {BIBLE_BOOKS_DATA.oldTestament.map((book: { name: string; chapters: number }) => (
                  <li key={book.name}>
                    <button className="text-primary hover:underline" onClick={() => handleBookSelect(book.name)}>
                      {book.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">New Testament</h3>
              <ul className="space-y-1">
                {BIBLE_BOOKS_DATA.newTestament.map((book: { name: string; chapters: number }) => (
                  <li key={book.name}>
                    <button className="text-primary hover:underline" onClick={() => handleBookSelect(book.name)}>
                      {book.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Group verses into paragraphs
  // For Psalms and other poetry, use smaller groupings
  const isPoetry = ['Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'].includes(book);
  const versesPerParagraph = isPoetry ? 2 : 4;
  const paragraphs: Verse[][] = [];
  
  if (scripture.verses) {
    for (let i = 0; i < scripture.verses.length; i += versesPerParagraph) {
      paragraphs.push(scripture.verses.slice(i, i + versesPerParagraph));
    }
  }

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col shadow-lg relative overflow-hidden">
        {/* Onboarding tooltip for guest users */}
        <OnboardingTooltip 
          isVisible={showOnboarding}
          onClose={handleCloseOnboarding}
        />
        
        {/* Hide header on mobile - navigation is handled by the tab header */}
        <div className={cn("p-4 sm:p-6 border-b bg-muted/30", isMobile && "hidden")}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <BookOpenIcon className="w-5 h-5 sm:w-6 sm:h-6 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold break-words">{scripture.reference}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {scripture.translation_name || 'King James Version'}
                </p>
              </div>
            </div>
            <Select value={translation} onValueChange={setTranslation}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Select translation" />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh] sm:max-h-[400px]">
                {loadingTranslations ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading translations...</div>
                ) : (
                  <>
                    {/* Show default translations first */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Popular</div>
                    {DEFAULT_TRANSLATIONS.map((trans) => (
                      <SelectItem key={trans.id} value={trans.id}>
                        {trans.name}
                      </SelectItem>
                    ))}
                    
                    {/* Show API.Bible translations (English only) */}
                    {translations.length > 0 && (
                      <>
                        <div className="my-1 h-px bg-border" />
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">More English Translations</div>
                        {translations
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((trans: any) => (
                            <SelectItem key={trans.id} value={trans.id}>
                              <span>{trans.name}</span>
                              {trans.abbreviation && (
                                <span className="ml-2 text-xs text-muted-foreground">({trans.abbreviation})</span>
                              )}
                            </SelectItem>
                          ))}
                      </>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Add mobile translation selector */}
        {isMobile && (
          <div className="p-2 border-b bg-muted/30">
            <Select value={translation} onValueChange={setTranslation}>
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue placeholder="Select translation" />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                {loadingTranslations ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading translations...</div>
                ) : (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Popular</div>
                    {DEFAULT_TRANSLATIONS.map((trans) => (
                      <SelectItem key={trans.id} value={trans.id}>
                        <span className="text-sm">{trans.name}</span>
                      </SelectItem>
                    ))}
                    
                    {translations.length > 0 && (
                      <>
                        <div className="my-1 h-px bg-border" />
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">More Translations</div>
                        {translations
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((trans: any) => (
                            <SelectItem key={trans.id} value={trans.id}>
                              <span className="text-sm">{trans.name}</span>
                            </SelectItem>
                          ))}
                      </>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className={cn(
          "flex-1 overflow-auto bg-background",
          isMobile ? "p-4 pb-20" : "p-4 sm:p-6 lg:p-8"
        )}>
          {/* Mobile hint banner */}
          {isMobile && showMobileHint && (
            <div className="bg-cyan-950/10 dark:bg-[#00e599]/10 border border-cyan-950/20 dark:border-[#00e599]/20 rounded-lg p-3 mb-4 flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm text-cyan-950 dark:text-[#00e599]">
                  <strong>Tip:</strong> Long press on any verse to add notes or search on Spotify
                </p>
              </div>
              <button
                onClick={dismissMobileHint}
                className="text-cyan-950 dark:text-[#00e599] hover:opacity-70"
                aria-label="Dismiss hint"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="max-w-3xl mx-auto">
            {paragraphs.map((paragraph, index) => (
              <div 
                key={index} 
                className={`mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base ${
                  isPoetry ? 'pl-4 border-l-2 border-muted' : ''
                }`}
              >
                {paragraph.map((verse, verseIndex) => {
                  const isSelected = isVerseSelected(book, chapter, verse.verse);
                  const hasNote = !!verseNotes[verse.verse.toString()];
                  const noteContent = verseNotes[verse.verse.toString()]?.content || '';
                  return (
                    <React.Fragment key={verse.verse}>
                      {/* Use ContextMenu for desktop, touch handlers for mobile */}
                      {!isMobile ? (
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            {hasNote ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span 
                                    className={`
                                      group cursor-pointer rounded px-1 -mx-1 transition-all
                                      select-none relative inline
                                      ${isSelected && isDragging ? 'opacity-50' : ''}
                                      ${isSelected ? 'cursor-grab active:cursor-grabbing bg-cyan-300/40 text-cyan-950 dark:bg-[#00e599]/10 dark:text-[#00e599]' : ''}
                                    `}
                                    onClick={(e) => {
                                      // Only handle click if not right-clicking
                                      if (e.button === 0) {
                                        handleVerseClick(verse);
                                      }
                                    }}
                                    onMouseDown={(e) => {
                                      // Reset any stuck state on mouse down
                                      e.currentTarget.style.pointerEvents = '';
                                    }}
                                    draggable={isSelected}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    title={isSelected ? 'Drag to notes editor' : 'Click to select'}
                                  >
                                    <sup className={`
                                      text-[10px] sm:text-xs mr-1 font-bold transition-colors
                                      ${isSelected 
                                        ? 'text-cyan-950 dark:text-[#00e599]' 
                                        : 'text-primary group-hover:text-primary/80'
                                      }
                                    `}>
                                      {verse.verse}
                                    </sup>
                                    <span className={`
                                      transition-colors text-sm sm:text-base
                                      ${!isSelected && 'text-foreground/90 group-hover:text-foreground hover:bg-primary/10'}
                                    `}>
                                      {verse.text}
                                    </span>
                                    <StickyNote className="inline-block w-3 h-3 ml-1 text-cyan-950 dark:text-[#00e599]" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent 
                                  className="max-w-xs bg-popover/95 backdrop-blur-sm border-2"
                                  side="top"
                                  sideOffset={5}
                                >
                                  <div className="space-y-2">
                                    <div className="font-semibold text-sm">
                                      {book} {chapter}:{verse.verse}
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap">
                                      {noteContent}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddNoteClick(verse);
                                      }}
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Edit note
                                    </button>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span 
                                className={`
                                  group cursor-pointer rounded px-1 -mx-1 transition-all
                                  select-none relative inline
                                  ${isSelected && isDragging ? 'opacity-50' : ''}
                                  ${isSelected ? 'cursor-grab active:cursor-grabbing bg-cyan-300/40 text-cyan-950 dark:bg-[#00e599]/10 dark:text-[#00e599]' : ''}
                                `}
                                onClick={(e) => {
                                  // Only handle click if not right-clicking
                                  if (e.button === 0) {
                                    handleVerseClick(verse);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  // Reset any stuck state on mouse down
                                  e.currentTarget.style.pointerEvents = '';
                                }}
                                draggable={isSelected}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                title={isSelected ? 'Drag to notes editor' : 'Click to select'}
                              >
                                <sup className={`
                                  text-[10px] sm:text-xs mr-1 font-bold transition-colors
                                  ${isSelected 
                                    ? 'text-cyan-950 dark:text-[#00e599]' 
                                    : 'text-primary group-hover:text-primary/80'
                                  }
                                `}>
                                  {verse.verse}
                                </sup>
                                <span className={`
                                  transition-colors text-sm sm:text-base
                                  ${!isSelected && 'text-foreground/90 group-hover:text-foreground hover:bg-primary/10'}
                                `}>
                                  {verse.text}
                                </span>
                              </span>
                            )}
                          </ContextMenuTrigger>
                          <ContextMenuContent 
                            className="w-48 z-[100]"
                            onCloseAutoFocus={(e) => {
                              // Prevent the context menu from stealing focus
                              e.preventDefault();
                            }}
                            onInteractOutside={() => {
                              // Ensure we can interact with verses again
                              setTimeout(() => {
                                // Force all verse elements to be interactive again
                                const verseElements = document.querySelectorAll('[title*="Click to select"], [title*="Drag to notes"]');
                                verseElements.forEach(el => {
                                  (el as HTMLElement).style.pointerEvents = '';
                                });
                              }, 0);
                            }}
                          >
                            <ContextMenuItem 
                              onClick={() => {
                                handleVerseClick(verse);
                              }}
                              className="gap-2 text-sm cursor-pointer"
                            >
                              {isSelected ? 'Deselect' : 'Select'} Verse
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => {
                                // Close context menu first
                                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                                // Small delay to ensure context menu is closed
                                setTimeout(() => {
                                  handleAddNoteClick(verse);
                                }, 50);
                              }}
                              className="gap-2 text-sm cursor-pointer"
                            >
                              <StickyNote className="h-4 w-4 text-cyan-950 dark:text-[#00e599]" />
                              {hasNote ? 'View Note' : 'Add Note'}
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => {
                                console.log('Spotify menu item clicked');
                                // Close context menu first
                                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                                // Small delay to ensure context menu is closed
                                setTimeout(() => {
                                  setSpotifySearchVerse(verse);
                                  setShowSpotifyModal(true);
                                }, 50);
                              }}
                              className="gap-2 text-sm cursor-pointer"
                            >
                              <SpotifyIcon size={16} />
                              Search on Spotify
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ) : (
                        // Mobile version with touch handlers
                        <span 
                          className={`
                            group cursor-pointer rounded px-1 -mx-1 transition-all
                            select-none relative inline
                            touch-manipulation
                            active:scale-95 active:transition-transform
                            ${isSelected && isDragging ? 'opacity-50' : ''}
                            ${isSelected ? 'bg-cyan-300/40 text-cyan-950 dark:bg-[#00e599]/10 dark:text-[#00e599]' : ''}
                          `}
                          onClick={() => handleVerseClick(verse)}
                          onTouchStart={(e) => handleTouchStart(e, verse)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchMove}
                          title="Tap to select, hold for options"
                        >
                          <sup className={`
                            text-[10px] sm:text-xs mr-1 font-bold transition-colors
                            ${isSelected 
                              ? 'text-cyan-950 dark:text-[#00e599]' 
                              : 'text-primary'
                            }
                          `}>
                            {verse.verse}
                          </sup>
                          <span className={`
                            transition-colors text-sm sm:text-base
                            ${!isSelected && 'text-foreground/90'}
                          `}>
                            {verse.text}
                          </span>
                          {hasNote && (
                            <StickyNote className="inline-block w-3 h-3 ml-1 text-cyan-950 dark:text-[#00e599]" />
                          )}
                        </span>
                      )}
                      {verseIndex < paragraph.length - 1 && ' '}
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      <SpotifySearchModal 
        open={showSpotifyModal}
        onOpenChange={(open) => {
          setShowSpotifyModal(open);
          if (!open) {
            // Force cleanup when dialog closes
            setTimeout(() => {
              // Remove any lingering overlays
              const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
              overlays.forEach(overlay => overlay.remove());
              
              // Reset body styles that might have been set
              document.body.style.pointerEvents = '';
              document.body.style.overflow = '';
              
              // Force focus back to body
              document.body.focus();
              
              // Ensure all interactive elements are clickable
              const interactiveElements = document.querySelectorAll('button, a, [role="button"], [tabindex], input, textarea, select');
              interactiveElements.forEach(el => {
                (el as HTMLElement).style.pointerEvents = '';
              });
            }, 100);
          }
        }}
        verses={spotifySearchVerse ? [{
          book,
          chapter,
          verse: spotifySearchVerse.verse,
          text: spotifySearchVerse.text,
          translation: scripture?.translation_name || 'King James Version',
        }] : undefined}
      />
      
      <VerseNoteDialog
        open={showNoteDialog}
        onOpenChange={(open) => {
          setShowNoteDialog(open);
          if (!open) {
            // Force cleanup when dialog closes
            setTimeout(() => {
              // Remove any lingering overlays
              const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
              overlays.forEach(overlay => overlay.remove());
              
              // Reset body styles that might have been set
              document.body.style.pointerEvents = '';
              document.body.style.overflow = '';
              
              // Force focus back to body
              document.body.focus();
              
              // Ensure all interactive elements are clickable
              const interactiveElements = document.querySelectorAll('button, a, [role="button"], [tabindex], input, textarea, select');
              interactiveElements.forEach(el => {
                (el as HTMLElement).style.pointerEvents = '';
              });
            }, 100);
          }
        }}
        verse={selectedVerseForNote}
        existingNote={existingNote}
        onNoteSaved={handleNoteSaved}
      />
      
      {/* Mobile Long Press Menu */}
      {showMobileMenu && mobileMenuVerse && (
        <>
          {/* Backdrop to close menu when tapping outside */}
          <div 
            className="fixed inset-0 z-[200]" 
            onClick={closeMobileMenu}
          />
          {/* Menu */}
          <div 
            className="fixed z-[201] bg-background border rounded-lg shadow-lg p-1 min-w-[200px]"
            style={{
              left: `${Math.min(mobileMenuPosition.x, window.innerWidth - 220)}px`,
              top: `${Math.min(mobileMenuPosition.y, window.innerHeight - 150)}px`,
            }}
          >
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
              onClick={() => {
                const verse = mobileMenuVerse;
                const isSelected = isVerseSelected(book, chapter, verse.verse);
                handleVerseClick(verse);
                closeMobileMenu();
              }}
            >
              {isVerseSelected(book, chapter, mobileMenuVerse.verse) ? 'Deselect' : 'Select'} Verse
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
              onClick={() => {
                handleAddNoteClick(mobileMenuVerse);
                closeMobileMenu();
              }}
            >
              <StickyNote className="h-4 w-4 text-cyan-950 dark:text-[#00e599]" />
              {verseNotes[mobileMenuVerse.verse.toString()] ? 'View Note' : 'Add Note'}
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
              onClick={() => {
                setSpotifySearchVerse(mobileMenuVerse);
                setShowSpotifyModal(true);
                closeMobileMenu();
              }}
            >
              <SpotifyIcon size={16} />
              Search on Spotify
            </button>
          </div>
        </>
      )}
    </TooltipProvider>
  );
} 