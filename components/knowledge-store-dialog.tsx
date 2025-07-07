'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { upload } from '@vercel/blob/client';

interface KnowledgeStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultTab?: 'text' | 'url' | 'file';
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'text/rtf': '.rtf',
  'text/csv': '.csv',
  'text/markdown': '.md',
  'text/html': '.html',
};

export function KnowledgeStoreDialog({ open, onOpenChange, onSuccess, defaultTab = 'text' }: KnowledgeStoreDialogProps) {
  const [type, setType] = useState<'text' | 'url' | 'file'>('text');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'url' | 'file'>(defaultTab);
  const [urlToScrape, setUrlToScrape] = useState('');
  const [scrapeOptions, setScrapeOptions] = useState({
    includeChildPages: true,
    maxDepth: 1,
    maxPages: 5,
  });

  // Reset tab when dialog opens with new defaultTab
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const handleTextSubmit = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error('Please provide both name and content');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/knowledge-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          type: 'text',
          content: content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      toast.success('Knowledge saved successfully');
      setName('');
      setContent('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save knowledge');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = 500 * 1024 * 1024; // 500MB limit (Vercel Blob limit)
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`File size (${sizeMB}MB) exceeds the 500MB limit. Please use a smaller file.`);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const maxSize = 500 * 1024 * 1024; // 500MB limit (Vercel Blob limit)
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`File size (${sizeMB}MB) exceeds the 500MB limit. Please use a smaller file.`);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      // Use the original filename or the custom name if provided
      const filename = name || selectedFile.name;
      
      // Upload directly to Vercel Blob
      const blob = await upload(filename, selectedFile, {
        access: 'public',
        handleUploadUrl: '/api/knowledge-store/blob-upload',
      });

      console.log('Blob upload response:', blob);
      
      // Verify the blob was uploaded successfully
      if (!blob || !blob.url) {
        throw new Error('Upload failed - no URL returned');
      }

      // On localhost, we need to manually process the file
      // since the onUploadCompleted callback doesn't work without ngrok
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.startsWith('192.168.') ||
         window.location.hostname.startsWith('10.'));
         
      if (isLocalhost) {
        console.log('Processing upload on localhost...');
        
        const processResponse = await fetch('/api/knowledge-store/process-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blobUrl: blob.url,
            filename: filename,
            contentType: selectedFile.type,
            fileSize: selectedFile.size,
            pathname: blob.pathname,
          }),
        });

        if (!processResponse.ok) {
          const error = await processResponse.json();
          throw new Error(error.error || 'Failed to process upload');
        }
      }

      toast.success('File uploaded successfully');
      setSelectedFile(null);
      setName('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlToScrape.trim()) {
      toast.error('Please provide a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlToScrape);
    } catch {
      toast.error('Please provide a valid URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/knowledge-store/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToScrape,
          options: scrapeOptions.includeChildPages ? {
            maxDepth: scrapeOptions.maxDepth,
            maxPages: scrapeOptions.maxPages,
          } : {
            maxDepth: 0,
            maxPages: 1,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scrape URL');
      }

      const result = await response.json();
      toast.success(`Successfully scraped ${result.pagesScraped} page${result.pagesScraped > 1 ? 's' : ''}`);
      setUrlToScrape('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scrape URL');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    switch (activeTab) {
      case 'text':
        handleTextSubmit();
        break;
      case 'url':
        handleUrlSubmit();
        break;
      case 'file':
        handleFileUpload();
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add to Knowledge Store</DialogTitle>
          <DialogDescription>
            Add documents, text, or web content to your knowledge store. You can reference these in your chats.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'url' | 'file')} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Meeting Notes, Recipe, etc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your text content here..."
                className="min-h-[200px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={urlToScrape}
                onChange={(e) => setUrlToScrape(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                We&apos;ll extract the content from this webpage for you.
              </p>
            </div>

            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-child-pages"
                  checked={scrapeOptions.includeChildPages}
                  onChange={(e) => 
                    setScrapeOptions(prev => ({ ...prev, includeChildPages: e.target.checked }))
                  }
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label 
                  htmlFor="include-child-pages" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Include linked pages from the same domain
                </Label>
              </div>

              {scrapeOptions.includeChildPages && (
                <div className="space-y-4 ml-6">
                  <div className="space-y-2">
                    <Label htmlFor="max-depth" className="text-sm">
                      Max depth: {scrapeOptions.maxDepth}
                    </Label>
                    <input
                      id="max-depth"
                      type="range"
                      value={scrapeOptions.maxDepth}
                      onChange={(e) => 
                        setScrapeOptions(prev => ({ ...prev, maxDepth: parseInt(e.target.value) }))
                      }
                      max={3}
                      min={1}
                      step={1}
                      disabled={loading}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      How many levels deep to follow links
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-pages" className="text-sm">
                      Max pages: {scrapeOptions.maxPages}
                    </Label>
                    <input
                      id="max-pages"
                      type="range"
                      value={scrapeOptions.maxPages}
                      onChange={(e) => 
                        setScrapeOptions(prev => ({ ...prev, maxPages: parseInt(e.target.value) }))
                      }
                      max={20}
                      min={1}
                      step={1}
                      disabled={loading}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of pages to scrape
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Scraping may take a few moments depending on the website size and settings.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                loading && "opacity-50 cursor-not-allowed"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !loading && document.getElementById('file-upload')?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                {selectedFile ? selectedFile.name : 'Drop a file here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOCX, TXT, RTF, CSV, MD, HTML (Max 500MB via Vercel Blob)
              </p>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.rtf,.csv,.md,.html"
                onChange={handleFileSelect}
                disabled={loading}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleFormSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Processing...' : 'Add to Knowledge Store'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 