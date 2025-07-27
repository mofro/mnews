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
    'inline-flex items-center justify-center rounded-md font-medium transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'px-2.5 py-1.5 text-sm',
    'border border-transparent',
    'shadow-sm',
    variant === 'default' 
      ? isArchived 
        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200 hover:border-yellow-300' 
        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800',
    'active:scale-95',
    'transition-colors duration-150',
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
        <RotateCcw className="w-4 h-4 mr-1.5 animate-spin" />
      ) : isArchived ? (
        <Archive className="w-4 h-4 mr-1.5" />
      ) : (
        <Trash2 className="w-4 h-4 mr-1.5" />
      )}
      <span className="text-xs font-medium">
        {isArchived ? 'Unarchive' : 'Archive'}
      </span>
    </button>
  );
};

export default ArchiveButton;
