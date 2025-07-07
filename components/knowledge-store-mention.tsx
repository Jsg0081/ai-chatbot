'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileTextIcon, LinkIcon } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  name: string;
  type: 'document' | 'url' | 'text';
}

interface KnowledgeStoreMentionProps {
  onSelect: (item: KnowledgeItem) => void;
  searchQuery: string;
  onClose: () => void;
}

export function KnowledgeStoreMention({
  onSelect,
  searchQuery,
  onClose
}: KnowledgeStoreMentionProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/knowledge-store/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await response.json();
        setItems(data);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Failed to fetch knowledge items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          onSelect(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect, onClose]);

  if (loading) {
    return (
      <div className="w-full bg-background border border-border rounded-lg shadow-lg p-3">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full bg-background border border-border rounded-lg shadow-lg p-3">
        <div className="text-sm text-muted-foreground">No items found</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={item.id}
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left",
            selectedIndex === index && "bg-muted"
          )}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {item.type === 'document' ? (
            <FileTextIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : item.type === 'url' ? (
            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <FileTextIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm truncate">{item.name}</span>
        </button>
      ))}
    </div>
  );
} 