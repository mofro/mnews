// components/newsletter/ArticleGridCard.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { extractFeaturedImage, getArticleImage } from '@/utils/imageUtils';
import { Bookmark, BookmarkCheck, Share2, Eye, EyeOff, Archive, ArchiveRestore } from 'lucide-react';
import DOMPurify from 'dompurify';

interface ArticleGridCardProps {
  id: string;
  sender: string;
  subject: string;
  date: string;
  content: string;
  imageUrl?: string;
  isNew?: boolean;
  isRead?: boolean;
  isArchived?: boolean;
  tags?: string[];
  newsletterId?: string;
  className?: string;
  onToggleRead?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function ArticleGridCard({
  id,
  sender,
  subject,
  date,
  content,
  imageUrl: initialImageUrl,
  isNew = false,
  isRead = false,
  isArchived = false,
  tags = [],
  newsletterId,
  className = '',
  onToggleRead,
  onToggleArchive,
  onShare
}: ArticleGridCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  
  // Update content height when expanded state or content changes
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Reset height to auto to measure natural height
    contentRef.current.style.height = 'auto';
    const height = contentRef.current.scrollHeight;
    
    // Set initial height (0 if collapsed)
    contentRef.current.style.height = isExpanded ? `${height}px` : '0';
    
    // Store the height for reference
    setContentHeight(height);
    
    // Cleanup function
    return () => {
      if (contentRef.current) {
        contentRef.current.style.height = 'auto';
      }
    };
  }, [isExpanded, content]);

  // Extract featured image from content
  const featuredImageUrl = useMemo(() => {
    if (typeof window !== 'undefined' && content) {
      return extractFeaturedImage(content);
    }
    return null;
  }, [content]);

  // Generate a text-only summary by stripping HTML and limiting length
  const summary = useMemo(() => {
    if (!content) return '';
    // Remove HTML tags and limit to 200 characters
    const text = content.replace(/<[^>]*>?/gm, '').trim();
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  }, [content]);

  // Sanitize HTML content with DOMPurify
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    
    // First, clean the content
    // Only sanitize on client side
    if (typeof window === 'undefined') return '';
    
    let cleanContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'b', 'i',
        'ul', 'ol', 'li', 'a', 'img',
        'blockquote', 'div', 'span', 'table',
        'tr', 'td', 'th', 'tbody', 'thead', 'tfoot'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'target',
        'class', 'style', 'width', 'height',
        'cellspacing', 'cellpadding', 'border',
        'bgcolor', 'align', 'valign'
      ]
    });

    // Process images to ensure they load properly
    cleanContent = cleanContent.replace(
      /<img([^>]*)src=\"([^"]*)\"/g, 
      (match, attrs, src) => {
        // Convert relative URLs to absolute if needed
        let imageUrl = src;
        if (src.startsWith('//')) {
          imageUrl = `https:${src}`;
        } else if (src.startsWith('/') && !src.startsWith('//')) {
          const url = new URL(window.location.href);
          imageUrl = `${url.origin}${src}`;
        }
        return `<img${attrs} src="${imageUrl}" loading="lazy" style="max-width: 100%; height: auto;"`;
      }
    );

    return cleanContent;
  }, [content]);

  // Extract featured image if not provided
  useEffect(() => {
    if (!initialImageUrl && content) {
      const extractedImage = extractFeaturedImage(content);
      if (extractedImage) {
        setImageUrl(extractedImage);
      }
    }
  }, [content, initialImageUrl]);

  // Safe date parsing with fallback
  const safeDate = useCallback((dateString: string): Date => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }, []);

  const formattedDate = format(safeDate(date), 'MMM d, yyyy');

  const handleImageError = useCallback(() => {
    setImageUrl(null);
  }, []);

  const handleToggleRead = useCallback(() => {
    onToggleRead?.(id);
  }, [id, onToggleRead]);

  const handleToggleArchive = useCallback(() => {
    onToggleArchive?.(id);
  }, [id, onToggleArchive]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: subject,
        text: `Check out this article: ${subject}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      onShare?.(id);
    }
  }, [id, onShare, subject]);

  // Handle click on the card to toggle expansion
  const handleCardClick = useCallback(() => {
    const wasExpanded = isExpanded;
    setIsExpanded(!wasExpanded);
    
    // Scroll to top on mobile when expanding
    if (!wasExpanded && window.innerWidth <= 768) {
      // Use setTimeout to ensure the DOM has updated with the expanded content
      setTimeout(() => {
        const cardElement = document.getElementById(`card-${id}`);
        if (cardElement) {
          cardElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 50);
    }
  }, [isExpanded, id]);
  
  // Add scroll behavior for title click as well
  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const wasExpanded = isExpanded;
    setIsExpanded(!wasExpanded);
    
    if (!wasExpanded && window.innerWidth <= 768) {
      setTimeout(() => {
        const cardElement = document.getElementById(`card-${id}`);
        if (cardElement) {
          cardElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 50);
    }
  }, [isExpanded, id]);

  // Handle click on the image to toggle expansion
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const wasExpanded = isExpanded;
    setIsExpanded(!wasExpanded);
    
    // Scroll to top on mobile when expanding
    if (!wasExpanded && window.innerWidth <= 768) {
      setTimeout(() => {
        const cardElement = document.getElementById(`card-${id}`);
        if (cardElement) {
          cardElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 50);
    }
  }, [isExpanded, id]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Determine image source on the client side only
  const [imageSource, setImageSource] = useState<string | null>(null);
  
  useEffect(() => {
    // First try explicit imageUrl, then featuredImage, then generate from title
    if (imageUrl) {
      setImageSource(imageUrl);
    } else if (featuredImageUrl) {
      setImageSource(featuredImageUrl);
    } else if (typeof window !== 'undefined') {
      // Only generate Unsplash image on client side
      const unsplashImage = getArticleImage(subject, {
        width: 800,
        height: 600,
        blur: 1,
        grayscale: true
      });
      setImageSource(unsplashImage);
    }
  }, [imageUrl, featuredImageUrl, subject]);

  // Calculate size class based on content length
  const getSizeClass = () => {
    const contentLength = content?.length || 0;
    if (contentLength > 2000) return 'md:col-span-2 lg:col-span-2';
    if (contentLength > 1000) return 'md:col-span-2';
    return '';
  };

  return (
    <article
      id={`card-${id}`}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-800 ${
        isArchived ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : ''
      } ${getSizeClass()} ${className}`}
      aria-expanded={isExpanded}
    >
      <div 
        className={`relative h-48 w-full cursor-pointer overflow-hidden ${!imageSource ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800' : ''}`}
        onClick={handleImageClick}
      >
        {imageSource ? (
          <Image
            src={imageSource}
            alt={subject}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            onError={() => {
              // If image fails to load, generate a new one
              const fallbackImage = getArticleImage(subject, {
                width: 800,
                height: 600,
                random: true
              });
              setImageSource(fallbackImage);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground/50 text-sm">No image available</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{sender}</span>
          <div className="flex items-center space-x-2">
            {isNew && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                New
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleRead();
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-muted"
              aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleArchive();
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-muted"
              aria-label={isArchived ? 'Unarchive' : 'Archive'}
            >
              {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-muted"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <h3 
          className="mb-1 cursor-pointer text-lg font-semibold leading-tight text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
          onClick={handleTitleClick}
        >
          {subject}
        </h3>
        <time className="mb-3 text-xs text-gray-500 dark:text-gray-400">{formattedDate}</time>

        <div className="flex-1">
          <div 
            className="overflow-hidden transition-all duration-300 ease-in-out"
            ref={contentRef}
            style={{
              height: isExpanded ? contentHeight : '0',
              opacity: isExpanded ? 1 : 0.8,
              transition: 'height 300ms ease-in-out, opacity 300ms ease-in-out'
            }}
          >
            <div 
              className={`prose prose-sm max-w-none text-gray-700 dark:text-gray-200 ${isArchived ? 'dark:text-gray-300/80' : ''}`}
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </div>
          
          {/* Show summary when collapsed */}
          {!isExpanded && (
            <div 
              className="cursor-pointer"
              onClick={handleCardClick}
            >
              <p className={`text-sm text-gray-600 dark:text-gray-400 ${isArchived ? 'dark:text-gray-300/80' : ''} line-clamp-4`}>
                {summary}
              </p>
            </div>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span 
                  key={tag} 
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Article ID - subtle and centered */}
        <div className="text-center mb-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            ID: {id}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
            <button 
              className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <>
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Show less
                </>
              ) : (
                <>
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Read more
                </>
              )}
            </button>
            
            <div className="flex items-center space-x-3">
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleRead();
                }}
                aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {isRead ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleArchive();
                }}
                aria-label={isArchived ? 'Unarchive' : 'Archive'}
              >
                {isArchived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </button>
              
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={handleShare}
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}