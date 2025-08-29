import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface MarkAsReadButtonProps {
  id: string;
  isRead: boolean;
  onMarkRead: () => Promise<void> | void;
  className?: string;
  variant?: 'default' | 'ghost';
}

const MarkAsReadButton: React.FC<MarkAsReadButtonProps> = ({
  id, 
  isRead, 
  onMarkRead,
  className = '',
  variant = 'default',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const readStatus = !!isRead;

  const handleClick = async (e: React.MouseEvent) => {
    // Stop event from bubbling up to parent elements
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/newsletters/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: !readStatus })
      });
      
      if (!response.ok) {
        // Silently handle the error as it's not critical for the user experience
        await response.json().catch(() => ({}));
        return;
      }
      
      await onMarkRead();
    } catch (_error) {
      // Silently handle the error as it's not critical for the user experience
    } finally {
      setIsLoading(false);
    }
  };

  const buttonClasses = cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'px-4 py-2 text-sm',
    'border',
    'shadow-sm',
    'active:scale-95',
    'transition-all duration-150',
    'min-w-[100px]',
    'h-[38px]',
    variant === 'default' 
      ? readStatus 
        ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 dark:bg-green-900/30 dark:border-green-800/70 dark:text-green-200 dark:hover:bg-green-900/40' 
        : 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/70 dark:text-blue-200 dark:hover:bg-blue-900/40'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 border-transparent',
    'font-medium tracking-wide',
    'hover:shadow-md',
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(buttonClasses, className)}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-label={readStatus ? 'Mark as unread' : 'Mark as read'}
      title={readStatus ? 'Mark as unread' : 'Mark as read'}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center w-full gap-2">
          <span className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm font-medium">
            {readStatus ? 'Read' : 'Reading...'}
          </span>
        </span>
      ) : readStatus ? (
        <span className="inline-flex items-center justify-center w-full gap-2">
          <span className="text-green-600 font-bold">✓</span>
          <span className="text-sm font-medium">Read</span>
        </span>
      ) : (
        <span className="text-sm font-medium">Mark as Read</span>
      )}
    </button>
  );
};

export default MarkAsReadButton;
