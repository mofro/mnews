"use client";

import { 
  X, 
  Share2, 
  Eye, 
  EyeOff, 
  Archive, 
  ArchiveRestore, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  FileText 
} from 'lucide-react';
import { Portal } from "@/components/ui/Portal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import DOMPurify from "dompurify";

interface BaseArticle {
  id: string;
  title: string;
  content: string;
  publishDate: string;
  sender?: string;
  tags?: string[];
  imageUrl?: string;
  isRead?: boolean;
  isArchived?: boolean;
  rawContent?: string;
  cleanContent?: string;
}

interface ArticleState extends BaseArticle {
  isLoading: boolean;
  error: Error | null;
}

interface FullViewArticleProps {
  article: BaseArticle;
  onClose: () => void;
  onToggleRead?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onShare?: (id: string) => void;
  className?: string;
}

export function FullViewArticle({
  article: articleProp,
  onClose,
  onToggleRead,
  onToggleArchive,
  onShare,
  className,
}: FullViewArticleProps) {
  const [article, setArticle] = useState<ArticleState>({
    ...articleProp,
    isLoading: true, // Start in loading state
    error: null,
  });

  // Track if we've already fetched content to prevent duplicate fetches
  const hasFetchedRef = useRef(false);

  // Function to fetch full article content
  const fetchFullContent = useCallback(async () => {
    console.log(`Fetching full content for article: ${article.id}`);
    setArticle(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(`/api/articles/${article.id}?t=${Date.now()}&_=${Math.random().toString(36).substring(2)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to load article (${response.status}): ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load article');
      }
      
      console.log('Received article data:', { 
        hasContent: !!(result.content || result.rawContent || result.cleanContent),
        contentLength: result.content?.length || 0,
        rawContentLength: result.rawContent?.length || 0,
        cleanContentLength: result.cleanContent?.length || 0
      });
      
      // Update with received data, falling back to existing values if not provided
      setArticle(prev => ({
        ...prev,
        content: result.content || prev.content || '',
        rawContent: result.rawContent || prev.rawContent || '',
        cleanContent: result.cleanContent || prev.cleanContent || '',
        title: result.title || prev.title || 'Untitled Article',
        sender: result.sender || prev.sender || 'Unknown Sender',
        publishDate: result.publishDate || prev.publishDate || new Date().toISOString(),
        imageUrl: result.imageUrl || prev.imageUrl,
        tags: result.tags || prev.tags || [],
        isLoading: false,
        error: null
      }));
      
      hasFetchedRef.current = true;
      
    } catch (error) {
      console.error('Error in fetchFullContent:', error);
      setArticle(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load article content')
      }));
    }
  }, [article.id]);

  // Fetch full article content when component mounts or article ID changes
  useEffect(() => {
    // Skip if already fetched
    if (hasFetchedRef.current) return;
    
    // Always fetch fresh content when the article ID changes
    fetchFullContent();
    
    // Cleanup function to reset the ref when component unmounts or ID changes
    return () => {
      hasFetchedRef.current = false;
    };
  }, [article.id, fetchFullContent]);
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Debug log the incoming article data
  useEffect(() => {
    console.log('FullViewArticle received article:', {
      id: article.id,
      title: article.title,
      contentLength: article.content?.length,
      hasContent: !!article.content,
      contentSample: article.content?.substring(0, 50) + '...',
      publishDate: article.publishDate,
      sender: article.sender,
      tags: article.tags,
      imageUrl: article.imageUrl,
      isRead: article.isRead,
      isArchived: article.isArchived
    });
  }, [article]);

  // Process and sanitize the content
  const processedContent = useMemo(() => {
    try {
      // Determine the best content source with priority: content > rawContent > cleanContent
      let contentToProcess = '';
      
      if (typeof article.content === 'string' && article.content.trim()) {
        contentToProcess = article.content;
      } else if (typeof article.rawContent === 'string' && article.rawContent.trim()) {
        contentToProcess = article.rawContent;
      } else if (typeof article.cleanContent === 'string' && article.cleanContent.trim()) {
        contentToProcess = article.cleanContent;
      }
      
      // If there's no content, return a message
      if (!contentToProcess.trim()) {
        return '<p>No content available for this article.</p>';
      }
      
      // Basic content cleaning before sanitization
      const processed = contentToProcess
        // Replace common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Remove empty paragraphs and divs
        .replace(/<p[^>]*>\s*<\/p>/g, '')
        .replace(/<div[^>]*>\s*<\/div>/g, '');

      // Sanitize the content with more permissive settings
      const sanitized = DOMPurify.sanitize(processed, {
        ALLOWED_TAGS: [
          'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'code', 'pre',
          'a', 'ul', 'ol', 'li', 'img', 'br', 'hr',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span', 'style', 'iframe'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'class', 'style',
          'width', 'height', 'border', 'align', 'valign',
          'colspan', 'rowspan', 'target', 'rel',
          'allowfullscreen', 'frameborder', 'allow', 'sandbox', 'loading'
        ],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: true
      });

      // Post-process the sanitized content
      const processedContent = sanitized
        // Ensure images have proper attributes
        .replace(/<img([^>]*)>/gi, (img, attrs) => {
          if (!/loading=(['"])/i.test(attrs)) {
            attrs = ` loading="lazy"${attrs}`;
          }
          if (!/alt=(['"])/i.test(attrs)) {
            attrs = ` alt=""${attrs}`;
          }
          return `<img${attrs}>`;
        })
        // Ensure external links open in new tab
        .replace(/<a(\s+[^>]*)>/gi, (_, attrs) => {
          if (!/target=(['"])/i.test(attrs)) {
            attrs = ` target="_blank"${attrs}`;
          }
          if (!/rel=(['"])/i.test(attrs)) {
            attrs = ` rel="noopener noreferrer"${attrs}`;
          }
          return `<a${attrs}>`;
        });

      // Wrap in a container with basic styling
      return `
        <div class="article-content">
          ${processedContent}
        </div>
        <style>
          .article-content {
            line-height: 1.6;
            color: #333;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          }
          .article-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1rem 0;
          }
          .article-content a {
            color: #2563eb;
            text-decoration: none;
          }
          .article-content a:hover {
            text-decoration: underline;
          }
          .article-content pre, .article-content code {
            background: #f5f5f5;
            border-radius: 4px;
            padding: 0.2em 0.4em;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.9em;
          }
          .article-content pre {
            padding: 1em;
            overflow-x: auto;
          }
          .article-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
          }
          .article-content th, .article-content td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          .article-content th {
            background-color: #f5f5f5;
          }
          .article-content iframe {
            max-width: 100%;
            margin: 1rem 0;
            border: none;
            border-radius: 8px;
          }
        </style>
      `;
    } catch (error) {
      console.error('Error processing article content:', error);
      return `
        <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-900/50">
          <h3 class="text-red-800 dark:text-red-200 font-medium mb-2">Error Loading Content</h3>
          <p class="text-red-700 dark:text-red-300 text-sm">
            ${error instanceof Error ? error.message : 'An unknown error occurred while loading this content.'}
          </p>
          ${process.env.NODE_ENV === 'development' ? 
            `<pre class="mt-2 p-2 bg-black/10 dark:bg-white/10 text-xs overflow-auto rounded">${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>` 
            : ''
          }
        </div>
      `;
    }
  }, [article.content, article.rawContent, article.cleanContent]);

  // Handle share click
  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(article.id);
    } else if (navigator.share) {
      navigator
        .share({
          title: article.title,
          text: `Check out this article: ${article.title}`,
          url: window.location.href,
        })
        .catch(console.error);
    }
  }, [article.id, article.title, onShare]);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
          <div
            className={cn(
              "relative w-full max-w-4xl rounded-xl bg-white shadow-2xl",
              "transform transition-all duration-300",
              "max-h-[90vh] overflow-y-auto",
              "dark:bg-gray-900 dark:text-gray-100",
              className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="sticky top-0 z-10 flex justify-between items-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center space-x-2">
                {onToggleRead && (
                  <button
                    onClick={() => onToggleRead(article.id)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    aria-label={
                      article.isRead ? "Mark as unread" : "Mark as read"
                    }
                  >
                    {article.isRead ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}

                {onToggleArchive && (
                  <button
                    onClick={() => onToggleArchive(article.id)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    aria-label={article.isArchived ? "Unarchive" : "Archive"}
                  >
                    {article.isArchived ? (
                      <ArchiveRestore size={18} />
                    ) : (
                      <Archive size={18} />
                    )}
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label="Share article"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <article className="prose prose-lg mx-auto p-6 sm:p-8 max-w-none w-full">
              {/* Header with metadata */}
              <header className="mb-8">
                <h1
                  className="text-3xl font-bold sm:text-4xl mb-2 text-gray-900 dark:text-white"
                  id="modal-title"
                >
                  {article.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {article.sender && (
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {article.sender}
                    </span>
                  )}

                  <time dateTime={article.publishDate}>
                    {format(new Date(article.publishDate), "MMMM d, yyyy")}
                  </time>
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {article.imageUrl && (
                  <div className="mt-6 rounded-lg overflow-hidden">
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      width={1200}
                      height={630}
                      className="w-full h-auto object-cover rounded-lg"
                      priority
                    />
                  </div>
                )}
              </header>

              {/* Article content */}
              <div className="prose dark:prose-invert max-w-none min-h-[200px]">
                {article.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Loading article content...</p>
                  </div>
                ) : article.error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-900/50">
                    <div className="flex items-center text-red-700 dark:text-red-300">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                      <h3 className="text-lg font-medium">Error Loading Content</h3>
                    </div>
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {article.error.message || 'Failed to load article content.'}
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={() => setArticle(prev => ({ ...prev, error: null }))}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Try Again
                      </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && article.error instanceof Error && article.error.stack && (
                      <details className="mt-4">
                        <summary className="text-xs text-red-700 dark:text-red-400 cursor-pointer">
                          Show error details
                        </summary>
                        <pre className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded overflow-auto max-h-40">
                          {article.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="article-content-wrapper">
                    {processedContent ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: processedContent }}
                        className="prose-content"
                      />
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No content available</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          This article doesn&apos;t have any content to display.
                        </p>
                        {process.env.NODE_ENV === 'development' && (
                          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left max-w-2xl mx-auto">
                            <h4 className="text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-2">
                              Debug Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-200">Content</p>
                                <p className="text-gray-600 dark:text-gray-400 break-words">
                                  {article.content ? `Length: ${article.content.length} chars` : 'Not available'}
                                </p>
                                {article.content && (
                                  <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto max-h-32">
                                    {article.content.substring(0, 300)}
                                    {article.content.length > 300 ? '...' : ''}
                                  </pre>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-200">Clean Content</p>
                                <p className="text-gray-600 dark:text-gray-400 break-words">
                                  {article.cleanContent ? `Length: ${article.cleanContent.length} chars` : 'Not available'}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-200">Raw Content</p>
                                <p className="text-gray-600 dark:text-gray-400 break-words">
                                  {article.rawContent ? `Length: ${article.rawContent.length} chars` : 'Not available'}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-200">Article ID</p>
                                <p className="text-gray-600 dark:text-gray-400 break-all">{article.id}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <button
                    onClick={onClose}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Close article
                  </button>

                  <button
                    onClick={handleShare}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Share2 className="mr-1 h-4 w-4" />
                    Share
                  </button>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </div>
    </Portal>
  );
}
