'use client';

import { cn } from "@/lib/cn";
import React, { forwardRef } from 'react';

interface BentoItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const BentoItem = forwardRef<HTMLDivElement, BentoItemProps>(({ 
  children,
  className = '',
  ...props 
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        'bento-item',
        'bg-white dark:bg-gray-800',
        'rounded-lg shadow-sm border border-gray-100 dark:border-gray-700',
        'hover:shadow-md hover:z-10 hover:border-gray-200 dark:hover:border-gray-600',
        'transition-all duration-300',
        'overflow-hidden',
        'h-full',
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
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
});

BentoItem.displayName = 'BentoItem';
