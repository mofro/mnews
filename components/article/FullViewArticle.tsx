"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Share2, Eye, EyeOff, Archive, ArchiveRestore, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Portal } from "@/components/ui/Portal";
import { cn } from "@/lib/utils";
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

function FullViewArticleComponent({
  article: initialArticle,
  onClose,
  onToggleRead,
  onToggleArchive,
  onShare,
  className,
}: FullViewArticleProps) {
  const [isClient, setIsClient] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageError, setIsImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Get the first available content source
  const content = useMemo(() => {
    return initialArticle.cleanContent || 
           initialArticle.content || 
           initialArticle.rawContent || 
           '';
  }, [initialArticle]);

  // Process content with basic sanitization
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    try {
      return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'strong', 'em', 'br'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel']
      });
    } catch (error) {
      console.error('Error sanitizing content:', error);
      return content;
    }
  }, [content]);

  // Format date safely
  const formattedDate = useMemo(() => {
    try {
      if (!initialArticle.publishDate) return '';
      const date = new Date(initialArticle.publishDate);
      return isNaN(date.getTime()) ? '' : format(date, 'MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }, [initialArticle.publishDate]);

  // Don't render on server
  if (!isClient) return null;

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
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
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {initialArticle.title}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {initialArticle.url && (
                <a
                  href={initialArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label="Open original article"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              )}
              {onShare && (
                <button
                  onClick={() => onShare(initialArticle.id)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label="Share article"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              )}
              {onToggleRead && (
                <button
                  onClick={() => onToggleRead(initialArticle.id)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label={initialArticle.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {initialArticle.isRead ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              )}
              {onToggleArchive && (
                <button
                  onClick={() => onToggleArchive(initialArticle.id)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label={initialArticle.isArchived ? 'Unarchive article' : 'Archive article'}
                >
                  {initialArticle.isArchived ? (
                    <ArchiveRestore className="h-5 w-5" />
                  ) : (
                    <Archive className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Meta */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {initialArticle.title}
              </h1>
              
              {(initialArticle.sender || formattedDate) && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4 mb-4">
                  {initialArticle.sender && (
                    <span>{initialArticle.sender}</span>
                  )}
                  {formattedDate && (
                    <span>{formattedDate}</span>
                  )}
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
                    className={`w-full h-full object-cover transition-opacity ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => {
                      setIsImageLoading(false);
                      setIsImageError(true);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Article content */}
            {processedContent ? (
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>No content available for this article.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex justify-between items-center">
              <div>
                {initialArticle.tags && initialArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {initialArticle.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={onClose}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Custom comparison function for React.memo
function areEqual(prevProps: FullViewArticleProps, nextProps: FullViewArticleProps) {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.article.isRead === nextProps.article.isRead &&
    prevProps.article.isArchived === nextProps.article.isArchived
  );
}

// Memoize the component with custom comparison
const FullViewArticle = React.memo(FullViewArticleComponent, areEqual);

export default FullViewArticle;
