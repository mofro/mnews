import { useState } from 'react';
import { useTheme } from 'next-themes';

interface MarkAsReadButtonProps {
  id: string;
  isRead: boolean;
  onMarkRead: () => Promise<void> | void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
}

export function MarkAsReadButton({ 
  id, 
  isRead, 
  onMarkRead,
  className = '',
  size = 'md',
  variant = 'default',
}: MarkAsReadButtonProps) {
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

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        variant === 'default' 
          ? `${readStatus ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-600 text-white hover:bg-blue-700'} ${isDark ? 'focus-visible:ring-blue-500' : 'focus-visible:ring-blue-600'}`
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${
        size === 'sm' ? 'px-2 py-1 text-xs' : 
        size === 'lg' ? 'px-4 py-2 text-base' : 
        'px-3 py-1.5 text-sm'
      } ${className}`}
      aria-label={readStatus ? 'Mark as unread' : 'Mark as read'}
      title={readStatus ? 'Mark as unread' : 'Mark as read'}
    >
      {isLoading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent">
          <span className="sr-only">Loading...</span>
        </span>
      ) : readStatus ? (
        <span className="flex items-center gap-1">
          <span className="text-green-600">✓</span>
          <span className="hidden sm:inline">Read</span>
        </span>
      ) : (
        <span>Mark as Read</span>
      )}
    </button>
  );
}
