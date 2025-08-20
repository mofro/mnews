// FILE: /lib/incremental-parser.ts
// Incremental Newsletter Parser - One step at a time, with fallbacks

import { integrateFootnoteLinks } from './footnoteLinks';

export interface ProcessingStep {
  stepName: string;
  input: string;
  output: string;
  success: boolean;
  error?: string;
}

export interface ParseResult {
  /** Legacy clean HTML output. Present when produced via parseToCleanHTML wrapper. */
  cleanHTML?: string;
  /** Primary output of new incremental pipeline */
  finalOutput: string;
  /** Detailed steps executed during processing */
  steps: ProcessingStep[];
  /** Additional metadata */
  metadata: {
    processingVersion: string;
    processedAt: string;
    wordCount: number;
    compressionRatio: string;
    /** Legacy array of step names for backwards compatibility */
    processingSteps?: string[];
    /** Error message when parser falls back */
    error?: string;
  };
}

export class IncrementalNewsletterParser {
  
  /**
   * Main entry point - run pipeline with fallbacks at each step
   */
  static parseNewsletter(rawHTML: string, options: any = {}): ParseResult {
    const config = {
      enableImagePreservation: false,
      enableLinkPreservation: false,
      enableFootnoteLinks: false,
      enableStructureRecovery: false, // Start disabled until we test
      skipHtmlToText: false, // New option to skip HTML-to-text conversion
      ...options
    };
    
    const steps: ProcessingStep[] = [];
    let currentContent = rawHTML;
    
    try {
      // Only run HTML-to-text conversion if not explicitly skipped
      if (!config.skipHtmlToText) {
        if (config.enableFootnoteLinks) {
          currentContent = integrateFootnoteLinks(currentContent, steps, config);
        } else {
          // Step 1: Basic HTML to text (original)
          currentContent = this.step1_BasicHtmlToText(currentContent, steps);
        }
      } else {
        steps.push({
          stepName: 'skip-html-to-text',
          input: 'HTML content',
          output: 'Skipped HTML-to-text conversion',
          success: true
        });
      }
      
      // Step 2: Clean whitespace and entities (safe improvements)
      currentContent = this.step2_CleanWhitespace(currentContent, steps);
      
      // Step 3: Structure recovery (OPTIONAL - disabled by default)
      if (config.enableStructureRecovery) {
        currentContent = this.step3_RecoverStructure(currentContent, steps);
      }
      
      // Step 4: Link preservation (OPTIONAL - disabled by default)
      if (config.enableLinkPreservation) {
        currentContent = this.step4_PreserveLinks(currentContent, steps);
      }
      
      // Step 5: Image handling (OPTIONAL - disabled by default)
      if (config.enableImagePreservation) {
        currentContent = this.step5_HandleImages(currentContent, steps);
      }
      
      return {
        finalOutput: currentContent,
        steps,
        metadata: {
          processingVersion: 'incremental-v1.0',
          processedAt: new Date().toISOString(),
          wordCount: this.estimateWordCount(currentContent),
          compressionRatio: ((rawHTML.length - currentContent.length) / rawHTML.length * 100).toFixed(1) + '%'
        }
      };
      
    } catch (error) {
      // If ANY step fails, fall back to basic text
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Parser pipeline failed:', error);
      }
      const fallbackContent = this.step1_BasicHtmlToText(rawHTML, []);
      
      return {
        finalOutput: fallbackContent,
        steps: [{ 
          stepName: 'fallback', 
          input: rawHTML.substring(0, 100) + '...', 
          output: fallbackContent.substring(0, 100) + '...', 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        metadata: {
          processingVersion: 'fallback-basic',
          processedAt: new Date().toISOString(),
          wordCount: this.estimateWordCount(fallbackContent),
          compressionRatio: '0%'
        }
      };
    }
  }
  
  /**
   * Step 1: Your original working HTML to text converter
   */
  private static step1_BasicHtmlToText(content: string, steps: ProcessingStep[]): string {
    const input = content;
    
    try {
      const text = content
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .replace(/&amp;/g, '&') // Replace HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\r\n/g, '\n') // Normalize line breaks
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple line breaks
        .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces
        .trim();
      
      steps.push({
        stepName: 'basic-html-to-text',
        input: input.substring(0, 200) + '...',
        output: text.substring(0, 200) + '...',
        success: true
      });
      
      return text;
      
    } catch (error) {
      steps.push({
        stepName: 'basic-html-to-text',
        input: input.substring(0, 200) + '...',
        output: content, // Return original on failure
        success: false,
        error: error instanceof Error ? error.message : 'Step 1 failed'
      });
      
      return content; // Fallback to original
    }
  }
  
  /**
   * Step 2: ENHANCED - Clean whitespace and entities + INVISIBLE CHARACTER REMOVAL
   * This step is SAFE and should always run
   */
  private static step2_CleanWhitespace(content: string, steps: ProcessingStep[]): string {
    const input = content;
    
    try {
      const cleaned = content
        // CRITICAL: Remove the massive invisible character sequences
        // Pattern: ͏ ­͏ ­͏ ­͏ ­͏ ­ (repeated hundreds of times)
        .replace(/͏[\s\u00A0\u00AD­]*­͏[\s\u00A0\u00AD­]*/g, ' ')
        // Match and remove various invisible characters (soft hyphen, zero-width space, etc.)
        .replace(/(?:\u00AD|\u200B|\u200C|\u200D|\uFEFF)+/g, '')
        .replace(/͏+/g, '') // Remove any remaining invisible separators
        
        // Clean up HTML entities (existing logic)
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&ndash;/g, '–')
        .replace(/&mdash;/g, '—')
        .replace(/&hellip;/g, '…')
        
        // Normalize whitespace (existing logic)
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
      
      steps.push({
        stepName: 'clean-whitespace-enhanced',
        input: input.substring(0, 200) + '...',
        output: cleaned.substring(0, 200) + '...',
        success: true
      });
      
      return cleaned;
      
    } catch (error) {
      steps.push({
        stepName: 'clean-whitespace-enhanced',
        input: input.substring(0, 200) + '...',
        output: content,
        success: false,
        error: error instanceof Error ? error.message : 'Enhanced Step 2 failed'
      });
      
      return content;
    }
  }

    
  /**
   * Step 3: ENHANCED - Structure recovery with improved pattern matching
   * This step is OPTIONAL and disabled by default until tested
   */
  private static step3_RecoverStructure(content: string, steps: ProcessingStep[]): string {
    const input = content;
    
    try {
      let structured = content;
      
      // ENHANCED: Numbered headings - flexible length, no arbitrary max
      // Matches: "1. AI NEWS", "2. BREAKING: Fed Announces Rate Cut", etc.
      structured = structured
        .replace(/\n\s*(\d+\.\s+[^\n]{3,})\s*\n/g, '\n<h3>$1</h3>\n');
      
      // ENHANCED: All-caps headings - include common punctuation, reasonable max
      // Matches: "MARKET ANALYSIS", "ANALYSIS & OPINION", "QUICK READS:", etc.
      structured = structured
        .replace(/\n\s*([A-Z][A-Z\s&:!?,-]{8,35}[A-Z])\s*\n/g, '\n<h3>$1</h3>\n');
      
      // ENHANCED: Paragraph wrapping - avoid bullet points and lists
      // Matches: long text paragraphs (50+ chars)
      // Avoids: "• Apple releases...", "- Another item...", "* List item..."
      structured = structured
        .replace(/\n\s*([^•*\-\n<>]{50,})\s*\n/g, '\n<p>$1</p>\n');
      
      steps.push({
        stepName: 'recover-structure-enhanced',
        input: input.substring(0, 200) + '...',
        output: structured.substring(0, 200) + '...',
        success: true
      });
      
      return structured;
      
    } catch (error) {
      steps.push({
        stepName: 'recover-structure-enhanced',
        input: input.substring(0, 200) + '...',
        output: content,
        success: false,
        error: error instanceof Error ? error.message : 'Enhanced Step 3 failed'
      });
      
      return content;
    }
  }
    
  /**
   * Step 4: EXPERIMENTAL - Preserve some links
   * This step is OPTIONAL 
   */
  private static step4_PreserveLinks(content: string, steps: ProcessingStep[]): string {
    const input = content;
    
    try {
      // This step would only run on the original HTML before step 1
      // For now, just pass through
      
      steps.push({
        stepName: 'preserve-links',
        input: input.substring(0, 200) + '...',
        output: content.substring(0, 200) + '...',
        success: true
      });
      
      return content;
      
    } catch (error) {
      steps.push({
        stepName: 'preserve-links',
        input: input.substring(0, 200) + '...',
        output: content,
        success: false,
        error: error instanceof Error ? error.message : 'Step 4 failed'
      });
      
      return content;
    }
  }
  
  /**
   * Step 5: EXPERIMENTAL - Handle images
   * This step is OPTIONAL 
   */
  private static step5_HandleImages(content: string, steps: ProcessingStep[]): string {
    const input = content;
    
    try {
      // This step would only run on the original HTML before step 1
      // For now, just pass through
      
      steps.push({
        stepName: 'handle-images',
        input: input.substring(0, 200) + '...',
        output: content.substring(0, 200) + '...',
        success: true
      });
      
      return content;
      
    } catch (error) {
      steps.push({
        stepName: 'handle-images',
        input: input.substring(0, 200) + '...',
        output: content,
        success: false,
        error: error instanceof Error ? error.message : 'Step 5 failed'
      });
      
      return content;
    }
  }
  
  /**
   * Utility: Estimate word count
   */
  private static estimateWordCount(content: string): number {
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  }
}

// Export for testing individual steps
export const TestableSteps = {
  step1_BasicHtmlToText: (content: string) => {
    const steps: ProcessingStep[] = [];
    return IncrementalNewsletterParser['step1_BasicHtmlToText'](content, steps);
  },
  step2_CleanWhitespace: (content: string) => {
    const steps: ProcessingStep[] = [];
    return IncrementalNewsletterParser['step2_CleanWhitespace'](content, steps);
  },
  step3_RecoverStructure: (content: string) => {
    const steps: ProcessingStep[] = [];
    return IncrementalNewsletterParser['step3_RecoverStructure'](content, steps);
  }
};

// -----------------------------------------------------------------------------
// Legacy compatibility layer – maintains original NewsletterParser API
// -----------------------------------------------------------------------------
export class NewsletterParser {
  /**
   * Original entry-point retained so existing code continues to compile.
   * Internally delegates the heavy lifting to IncrementalNewsletterParser.
   */
  static parseToCleanHTML(rawHTML: string, options: any = {}): ParseResult {
    const result = IncrementalNewsletterParser.parseNewsletter(rawHTML, options);

    return {
      ...result,
      cleanHTML: result.finalOutput,
      metadata: {
        ...result.metadata,
        processingSteps: result.steps.map((s) => s.stepName)
      }
    } as ParseResult;
  }
}