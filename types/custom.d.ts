// Type declarations for module resolution

declare module '*.upstash/redis' {
  export * from '@upstash/redis';
}

declare module '*.json' {
  const value: any;
  export default value;
}

// Allow CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Allow image imports
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg' {
  import React from 'react';
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Global type declarations
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    KV_REST_API_URL: string;
    KV_REST_API_TOKEN: string;
    // Add other environment variables as needed
  }
}

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
