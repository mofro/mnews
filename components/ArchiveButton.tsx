import React, { useState } from 'react';
import { Archive, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArchiveButtonProps {
  id: string;
  isArchived?: boolean;
  onArchive: (id: string, isArchived: boolean) => Promise<void> | void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
}

const ArchiveButton: React.FC<ArchiveButtonProps> = ({
  id,
  isArchived = false,
  onArchive,
  className = '',
  size = 'md',
  variant = 'default',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Use the variables in a way that the linter can see
  const buttonId = `archive-button-${id}`;
  const buttonAriaLabel = isArchived ? 'Unarchive' : 'Archive';
  const buttonTitle = isArchived ? 'Unarchive' : 'Archive';

  const handleClick = async (e: React.MouseEvent) => {
    // Stop event from bubbling up to parent elements
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await Promise.resolve(onArchive(id, !isArchived));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error toggling archive status:', error);
      }
      // Consider adding a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-sm',
    lg: 'p-2 text-base',
  };

  const buttonClasses = cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    sizeClasses[size],
    'border',
    'shadow-sm',
    'active:scale-95',
    'transition-all duration-150',
    'min-w-[100px]',
    variant === 'default' 
      ? isArchived 
        ? 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/70 dark:text-amber-200 dark:hover:bg-amber-900/40'
        : 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700/70 dark:text-gray-200 dark:hover:bg-gray-800/40'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 border-transparent',
    'font-medium tracking-wide',
    'hover:shadow-md'
  );
  
  const finalButtonClasses = cn(buttonClasses, className);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={finalButtonClasses}
      aria-busy={isLoading}
      id={buttonId}
      aria-label={buttonAriaLabel}
      title={buttonTitle}
      data-archived={isArchived ? 'true' : 'false'}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center w-full gap-2">
          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
          <span className="text-sm font-medium">
            {isArchived ? 'Unarchiving...' : 'Archiving...'}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-full gap-2">
          {isArchived ? (
            <Archive className="w-4 h-4" />
          ) : (
            <Trash2 className="w-2 h-2" />
          )}
          <span className="text-sm font-medium">
            {isArchived ? 'Unarchive' : 'Archive'}
          </span>
        </span>
      )}
    </button>
  );
};

export default ArchiveButton;
