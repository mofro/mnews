import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function BentoGrid({ 
  children, 
  className = '',
  columns = 3 
}: BentoGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3', // 1 column < 640px, 2 columns 640px-959px, 3 columns 960px+
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
    6: 'sm:grid-cols-2 lg:grid-cols-6',
  };

  return (
    <div 
      className={`grid grid-cols-1 ${gridCols[columns]} gap-6 ${className}`}
      style={{
        gridAutoRows: 'min-content',
        alignItems: 'start'
      }}
    >
      {children}
    </div>
  );
}

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  span?: number;
}

export function BentoItem({ 
  children, 
  className = '', 
  span = 1 
}: BentoItemProps) {
  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 
        transition-all duration-200 overflow-hidden 
        flex flex-col h-full rounded-[0.5rem] ${className}
      `}
      style={{
        gridRow: `span ${span} / span ${span}`,
        ...(span > 1 ? { 
          gridColumn: `span ${span}`,
          height: 'fit-content'
        } : { height: 'auto' })
      }}
    >
      {children}
    </div>
  );
}
