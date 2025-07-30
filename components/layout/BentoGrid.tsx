import React, { ReactNode, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  columns?: number[]; // [mobile, tablet, desktop, xl]
  gap?: number; // in rem units
  maxWidth?: string;
  centered?: boolean;
  fullView?: boolean; // New prop for full-view article functionality
}

export function BentoGrid({
  children,
  className,
  columns = [1, 2, 2, 3],
  gap = 1.5,
  maxWidth = '100%',
  centered = true,
  fullView = false, // Default to false
}: BentoGridProps) {
  // Generate a unique ID for the style tag
  const styleId = 'bento-grid-styles';
  
  // Memoize the grid styles to prevent unnecessary recalculations
  const gridStyles = useMemo(() => `
    .bento-grid {
      --gap: ${gap}rem;
      --columns-sm: ${columns[0]};
      --columns-md: ${columns[1]};
      --columns-lg: ${columns[2]};
      --columns-xl: ${columns[3]};
      display: grid;
      width: 100%;
      max-width: ${maxWidth};
      margin: ${centered ? '0 auto' : '0'};
      gap: var(--gap);
      grid-template-columns: repeat(var(--columns-sm), minmax(0, 1fr));
      grid-auto-rows: auto;
      align-items: start;
      transition: all 0.3s ease;
      ${fullView ? 'grid-template-columns: 1fr; grid-auto-rows: 1fr;' : ''}
    }
    
    .bento-grid > * {
      height: auto !important;
      min-height: 0;
      margin-bottom: var(--gap);
    }
    
    @media (min-width: 640px) {
      .bento-grid {
        grid-template-columns: repeat(var(--columns-md), minmax(0, 1fr));
      }
    }
    
    @media (min-width: 1024px) {
      .bento-grid {
        grid-template-columns: repeat(var(--columns-lg), minmax(0, 1fr));
      }
    }
    
    @media (min-width: 1280px) {
      .bento-grid {
        grid-template-columns: repeat(var(--columns-xl), minmax(0, 1fr));
      }
    }
  `, [gap, columns, maxWidth, centered, fullView]);

  // Add styles to the document head
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    
    styleTag.textContent = gridStyles;
    
    return () => {
      if (styleTag?.parentNode) {
        styleTag.parentNode.removeChild(styleTag);
      }
    };
  }, [gridStyles, styleId]);

  return (
    <div className={cn('bento-grid w-full', className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            key: child.key || `bento-item-${index}`,
            'data-bento-item': '',
          } as React.HTMLAttributes<HTMLElement>);
        }
        return child;
      })}
    </div>
  );
}

interface BentoItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

const BentoItem = React.forwardRef<HTMLDivElement, BentoItemProps>(({ 
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
        'overflow-hidden', // Prevent content from spilling
        'h-auto', // Let content determine height
        'w-full', // Ensure full width within grid cell
        className
      )}
      style={{
        // Ensure smooth height transitions
        transition: 'all 0.3s ease, height 0.3s ease, transform 0.3s ease',
        // Prevent collapsing when empty
        minHeight: '1px',
        // Ensure proper flex behavior if needed
        display: 'flex',
        flexDirection: 'column'
      }}
      {...props}
    >
      <div className="w-full h-auto flex-1">
        {children}
      </div>
    </div>
  );
});

BentoItem.displayName = 'BentoItem';

export { BentoItem };
