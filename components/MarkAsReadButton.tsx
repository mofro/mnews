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

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRead || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/newsletters/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Failed to update read status:', error);
        // Optionally show a toast notification here
        return;
      }
      
      // Only update local state if the API call was successful
      await onMarkRead();
    } catch (error) {
      console.error('Error updating read status:', error);
      // Optionally show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  // Button variants based on read state
  const buttonVariants = {
    read: {
      base: 'text-xs px-2 py-1 rounded transition-colors',
      light: 'text-green-700 bg-green-100 hover:bg-green-200',
      dark: 'text-green-300 bg-green-900/30 hover:bg-green-900/50',
    },
    unread: {
      base: 'text-xs px-2 py-1 rounded transition-colors',
      light: 'text-gray-700 bg-gray-100 hover:bg-gray-200',
      dark: 'text-gray-300 bg-gray-700 hover:bg-gray-600',
    },
    loading: {
      base: 'text-xs px-2 py-1 rounded transition-opacity opacity-75',
      light: 'bg-gray-100 text-gray-700',
      dark: 'bg-gray-700 text-gray-300',
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Determine button variant classes
  const variantClasses = variant === 'ghost' 
    ? 'bg-transparent hover:bg-opacity-10' 
    : '';

  const buttonClasses = [
    // Base styles
    'inline-flex items-center justify-center',
    'rounded-md font-medium',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Size classes
    sizeClasses[size],
    
    // Variant classes
    variantClasses,
    
    // State-based styles
    isLoading 
      ? `${buttonVariants.loading.base} ${isDark ? buttonVariants.loading.dark : buttonVariants.loading.light}`
      : isRead 
        ? `${buttonVariants.read.base} ${isDark ? buttonVariants.read.dark : buttonVariants.read.light}`
        : `${buttonVariants.unread.base} ${isDark ? buttonVariants.unread.dark : buttonVariants.unread.light}`,
    
    // Focus ring color based on theme
    isDark ? 'focus:ring-blue-400' : 'focus:ring-blue-500',
    
    // Additional custom classes
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || isRead}
      className={buttonClasses}
      aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
          <span>{isRead ? 'Updating...' : 'Marking...'}</span>
        </>
      ) : isRead ? (
        <>
          <svg 
            className="w-3 h-3 mr-1.5 flex-shrink-0" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
          <span>Read</span>
        </>
      ) : (
        <span>Mark as Read</span>
      )}
    </button>
  );
}
