import { useState } from 'react';
import { Archive, Trash2, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';

interface ArchiveButtonProps {
  id: string;
  isArchived?: boolean;
  onArchive: (id: string, isArchived: boolean) => Promise<void>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
}

export function ArchiveButton({ 
  id, 
  isArchived = false, 
  onArchive,
  className = '',
  size = 'md',
  variant = 'default',
}: ArchiveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onArchive(id, !isArchived);
    } catch (error) {
      console.error('Error toggling archive status:', error);
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

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        variant === 'default' 
          ? `${
              isArchived 
                ? 'text-yellow-600 hover:bg-yellow-100' 
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
      aria-label={isArchived ? 'Unarchive' : 'Archive'}
      title={isArchived ? 'Unarchive' : 'Archive'}
    >
      {isLoading ? (
        <RotateCcw className="w-4 h-4 animate-spin" />
      ) : isArchived ? (
        <Archive className="w-4 h-4" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
      <span className="sr-only">{isArchived ? 'Unarchive' : 'Archive'}</span>
    </button>
  );
}
