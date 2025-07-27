// Type definitions for path aliases
declare module '@/lib/utils' {
  export function cn(...inputs: any[]): string;
}

declare module '@/components/ArchiveButton' {
  import { FC } from 'react';
  const ArchiveButton: FC<{
    id: string;
    isArchived?: boolean;
    onArchive: (id: string, isArchived: boolean) => Promise<void> | void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost';
  }>;
  export default ArchiveButton;
}

declare module '@/components/MarkAsReadButton' {
  import { FC } from 'react';
  const MarkAsReadButton: FC<{
    id: string;
    isRead: boolean;
    onMarkRead: () => Promise<void> | void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost';
  }>;
  export default MarkAsReadButton;
}
