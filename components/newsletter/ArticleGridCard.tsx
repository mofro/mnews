// components/newsletter/ArticleGridCard.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  className = '',
  onToggleRead,
  onToggleArchive,
  onShare
}: ArticleGridCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Handle click on the image to toggle expansion
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Handle click on the title to toggle expansion
  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

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

  return (
    <article
      className={`group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md ${className}`}
      aria-expanded={isExpanded}
    >
      <div 
        className={`relative h-48 w-full cursor-pointer overflow-hidden rounded-t-lg ${!imageSource ? 'bg-muted' : ''}`}
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
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/60">
            <span className="text-muted-foreground/50 text-sm">Loading image...</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{sender}</span>
          <div className="flex items-center space-x-1">
            {isNew && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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
          className="mt-2 cursor-pointer text-lg font-semibold leading-tight hover:text-primary"
          onClick={handleTitleClick}
        >
          {subject}
        </h3>
        <time className="text-xs text-muted-foreground">{formattedDate}</time>

        <div 
          className="mt-2 space-y-2"
          onClick={handleCardClick}
        >
          {!isExpanded ? (
            <p className="text-sm text-gray-600 line-clamp-3">
              {summary}
            </p>
          ) : (
            <div 
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <button 
            className="text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        </div>
      </div>
    </article>
  );
}