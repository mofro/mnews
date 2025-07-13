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
   * Stage 1: Preprocessing - Remove noise and normalize structure
   */
  private static preprocess(html: string, metadata: { processingSteps: string[] }, config: any): { html: string, metadata: { processingSteps: string[] } } {
    metadata.processingSteps.push('preprocess');
    
    let cleaned = html;
    
    // 1. Remove script and style blocks entirely
    cleaned = cleaned
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // 2. Filter images based on configuration
    cleaned = this.filterImages(cleaned, config.preserveImages);
    
    // 3. Remove presentation tables and email layout containers
    cleaned = cleaned
      // Remove presentation tables (role="presentation" or obvious layout tables)
      .replace(/<table[^>]*role\s*=\s*["']presentation["'][^>]*>[\s\S]*?<\/table>/gi, ' ')
      
      // Remove tables that are clearly for spacing/layout (very conservative)
      .replace(/<table[^>]*class="[^"]*(?:spacer|layout|container|wrapper)[^"]*"[^>]*>[\s\S]*?<\/table>/gi, ' ')
      
      // Handle simpler tables (non-presentation role) more conservatively
      .replace(/<table(?![^>]*role\s*=\s*["']presentation["'])[^>]*>[\s\S]*?<\/table>/gi, (match) => {
        // For non-presentation tables, just remove table tags but preserve all content
        return match.replace(/<\/?(?:table|tbody|tr|thead|tfoot)[^>]*>/gi, ' ')
                    .replace(/<t[hd][^>]*>/gi, ' ')
                    .replace(/<\/t[hd]>/gi, ' ');
      })
      
      // Clean up specific problematic patterns that create artifacts
      .replace(/<t[dh][^>]*>\s*<\/t[dh]>/gi, ' ')
      .replace(/<tr[^>]*>[\s\u00A0]*<\/tr>/gi, ' ')
      
      // Handle email wrapper divs more carefully
      .replace(/<div[^>]*class="[^"]*(?:email|newsletter|wrapper|container)[^"]*"[^>]*>/gi, '<div>')
      
      // Clean up email-specific styling divs but preserve content
      .replace(/<div[^>]*style="[^"]*(?:margin|padding|width):[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1')
      
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    
    return { html: cleaned, metadata };
  }

  /**
   * Stage 2: Extract and preserve semantic structure
   */
  private static extractStructure(html: string, metadata: { processingSteps: string[] }, config: any): { html: string, metadata: { processingSteps: string[] } } {
    metadata.processingSteps.push('extract-structure');
    
    let structured = html;
    
    // Convert headers - preserve hierarchy, remove styling
    structured = structured
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (match, level, content) => {
        const cleanContent = this.cleanInlineContent(content);
        return `<h${level}>${cleanContent}</h${level}>`;
      });
    
    // Convert paragraphs - remove inline styles but preserve structure
    structured = structured
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, content) => {
        const cleanContent = this.cleanInlineContent(content);
        return cleanContent.trim() ? `<p>${cleanContent}</p>` : '';
      });
    
    // Convert lists - preserve nesting and list types
    structured = this.preserveLists(structured, config.maxListNesting);
    
    // Convert links if requested
    if (config.preserveLinks) {
      structured = structured
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
          const cleanText = this.cleanInlineContent(text);
          const cleanUrl = this.sanitizeUrl(url);
          return cleanUrl ? `<a href="${cleanUrl}">${cleanText}</a>` : cleanText;
        });
    }
    
    return { html: structured, metadata };
  }

  /**
   * Stage 2.5: Clean up email layout artifacts - MODERATE RISK APPROACH
   */
  private static cleanLayoutArtifacts(html: string, metadata: { processingSteps: string[] }): { html: string, metadata: { processingSteps: string[] } } {
    metadata.processingSteps.push('clean-layout-artifacts');
    
    let cleaned = html;
    
    // MODERATE RISK: Remove patterns that are very likely artifacts
    cleaned = cleaned
      // Remove the specific artifact patterns we've seen consistently
      .replace(/\s*[vdryen]>\s*/gi, ' ')              // The main culprits - RAW > characters
      .replace(/\s*">\s*/g, ' ')                      // Quote-greater patterns
      .replace(/\s*br>\s*/gi, ' ')                    // br> artifacts (not <br> tags)
      
      // Clean up HTML entities that are clearly artifacts  
      .replace(/\s*&gt;\s*/g, ' ')                    // &gt; patterns (existing logic)
      
      // Remove the invisible character sequences (very safe)
      .replace(/͏[\s\u00A0\u00AD]*­͏[\s\u00A0\u00AD]*/g, ' ')
      
      // Clean up excessive whitespace from removals
      .replace(/\s{2,}/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return { html: cleaned, metadata };
  }

  /**
   * Stage 3: Preserve formatting while removing unwanted elements
   */
  private static preserveFormat(html: string, metadata: { processingSteps: string[] }, config: any): { html: string, metadata: { processingSteps: string[] } } {
    metadata.processingSteps.push('preserve-format');
    
    let formatted = html;
    
    // Remove unwanted HTML tags while preserving attributes on allowed tags
    formatted = formatted.replace(/<(?!\/?)(?!(?:h[1-6]|p|ul|ol|li|a|strong|em|br|img)\b)[^>]*>/gi, ' ');
    
    // ENHANCED: More comprehensive HTML entity cleanup
    formatted = formatted
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      // Additional common email entities
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&hellip;/g, '…');
    
    // ENHANCED BUT SAFE: Clean up table-related artifacts
    formatted = formatted
      // EXISTING: Remove specific patterns that create v&gt;, d&gt;, etc artifacts
      .replace(/\s*[vdrye]&gt;\s*/gi, ' ')  // Remove letter + &gt; patterns
      .replace(/\s*"&gt;\s*/gi, ' ')        // Remove "&gt; patterns  
      .replace(/\s*n&gt;\s*/gi, ' ')        // Remove n&gt; patterns
      .replace(/\s*&gt;\s*/gi, ' ')         // Remove standalone &gt;
      
      // NEW: Also catch the non-entity versions (raw > characters)
      .replace(/\s*[vdryen]>\s*/gi, ' ')     // Remove letter + > patterns (raw characters)
      .replace(/\s*">\s*/g, ' ')             // Remove "> patterns (raw characters)
      .replace(/\s*br>\s*/gi, ' ')           // Remove br> artifacts (not <br> tags)
      
      // Clean up remaining whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return { html: formatted, metadata };
  }

  /**
   * Stage 4: Final sanitization and security cleanup
   */
  private static sanitize(html: string, metadata: { processingSteps: string[] }): { html: string, metadata: { processingSteps: string[] } } {
    metadata.processingSteps.push('sanitize');
    
    let sanitized = html;
    
    // Remove dangerous URLs
    sanitized = sanitized.replace(/href="javascript:[^"]*"/gi, 'href="#"');
    sanitized = sanitized.replace(/href="data:[^"]*"/gi, 'href="#"');
    
    // Remove any remaining event handlers
    sanitized = sanitized.replace(/\son\w+="[^"]*"/gi, '');
    
    // Clean up empty elements
    sanitized = sanitized.replace(/<p>\s*<\/p>/gi, '');
    sanitized = sanitized.replace(/<h[1-6]>\s*<\/h[1-6]>/gi, '');
    sanitized = sanitized.replace(/<li>\s*<\/li>/gi, '');
    
    // Final cleanup
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return { html: sanitized, metadata };
  }

  /**
   * Enhanced image filtering - preserve real images, remove tracking pixels
   */
  private static filterImages(html: string, preserveImages: boolean): string {
    if (!preserveImages) {
      return html.replace(/<img[^>]*>/gi, '');
    }
    
    // Enhanced tracking pixel detection
    return html.replace(/<img([^>]*)>/gi, (match, attributes) => {
      const attrs = attributes.toLowerCase();
      
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
  }

  /**
   * Helper: Preserve list structures with proper nesting
   */
  private static preserveLists(html: string, maxNesting: number): string {
    // Convert unordered lists
    html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const cleanContent = this.cleanListContent(content);
      return `<ul>${cleanContent}</ul>`;
    });
    
    // Convert ordered lists
    html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      const cleanContent = this.cleanListContent(content);
      return `<ol>${cleanContent}</ol>`;
    });
    
    // Convert list items
    html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, content) => {
      const cleanContent = this.cleanInlineContent(content);
      return cleanContent.trim() ? `<li>${cleanContent}</li>` : '';
    });
    
    return html;
  }

  /**
   * Helper: Clean content within list elements
   */
  private static cleanListContent(content: string): string {
    return content
      .replace(/<(?!\/?)(?!(?:li|ul|ol)\b)[^>]*>/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper: Clean inline content while preserving basic formatting
   */
  private static cleanInlineContent(content: string): string {
    return content
      .replace(/<(?!\/?)(?!(?:strong|em|b|i|u)\b)[^>]*>/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper: Sanitize URLs to prevent XSS
   */
  private static sanitizeUrl(url: string): string | null {
    // Only allow safe protocols
    if (/^https?:\/\//.test(url) || /^mailto:/.test(url)) {
      return url;
    }
    return null; // Remove suspicious URLs
  }

  /**
   * Helper: Estimate word count from HTML
   */
  private static estimateWordCount(html: string): number {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  }

  /**
   * Fallback: Basic cleanup if main parser fails
   */
  private static basicCleanup(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }
}