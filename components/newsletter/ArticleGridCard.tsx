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
import { formatDateSafely } from "@/utils/dateService";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface ArticleGridCardProps {
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
  // Sanitize content for preview
  const previewContent = useMemo(() => {
    if (!content) return "";
    // Remove HTML tags but keep full content
    return DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
  }, [content]);

  const formattedDate = useMemo(
    () =>
      formatDateSafely<string>(
        date,
        (d: Date) =>
          d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        "No date",
        { fallbackBehavior: "current-date", logWarnings: true },
      ),
    [date],
  );

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
      {imageUrl && !imageError ? (
        <div className="relative aspect-video overflow-hidden bg-muted/20">
          <Image
            src={imageUrl}
            alt={subject}
            fill
            className="object-cover transition-opacity duration-300 hover:opacity-90"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImageError(true)}
            onLoad={() => setIsImageLoading(false)}
            priority={false}
            loading="lazy"
            unoptimized={imageUrl.startsWith("http")} // Only optimize local images
          />
        </div>
      ) : (
        <div className="relative aspect-video bg-muted/50 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageOff className="w-8 h-8 text-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">
            No image available
          </span>
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
              onClick={(e) => handleActionClick(e, () => onToggleRead(id))}
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
              onClick={(e) => handleActionClick(e, () => onToggleArchive(id))}
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
            onClick={(e) => handleActionClick(e, () => onShare(id))}
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
