import { useState } from 'react';
import { Archive, Trash2, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await Promise.resolve(onArchive(id, !isArchived));
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

  const buttonClasses = cn(
    'inline-flex items-center justify-center rounded font-medium transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'px-3 py-1.5 text-sm',
    'border',
    'shadow-sm',
    'active:scale-95',
    'transition-colors duration-150',
    'min-w-[100px]',
    variant === 'default' 
      ? isArchived 
        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200 hover:border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-800/50 dark:text-yellow-300 dark:hover:bg-yellow-900/30'
        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 hover:border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700/50'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
    className
  );

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={buttonClasses}
      aria-label={isArchived ? 'Unarchive' : 'Archive'}
      title={isArchived ? 'Unarchive' : 'Archive'}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center w-full">
          <RotateCcw className="w-3.5 h-3.5 mr-2 animate-spin" />
          <span className="text-sm font-medium">
            {isArchived ? 'Unarchiving...' : 'Archiving...'}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-full">
          {isArchived ? (
            <Archive className="w-3.5 h-3.5 mr-2" />
          ) : (
            <Trash2 className="w-3.5 h-3.5 mr-2" />
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
