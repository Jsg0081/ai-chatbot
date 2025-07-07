'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Link,
  FileText,
  Text,
  MoreHorizontal,
  Globe,
  FileIcon,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { KnowledgeStoreDialog } from '@/components/knowledge-store-dialog';

interface KnowledgeItem {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url';
  size: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  content: string | null;
  url: string | null;
  fileData: any;
}

export default function KnowledgeStorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'text' | 'file' | 'url'>('text');
  const { data: session } = useSession();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/knowledge-store');
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load knowledge store items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-store?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      
      toast.success('Item deleted successfully');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: KnowledgeItem['type']) => {
    switch (type) {
      case 'file':
        return <FileIcon className="h-4 w-4 mr-2 text-muted-foreground" />;
      case 'text':
        return <Text className="h-4 w-4 mr-2 text-muted-foreground" />;
      case 'url':
        return <Globe className="h-4 w-4 mr-2 text-muted-foreground" />;
    }
  };

  // Calculate total storage used
  const totalStorage = items.reduce((acc, item) => {
    if (item.size) {
      const sizeMatch = item.size.match(/^([\d.]+)\s*([A-Za-z]+)$/);
      if (sizeMatch) {
        const [, value, unit] = sizeMatch;
        const numValue = parseFloat(value);
        let bytesValue = 0;
        
        switch (unit.toLowerCase()) {
          case 'kb':
            bytesValue = numValue * 1024;
            break;
          case 'mb':
            bytesValue = numValue * 1024 * 1024;
            break;
          case 'gb':
            bytesValue = numValue * 1024 * 1024 * 1024;
            break;
          default:
            bytesValue = numValue;
        }
        
        return acc + bytesValue;
      }
    }
    return acc;
  }, 0);

  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-semibold">Knowledge Base</h1>
            <div className="text-sm text-muted-foreground">
              <span className="inline-flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                RAG Storage: {formatStorageSize(totalStorage)} / 104.9 MB
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              size="sm"
              onClick={() => {
                setSelectedTab('text');
                setDialogOpen(true);
              }}
            >
              <Text className="h-4 w-4 mr-2" />
              Add Text
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTab('file');
                setDialogOpen(true);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTab('url');
                setDialogOpen(true);
              }}
            >
              <Globe className="h-4 w-4 mr-2" />
              Add URL
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search Knowledge Base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Text className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No items found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Start by adding URLs, files, or text to your knowledge base'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b sticky top-0 bg-background">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-sm">
                    <button className="flex items-center gap-1 hover:text-foreground text-muted-foreground">
                      + Type
                    </button>
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-sm text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-sm text-muted-foreground">
                    Created by
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-sm text-muted-foreground">
                    Last updated ↓
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-6">
                      <div className="flex items-center">
                        {getIcon(item.type)}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.size && (
                          <span className="text-xs text-muted-foreground">
                            {item.size}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm">
                      {session?.user?.email || 'Unknown'}
                    </td>
                    <td className="py-3 px-6 text-sm">
                      {format(new Date(item.updatedAt), 'MMM dd, yyyy, h:mm a')}
                    </td>
                    <td className="py-3 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={async () => {
                              if (item.type === 'file' && item.url) {
                                // Get public URL for file
                                try {
                                  const response = await fetch(`/api/knowledge-store/${item.id}/public-url`);
                                  if (response.ok) {
                                    const { url } = await response.json();
                                    window.open(url, '_blank');
                                  } else {
                                    window.open(item.url, '_blank');
                                  }
                                } catch {
                                  window.open(item.url, '_blank');
                                }
                              } else if (item.type === 'url' && item.url) {
                                window.open(item.url, '_blank');
                              } else {
                                toast.info('Text content can only be viewed in chat');
                              }
                            }}
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toast.info('Edit functionality coming soon')}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              if (item.type === 'file' && item.url) {
                                try {
                                  const response = await fetch(`/api/knowledge-store/${item.id}/public-url`);
                                  if (response.ok) {
                                    const { url } = await response.json();
                                    // Create a download link
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = item.name;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }
                                } catch {
                                  toast.error('Failed to download file');
                                }
                              } else {
                                toast.info('Only files can be downloaded');
                              }
                            }}
                          >
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <KnowledgeStoreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchItems}
        defaultTab={selectedTab}
      />
    </>
  );
} 