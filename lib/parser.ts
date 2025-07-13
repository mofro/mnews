// FILE: /lib/parser.ts
// NewsletterParser - Convert complex HTML newsletters to clean, readable HTML

export interface ParseResult {
  cleanHTML: string;
  metadata: {
    processingSteps: string[];
    processingVersion: string;
    processedAt: string;
    wordCount: number;
    compressionRatio: string;
    error?: string;
  };
}

export class NewsletterParser {
  
  /**
   * Main entry point - convert raw newsletter HTML to clean HTML
   * @param rawHTML - Original email HTML content
   * @param options - Parsing configuration
   * @returns { cleanHTML, metadata }
   */
  static parseToCleanHTML(rawHTML: string, options: any = {}): ParseResult {
    const config = {
      preserveLinks: true,
      preserveImages: false,
      maxListNesting: 3,
      ...options
    };
    
    try {
      let result = { html: rawHTML, metadata: { processingSteps: [] as string[] } };
      
      result = this.preprocess(result.html, result.metadata, config);
      result = this.extractStructure(result.html, result.metadata, config);
      result = this.cleanLayoutArtifacts(result.html, result.metadata);
      result = this.preserveFormat(result.html, result.metadata, config);
      result = this.sanitize(result.html, result.metadata);
      
      return {
        cleanHTML: result.html,
        metadata: {
          ...result.metadata,
          processingVersion: '2.6.1-artifact-cleanup',
          processedAt: new Date().toISOString(),
          wordCount: this.estimateWordCount(result.html),
          compressionRatio: ((rawHTML.length - result.html.length) / rawHTML.length * 100).toFixed(1) + '%'
        }
      };
      
    } catch (error) {
      console.error('NewsletterParser error:', error);
      return {
        cleanHTML: this.basicCleanup(rawHTML),
        metadata: {
          processingSteps: [] as string[],
          processingVersion: '2.6.1-fallback',
          processedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          wordCount: this.estimateWordCount(rawHTML),
          compressionRatio: '0%'
        }
      };
    }
  }

  /**
   * Stage 1: Preprocess and normalize HTML structure
   */
  private static preprocess(html: string, metadata: { processingSteps: string[] }, config: any) {
    metadata.processingSteps.push('preprocess');
    
    // Remove style and script blocks
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove common tracking and layout tables
    html = html.replace(/<table[^>]*class[^>]*spacer[^>]*>[\s\S]*?<\/table>/gi, '');
    html = html.replace(/<table[^>]*width\s*=\s*["']?100%["']?[^>]*>[\s\S]*?<\/table>/gi, function(match) {
      if (match.length < 200 && !/\w{10,}/.test(match.replace(/<[^>]*>/g, ''))) {
        return '';
      }
      return match;
    });
    
    return { html, metadata };
  }

  /**
   * Stage 2: Extract meaningful content structure
   */
  private static extractStructure(html: string, metadata: { processingSteps: string[] }, config: any) {
    metadata.processingSteps.push('extract-structure');
    
    // Convert common newsletter structures to semantic HTML
    html = html.replace(/<td[^>]*class[^>]*header[^>]*>([\s\S]*?)<\/td>/gi, '<h2>$1</h2>');
    html = html.replace(/<td[^>]*class[^>]*title[^>]*>([\s\S]*?)<\/td>/gi, '<h3>$1</h3>');
    
    // Extract list-like content from tables
    html = html.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, function(match, content) {
      const cells = content.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (cells && cells.length === 1) {
        return '<li>' + cells[0].replace(/<\/?td[^>]*>/gi, '') + '</li>';
      }
      return match;
    });
    
    return { html, metadata };
  }

  /**
   * Stage 2.5: Clean layout artifacts (NEW)
   */
  private static cleanLayoutArtifacts(html: string, metadata: { processingSteps: string[] }) {
    metadata.processingSteps.push('clean-layout-artifacts');
    
    // Remove tracking images
    html = html.replace(/<img[^>]*>/gi, function(match) {
      const attrs = match.toLowerCase();
      
      // 1. Explicit display:none style
      if (/style[^=]*=["'][^"']*display\s*:\s*none/i.test(attrs)) {
        return '';
      }
      
      // 2. Visibility:hidden style
      if (/style[^=]*=["'][^"']*visibility\s*:\s*hidden/i.test(attrs)) {
        return '';
      }
      
      // 3. 1x1 pixel dimensions
      if ((/width\s*=\s*["']?1["']?/i.test(attrs) && /height\s*=\s*["']?1["']?/i.test(attrs)) ||
          (/style[^=]*=["'][^"']*width\s*:\s*1px/i.test(attrs) && /style[^=]*=["'][^"']*height\s*:\s*1px/i.test(attrs))) {
        return '';
      }
      
      // 4. Zero dimensions
      if ((/width\s*=\s*["']?0["']?/i.test(attrs) && /height\s*=\s*["']?0["']?/i.test(attrs)) ||
          (/style[^=]*=["'][^"']*width\s*:\s*0px/i.test(attrs) && /style[^=]*=["'][^"']*height\s*:\s*0px/i.test(attrs))) {
        return '';
      }
      
      // 5. Common tracking domains/paths
      const trackingPatterns = [
        /src[^=]*=["'][^"']*\/track/i,
        /src[^=]*=["'][^"']*\/pixel/i,
        /src[^=]*=["'][^"']*\/analytics/i,
        /src[^=]*=["'][^"']*\/open/i,
        /src[^=]*=["'][^"']*\/impression/i,
        /src[^=]*=["'][^"']*\.gif\?/i,
        /src[^=]*=["'][^"']*mailer.*\/[^"']*$/i,
      ];
      
      for (const pattern of trackingPatterns) {
        if (pattern.test(attrs)) {
          return '';
        }
      }
      
      // 6. Empty alt & tracking query params
      if (/alt\s*=\s*["']?\s*["']?/i.test(attrs) && /src[^=]*=["'][^"']*\?[^"']*$/i.test(attrs)) {
        return '';
      }
      
      // Keep the image if it passes all checks
      return match;
    });
    
    // Remove empty table structures
    html = html.replace(/<table[^>]*>\s*<\/table>/gi, '');
    html = html.replace(/<tr[^>]*>\s*<\/tr>/gi, '');
    html = html.replace(/<td[^>]*>\s*<\/td>/gi, '');
    
    return { html, metadata };
  }

  /**
   * Stage 3: Preserve formatting and structure
   */
  private static preserveFormat(html: string, metadata: { processingSteps: string[] }, config: any) {
    metadata.processingSteps.push('preserve-format');
    
    // Clean up nested tables but preserve content
    html = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, function(match, content) {
      // If table has meaningful content, preserve it
      const textContent = content.replace(/<[^>]*>/g, ' ').trim();
      if (textContent.length > 50) {
        return '<div class="content-block">' + content + '</div>';
      }
      return content;
    });
    
    // Convert remaining table cells to paragraphs
    html = html.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, '<p>$1</p>');
    html = html.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, '<h4>$1</h4>');
    
    return { html, metadata };
  }

  /**
   * Stage 4: Final sanitization and cleanup
   */
  private static sanitize(html: string, metadata: { processingSteps: string[] }) {
    metadata.processingSteps.push('sanitize');
    
    // Remove remaining table tags
    html = html.replace(/<\/?table[^>]*>/gi, '');
    html = html.replace(/<\/?tr[^>]*>/gi, '');
    html = html.replace(/<\/?tbody[^>]*>/gi, '');
    html = html.replace(/<\/?thead[^>]*>/gi, '');
    
    // Clean up whitespace and empty elements
    html = html.replace(/\s+/g, ' ');
    html = html.replace(/<p>\s*<\/p>/gi, '');
    html = html.replace(/<div>\s*<\/div>/gi, '');
    html = html.replace(/<h[1-6]>\s*<\/h[1-6]>/gi, '');
    
    // Final HTML entity cleanup
    html = html.replace(/&nbsp;/g, ' ');
    html = html.replace(/&amp;/g, '&');
    html = html.replace(/&lt;/g, '<');
    html = html.replace(/&gt;/g, '>');
    html = html.replace(/&quot;/g, '"');
    html = html.replace(/&#39;/g, "'");
    
    return { html, metadata };
  }

  /**
   * Fallback: Basic cleanup for error cases
   */
  private static basicCleanup(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Utility: Estimate word count
   */
  private static estimateWordCount(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  }
}