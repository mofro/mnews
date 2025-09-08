// components/newsletter/ArticleGridCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Share2,
  Eye,
  EyeOff,
  ImageOff,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import DOMPurify from "dompurify";
import { cn } from "@/lib/cn";
// Using standard img tag instead of Next.js Image component

export interface ArticleGridCardProps {
  id: string;
  sender: string;
  subject: string;
  date: string;
  content: string;
  cleanContent?: string;
  rawContent?: string;
  imageUrl?: string;
  isNew?: boolean;
  isRead?: boolean;
  isArchived?: boolean;
  tags?: string[];
  onToggleRead: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onShare: (id: string) => void;
  onExpand: (article: any) => void;
  className?: string;
}

export function ArticleGridCard({
  id,
  sender,
  subject,
  date,
  content = "",
  cleanContent = "",
  rawContent = "",
  imageUrl,
  isNew = false,
  isRead = false,
  isArchived = false,
  tags = [],
  onToggleRead,
  onToggleArchive,
  onShare,
  onExpand,
  className,
}: ArticleGridCardProps) {
  // Get the best available content for preview
  const previewContent = useMemo(() => {
    try {
      // Log content details in development
      if (process.env.NODE_ENV === 'development') {
        console.log('ArticleGridCard content processing:', {
          id,
          contentLength: content?.length,
          cleanContentLength: cleanContent?.length,
          rawContentLength: rawContent?.length,
        });
      }
      
      // Get the first non-empty content source
      const contentToUse = [content, cleanContent, rawContent].find(
        c => c && c.trim().length > 0
      ) || 'No content available';

      // If we only have the fallback text, return it
      if (contentToUse === 'No content available') {
        return contentToUse;
      }

      // Check if content is a redacted message from the API
      if (contentToUse.includes('[REDACTED - use /api/newsletters/')) {
        return 'Content available - click to view full article';
      }

      // Process the content for preview
      let text = contentToUse;
      
      // Remove HTML tags if present
      if (text.includes('<')) {
        text = text
          .replace(/<[^>]*>?/gm, ' ') // Replace HTML tags with space
          .replace(/\s+/g, ' ')      // Collapse multiple spaces
          .trim();
      }
      
      // Decode HTML entities
      text = text
        .replace(/&[a-z]+;/g, ' ')  // Replace HTML entities with space
        .replace(/\s+/g, ' ')      // Collapse spaces again after replacement
        .trim();

      // If we still have content, try to find a good preview
      if (text) {
        // Try to find the first sentence
        const firstSentenceMatch = text.match(/^.*?[.!?]+(?:\s|$)/);
        let preview = firstSentenceMatch ? firstSentenceMatch[0] : text;
        
        // If the first sentence is too short, get more content
        if (preview.length < 50 && text.length > 50) {
          preview = text.substring(0, 200);
        }
        
        // Clean up and truncate
        preview = preview.replace(/\s+/g, ' ').trim();
        
        // Truncate to a reasonable length for preview
        if (preview.length > 150) {
          const maxLength = 150;
          const lastSpace = preview.lastIndexOf(' ', maxLength);
          const truncateAt = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;
          preview = preview.substring(0, truncateAt).trim() + '...';
        }
        
        return preview || 'No content available';
      }
      
      return 'No content available';
    } catch (error) {
      console.error('Error generating preview content:', error);
      return 'Content preview unavailable';
    }
  }, [content, cleanContent, rawContent]);

  const formattedDate = useMemo(() => {
    try {
      const dateObj = new Date(date);
      return isValid(dateObj) ? format(dateObj, 'MMM d, yyyy') : 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  }, [date]);

  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsImageLoading(false);
  };

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  // Handle card click - opens the article in a popup
  const handleCardClick = () => {
    onExpand({
      id,
      sender,
      subject,
      date,
      content,
      imageUrl,
      isRead,
      isArchived,
      tags,
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  // Handle button clicks without triggering card click
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col h-full transition-all duration-200",
        "hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700",
        isRead && "opacity-70",
        isArchived && "border-yellow-400 dark:border-yellow-600",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open article: ${subject}`}
    >
      {imageUrl && !imageError && (
        <div className="relative aspect-video overflow-hidden bg-muted/20">
          <img
            src={imageUrl}
            alt={subject}
            className="w-full h-full object-cover transition-opacity duration-300 hover:opacity-90"
            onError={() => setImageError(true)}
            onLoad={() => setIsImageLoading(false)}
            loading="lazy"
          />
        </div>
      )}

      <CardContent className="flex-1 p-4 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-foreground dark:text-white line-clamp-2">
            {subject}
          </h3>
          {isNew && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              New
            </span>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          {sender} • {formattedDate}
        </div>

        <p className="text-sm text-foreground/80 mt-2 line-clamp-3">
          {previewContent}
        </p>

        {tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-3 pt-0 border-t border-border">
        <div className="flex justify-between w-full items-center">
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleActionClick(e, () => onToggleRead?.(id))}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title={isRead ? "Mark as unread" : "Mark as read"}
            >
              {isRead ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleActionClick(e, () => onToggleArchive?.(id))}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title={isArchived ? "Unarchive" : "Archive"}
            >
              {isArchived ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleActionClick(e, () => onShare?.(id))}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
