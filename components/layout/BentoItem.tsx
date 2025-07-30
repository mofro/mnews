'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Expand } from 'lucide-react';
import { FullViewArticle } from '@/components/article/FullViewArticle';
import React from 'react';

interface BentoItemProps extends React.HTMLAttributes<HTMLDivElement> {
  article?: {
    id: string;
    title: string;
    content: string;
    publishDate: string;
  };
  children: React.ReactNode;
  className?: string;
}

export const BentoItem = React.forwardRef<HTMLDivElement, BentoItemProps>(({ 
  article,
  children,
  className = '',
  ...props 
}, ref) => {
  const [isFullView, setIsFullView] = useState(false);

  if (!article) {
    return (
      <div 
        ref={ref}
        className={cn(
          'bento-item',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-sm border border-gray-100 dark:border-gray-700',
          'transition-all duration-300',
          'overflow-hidden',
          'h-auto',
          'w-full',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      <div 
        ref={ref}
        className={cn(
          'bento-item group relative',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-sm border border-gray-100 dark:border-gray-700',
          'hover:shadow-md hover:z-10 hover:border-gray-200 dark:hover:border-gray-600',
          'transition-all duration-300',
          'overflow-hidden',
          'h-auto',
          'w-full',
          'flex flex-col',
          className
        )}
        style={{
          transition: 'all 0.3s ease, height 0.3s ease, transform 0.3s ease',
          minHeight: '1px',
        }}
        {...props}
      >
        <div className="flex-1">
          {children}
        </div>
        
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullView(true);
            }}
            className="flex items-center justify-center rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
            aria-label="Expand to full view"
          >
            <Expand className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {isFullView && (
        <FullViewArticle
          article={article}
          onClose={() => setIsFullView(false)}
        />
      )}
    </>
  );
});

BentoItem.displayName = 'BentoItem';
