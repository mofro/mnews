import { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface MarkAsReadButtonProps {
  id: string;
  isRead: boolean;
  onMarkRead: () => Promise<void> | void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
}

const MarkAsReadButton: React.FC<MarkAsReadButtonProps> = ({
  id, 
  isRead, 
  onMarkRead,
  className = '',
  size = 'md',
  variant = 'default',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const readStatus = !!isRead;

  const handleClick = async (e: React.MouseEvent) => {
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
        const error = await response.json().catch(() => ({}));
        console.error('Failed to update read status:', error);
        return;
      }
      
      await onMarkRead();
    } catch (error) {
      console.error('Error updating read status:', error);
    } finally {
      setIsLoading(false);
    }
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
      ? readStatus 
        ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200 hover:border-green-300 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-300 dark:hover:bg-green-900/30' 
        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 hover:border-blue-300 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300 dark:hover:bg-blue-900/30'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
    className
  );

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={buttonClasses}
      aria-label={readStatus ? 'Mark as unread' : 'Mark as read'}
      title={readStatus ? 'Mark as unread' : 'Mark as read'}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center w-full">
          <span className="w-3.5 h-3.5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm font-medium">
            {readStatus ? 'Read' : 'Reading...'}
          </span>
        </span>
      ) : readStatus ? (
        <span className="inline-flex items-center justify-center w-full">
          <span className="text-green-600 mr-2">✓</span>
          <span className="text-sm font-medium">Read</span>
        </span>
      ) : (
        <span className="text-sm font-medium">Mark as Read</span>
      )}
    </button>
  );
};

export default MarkAsReadButton;
