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
  };
  
  // LEGACY: Backward compatibility (will be deprecated)
  content: string;         // Keep for existing dashboard compatibility
}

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