// FILE: /lib/types.ts (UPDATE EXISTING - Compatible with your existing interface)
export interface Newsletter {
  id: string;
  subject: string;
  sender: string;
  date: string;
  isNew: boolean;        // Your existing field
  
  // NEW: Additive content model
  rawContent: string;      // Original email content
  cleanContent?: string;   // Processed clean content
  
  // NEW: Processing metadata
  metadata: {
    processingVersion: string;
    processedAt: string;
    sections?: string[];
    links?: Link[];
    wordCount?: number;
    redisIndex?: string;
    isRead?: boolean;
    readAt?: string;
    archived?: boolean;
    archivedAt?: string;
    trashedAt?: string; // For future trash implementation
  };
  
  // LEGACY: Backward compatibility (will be deprecated)
  content: string;         // Keep for existing dashboard compatibility
}

// BACKWARD COMPATIBILITY: Alias for existing dashboard
export type NewsletterEmail = Newsletter;

export interface Link {
  url: string;
  text: string;
  context: string;
}

// API Response interface (unchanged - dashboard compatible)
export interface NewslettersResponse {
  newsletters: Newsletter[];
  stats: {
    total: number;
    withCleanContent?: number;     // NEW stats
    needsProcessing?: number;      // NEW stats
    avgWordCount?: number;         // NEW stats
  };
}

// BACKWARD COMPATIBILITY: Dashboard stats interface (match existing dashboard expectations)
export interface DashboardStats {
  // Existing dashboard properties (your current dashboard expects these)
  totalNewsletters: number;
  todayCount: number;
  uniqueSenders: number;
  
  // NEW stats (optional for backward compatibility)
  total?: number;
  withCleanContent?: number;
  needsProcessing?: number;
  avgWordCount?: number;
}