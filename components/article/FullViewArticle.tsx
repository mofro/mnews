"use client";

import { X, Share2, Eye, EyeOff, Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useEffect, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import DOMPurify from "dompurify";

interface Article {
  id: string;
  title: string;
  content: string;
  publishDate: string;
  sender?: string;
  tags?: string[];
  imageUrl?: string;
  isRead?: boolean;
  isArchived?: boolean;
  // New fields for content loading
  isLoading?: boolean;
  error?: string | null;
  // Raw content from the API
  rawContent?: string;
  cleanContent?: string;
}

interface FullViewArticleProps {
  article: Article;
  onClose: () => void;
  onToggleRead?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onShare?: (id: string) => void;
  className?: string;
}

export function FullViewArticle({
  article: initialArticle,
  onClose,
  onToggleRead,
  onToggleArchive,
  onShare,
  className,
}: FullViewArticleProps) {
  const [article, setArticle] = useState<Article>({
    ...initialArticle,
    isLoading: false,
    error: null,
  });

  // Fetch full article content when component mounts
  useEffect(() => {
    const fetchFullContent = async () => {
      // Skip if we already have content or it's already loading
      if (article.content || article.isLoading || article.error) return;

      setArticle(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(`/api/articles/${article.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch article content');
        }
        const data = await response.json();
        
        setArticle(prev => ({
          ...prev,
          content: data.content || prev.content,
          rawContent: data.rawContent || prev.rawContent,
          cleanContent: data.cleanContent || prev.cleanContent,
          isLoading: false,
          error: null
        }));
      } catch (error) {
        console.error('Error fetching article content:', error);
        setArticle(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load article content'
        }));
      }
    };

    fetchFullContent();
  }, [article.id, article.content, article.isLoading, article.error]);
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

  // Sanitize content
  const sanitizedContent = useMemo(() => {
    if (!article.content) return "";
    return DOMPurify.sanitize(article.content, {
      ALLOWED_TAGS: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "strong",
        "em",
        "b",
        "i",
        "u",
        "s",
        "blockquote",
        "ul",
        "ol",
        "li",
        "a",
        "img",
        "div",
        "span",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "pre",
        "code",
        "sup",
        "sub",
        "mark",
        "del",
        "ins",
      ],
      ALLOWED_ATTR: [
        "href",
        "target",
        "rel",
        "title",
        "alt",
        "src",
        "class",
        "style",
        "width",
        "height",
        "align",
        "valign",
        "cellspacing",
        "cellpadding",
        "border",
      ],
    });
  }, [article.content]);

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
                  <div className="text-center py-8 text-red-500 dark:text-red-400">
                    <p>Error loading content: {article.error}</p>
                    <button
                      onClick={() => setArticle(prev => ({ ...prev, error: null }))}
                      className="mt-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div 
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    className="prose-content"
                  />
                )}
                
                {!sanitizedContent && !article.isLoading && !article.error && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No content available for this article.
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
