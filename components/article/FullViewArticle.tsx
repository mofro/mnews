"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Share2, Eye, EyeOff, Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import DOMPurify from 'dompurify';

interface BaseArticle {
  id: string;
  title: string;
  content?: string | null;
  publishDate: string;
  sender?: string;
  tags?: string[];
  imageUrl?: string;
  isRead?: boolean;
  isArchived?: boolean;
  rawContent?: string | null;
  cleanContent?: string | null;
  url?: string;
}

interface FullViewArticleProps {
  article: BaseArticle;
  onClose: () => void;
  onToggleRead?: (articleId: string) => void;
  onToggleArchive?: (articleId: string) => void;
  onShare?: (articleId: string) => void;
  className?: string;
}

const FullViewArticleComponent: React.FC<FullViewArticleProps> = ({
  article: initialArticle,
  onClose,
  onToggleRead,
  onToggleArchive,
  onShare,
  className,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageError, setIsImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<BaseArticle>(initialArticle);
  const modalRef = useRef<HTMLDivElement>(null);

  // Set client-side flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle click outside to close modal
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Fetch full article content if needed
  const fetchFullArticle = useCallback(async () => {
    try {
      // Check if we already have meaningful content
      const hasRealContent = 
        (article.content && article.content.length > 30) ||
        (article.cleanContent && article.cleanContent.length > 30) ||
        (article.rawContent && article.rawContent.length > 30);
      
      if (hasRealContent) {
        console.log('[FullViewArticle] Skipping fetch - already have content');
        return;
      }
      
      console.log('[FullViewArticle] Fetching full article content...');
      const response = await fetch(`/api/newsletters/${article.id}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FullViewArticle] Failed to load article content:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to load article content: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[FullViewArticle] Received article data:', {
        id: data.id,
        hasContent: !!data.content,
        hasCleanContent: !!data.cleanContent,
        hasRawContent: !!data.rawContent,
        contentLength: data.content?.length || 0,
        cleanContentLength: data.cleanContent?.length || 0,
        rawContentLength: data.rawContent?.length || 0,
        keys: Object.keys(data)
      });

      setArticle(prev => ({
        ...prev,
        content: data.content || prev.content,
        cleanContent: data.cleanContent || prev.cleanContent,
        rawContent: data.rawContent || prev.rawContent
      }));
    } catch (err) {
      console.error('Error fetching article content:', err);
      setError('Failed to load article content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [article.id, article.content, article.cleanContent, article.rawContent]);

  // Trigger content fetch when needed
  useEffect(() => {
    fetchFullArticle();
  }, [fetchFullArticle]);

  // Sanitize content for safe rendering
  const sanitizedContent = useMemo(() => {
    try {
      // Debug log the content we're working with
      console.log('[FullViewArticle] Processing content for article:', {
        hasContent: !!article.content,
        hasCleanContent: !!article.cleanContent,
        hasRawContent: !!article.rawContent,
        contentLength: article.content?.length || 0,
        cleanContentLength: article.cleanContent?.length || 0,
        rawContentLength: article.rawContent?.length || 0,
        contentSample: article.content ? article.content.substring(0, 100) + '...' : null
      });
      
      // Try content fields in order of preference
      let contentToUse = article.content || article.cleanContent || article.rawContent || '';
      
      if (!contentToUse) {
        console.log('[FullViewArticle] No content available for article');
        return '<p>No content available</p>';
      }

      // Remove tracking pixels and other unwanted elements
      const cleanedContent = contentToUse
        .replace(/<img[^>]*width="1"[^>]*height="1"[^>]*>/gi, '') // Remove tracking pixels
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<\?[^>]*>/g, '') // Remove PHP tags
        .replace(/<meta[^>]*>/g, '') // Remove meta tags
        .replace(/<link[^>]*>/g, '') // Remove link tags
        .replace(/<\/div>\s*<div[^>]*>/gi, '</div>\n<div>') // Add newlines between divs
        .replace(/<\/p>\s*<p[^>]*>/gi, '</p>\n<p>') // Add newlines between paragraphs
        .replace(/<br\s*\/?>/gi, '<br>') // Normalize line breaks
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\s*([<>])\s*/g, '$1') // Remove spaces around tags
        .trim();

      // Sanitize the content with a more permissive policy
      const sanitized = DOMPurify.sanitize(cleanedContent, {
        ALLOWED_TAGS: [
          'p', 'div', 'span', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr',
          'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'figure', 'figcaption'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'target', 'rel', 'class', 'id', 'style',
          'src', 'alt', 'width', 'height', 'border', 'colspan', 'rowspan',
          'cellspacing', 'cellpadding', 'align', 'valign', 'bgcolor'
        ],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
        FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout', 'style']
      });

      console.log('[FullViewArticle] Sanitized content length:', sanitized.length);
      
      // Wrap in a container div for styling
      return sanitized 
        ? `<div class="email-content">${sanitized}</div>` 
        : '<p>No content available</p>';
        
    } catch (error) {
      console.error('Error processing content:', error);
      return '<p>Error loading content</p>';
    }
  }, [article.content, article.cleanContent, article.rawContent]);

  // Format the publish date with error handling
  const formattedDate = useMemo((): string => {
    try {
      if (!initialArticle.publishDate) return 'Unknown date';
      const date = new Date(initialArticle.publishDate);
      return isNaN(date.getTime()) ? 'Unknown date' : format(date, 'MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  }, [initialArticle.publishDate]);

  // Don't render on server
  if (!isClient) return null;

  return (
    <Portal>
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto",
          "flex items-center justify-center p-4",
          className
        )}
        onClick={handleBackdropClick}
      >
        <div 
          ref={modalRef}
          className={cn(
            'bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {initialArticle.title}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {onToggleRead && (
                <button
                  onClick={() => onToggleRead(initialArticle.id)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label={initialArticle.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {initialArticle.isRead ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              )}
              {onToggleArchive && (
                <button
                  onClick={() => onToggleArchive(initialArticle.id)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label={initialArticle.isArchived ? 'Unarchive' : 'Archive'}
                >
                  {initialArticle.isArchived ? (
                    <ArchiveRestore className="h-5 w-5" />
                  ) : (
                    <Archive className="h-5 w-5" />
                  )}
                </button>
              )}
              {onShare && (
                <button
                  onClick={() => onShare(initialArticle.id)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label="Share"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Meta */}
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {initialArticle.title}
              </h1>
              
              {(initialArticle.sender || formattedDate) && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4 mb-4">
                  {initialArticle.sender && (
                    <span>{initialArticle.sender}</span>
                  )}
                  <span>{formattedDate}</span>
                </div>
              )}

              {initialArticle.imageUrl && !isImageError && (
                <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800">
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  )}
                  <img
                    src={initialArticle.imageUrl}
                    alt={initialArticle.title}
                    className={`w-full h-full object-cover transition-opacity duration-200 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => {
                      setIsImageLoading(false);
                      setIsImageError(true);
                    }}
                  />
                </div>
              )}

              {/* Article content */}
              <div className="prose max-w-none prose-headings:font-medium prose-p:leading-relaxed dark:prose-invert">
                <div 
                  className="newsletter-content"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
                
                {/* Debug info in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 rounded">
                    <h4 className="font-bold mb-2">Debug Info:</h4>
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify({
                        hasContent: !!article.content,
                        hasCleanContent: !!article.cleanContent,
                        hasRawContent: !!article.rawContent,
                        contentLength: article.content?.length || 0,
                        cleanContentLength: article.cleanContent?.length || 0,
                        rawContentLength: article.rawContent?.length || 0,
                        sanitizedContentLength: sanitizedContent?.length || 0,
                        contentSample: article.content ? 
                          article.content.substring(0, 100) + '...' : 
                          null
                      }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <style jsx={true} global={true}>{`
                .newsletter-content {
                  word-break: break-word;
                  hyphens: auto;
                }
                .newsletter-content img {
                  max-width: 100%;
                  height: auto;
                  margin: 1rem 0;
                }
                .newsletter-content iframe {
                  max-width: 100%;
                  border: none;
                }
                .newsletter-content table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1rem 0;
                }
                .newsletter-content th,
                .newsletter-content td {
                  border: 1px solid #e5e7eb;
                  padding: 0.5rem;
                }
                .dark .newsletter-content th,
                .dark .newsletter-content td {
                  border-color: #374151;
                }
              `}</style>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex justify-between items-center">
              <div>
                {initialArticle.tags && initialArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {initialArticle.tags.map((tag: string, index: number) => (
                      <span 
                        key={`${tag}-${index}`}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Memoize the component to prevent unnecessary re-renders
const areEqual = (prevProps: Readonly<FullViewArticleProps>, nextProps: Readonly<FullViewArticleProps>): boolean => {
  return prevProps.article.id === nextProps.article.id &&
         prevProps.article.isRead === nextProps.article.isRead &&
         prevProps.article.isArchived === nextProps.article.isArchived;
};

const FullViewArticle = React.memo(FullViewArticleComponent, areEqual);

export default FullViewArticle;
