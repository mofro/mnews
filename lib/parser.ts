// FILE: /lib/parser.js
// NewsletterParser - Convert complex HTML newsletters to clean, readable HTML
// Drop this file into your project - doesn't modify any existing code

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
     * @param {string} rawHTML - Original email HTML content
     * @param {Object} options - Parsing configuration
     * @returns {Object} - { cleanHTML, metadata }
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
        result = this.preserveFormat(result.html, result.metadata, config);
        result = this.sanitize(result.html, result.metadata);
        
        return {
          cleanHTML: result.html,
          metadata: {
            ...result.metadata,
            processingVersion: '2.6.0-structure-preservation',
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
            processingVersion: '2.6.0-fallback',
            processedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
            wordCount: this.estimateWordCount(rawHTML),
            compressionRatio: '0%'
          }
        };
      }
    }
    
    /**
     * Enhanced Stage 1: Safer email table processing
     */
    static preprocess(html: string, metadata: { processingSteps: string[] }, config: any): { html: string, metadata: { processingSteps: string[] } } {
      metadata.processingSteps.push('preprocess');
      
      let cleaned = html;
      
      cleaned = cleaned
        // Remove entire style blocks (including those massive CSS media queries)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove script blocks  
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        // ENHANCED: Smart image filtering replaces blanket removal of tracking pixels
        .replace(/(<img[^>]*>)/gi, (match) => this.filterImages(match, config.preserveImages))
        // Remove those invisible character sequences from email templates
        .replace(/͏[\s\u00A0\u00AD]*­͏[\s\u00A0\u00AD]*/g, ' ')
        
        // ENHANCED BUT SAFE: Better email table handling
        // Strategy: Handle specific problematic patterns without being too aggressive
        
        // 1. Handle Substack-style nested tables with presentation role
        .replace(/<table[^>]*role\s*=\s*["']presentation["'][^>]*>[\s\S]*?<\/table>/gi, (match) => {
          // First, try to extract meaningful content from table cells
          let content = match
            // Extract content from table cells, preserve paragraphs/headings inside
            .replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (cellMatch, cellContent) => {
              // If cell contains semantic elements, preserve structure
              if (/<(?:h[1-6]|p|ul|ol|li|a|strong|em|img)\b[^>]*>/i.test(cellContent)) {
                return cellContent + ' ';
              } else {
                // Otherwise just extract text with spacing
                return cellContent.replace(/<[^>]+>/g, ' ') + ' ';
              }
            })
            // Remove remaining table structure
            .replace(/<\/?(?:table|tbody|tr|thead|tfoot|th)[^>]*>/gi, ' ')
            // Clean up excessive whitespace
            .replace(/\s{2,}/g, ' ');
          
          return content;
        })
        
        // 2. Handle simpler tables (non-presentation role) more conservatively
        .replace(/<table(?![^>]*role\s*=\s*["']presentation["'])[^>]*>[\s\S]*?<\/table>/gi, (match) => {
          // For non-presentation tables, just remove table tags but preserve all content
          return match.replace(/<\/?(?:table|tbody|tr|thead|tfoot)[^>]*>/gi, ' ')
                      .replace(/<t[hd][^>]*>/gi, ' ')
                      .replace(/<\/t[hd]>/gi, ' ');
        })
        
        // 3. Clean up specific problematic patterns that create artifacts
        // Remove empty table cells that might become artifacts
        .replace(/<t[dh][^>]*>\s*<\/t[dh]>/gi, ' ')
        // Remove table rows that only contain whitespace/empty cells
        .replace(/<tr[^>]*>[\s\u00A0]*<\/tr>/gi, ' ')
        
        // 4. Handle email wrapper divs more carefully
        .replace(/<div[^>]*class="[^"]*(?:email|newsletter|wrapper|container)[^"]*"[^>]*>/gi, '<div>')
        
        // 5. Clean up email-specific styling divs but preserve content
        .replace(/<div[^>]*style="[^"]*(?:margin|padding|width):[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1')
        
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
      
      return { html: cleaned, metadata };
    }

    /**
     * Stage 2: Extract and preserve semantic structure
     */
    static extractStructure(html: string, metadata: { processingSteps: string[] }, config: any): { html: string, metadata: { processingSteps: string[] } } {
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
    
    // ADDITIONAL SAFETY: Enhanced artifact cleanup in preserveFormat
    static preserveFormat(html: string, metadata: { processingSteps: string[] }, config: any): { html: string, metadata: { processingSteps: string[] } } {
      metadata.processingSteps.push('preserve-format');
      
      let formatted = html;
      
      // Remove unwanted HTML tags while preserving attributes on allowed tags
      formatted = formatted.replace(/<(?!\/?)(?!(?:h[1-6]|p|ul|ol|li|a|strong|em|br|img)\b)[^>]*>/gi, ' ');
      // Remove any stray malformed tags
      formatted = formatted.replace(/<(?![\/]?(?:h[1-6]|p|ul|ol|li|a|strong|em|br|img))[^>]*(?!>)/gi, ' ');
      
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
        // Remove specific patterns that create v&gt;, d&gt;, etc artifacts
        .replace(/\s*[vdrye]&gt;\s*/gi, ' ')  // Remove letter + &gt; patterns
        .replace(/\s*"&gt;\s*/gi, ' ')        // Remove "&gt; patterns  
        .replace(/\s*n&gt;\s*/gi, ' ')        // Remove n&gt; patterns
        .replace(/\s*&gt;\s*/gi, ' ')         // Remove standalone &gt;
        
        // But be conservative - only remove if they're clearly artifacts
        .replace(/(?:^|\s)[vdrye]&gt;(?=\s|$)/gi, ' ')  // Only remove if isolated
        
        // Standard whitespace cleanup
        .replace(/\n{3,}/g, '\n\n')  // Collapse multiple line breaks
        .replace(/[ \t]{2,}/g, ' ')  // Collapse multiple spaces
        .replace(/>\s+</g, '><')     // Remove space between tags
        .trim();
      
      return { html: formatted, metadata };
    }
    /**
     * Stage 4: Security cleanup
     */
    static sanitize(html: string, metadata: { processingSteps: string[] }): { html: string, metadata: { processingSteps: string[] } } {
      metadata.processingSteps.push('sanitize');
      
      let sanitized = html;
      
      // Remove dangerous URLs
      sanitized = sanitized.replace(/href="javascript:[^"]*"/gi, 'href="#"');
      sanitized = sanitized.replace(/href="data:[^"]*"/gi, 'href="#"');
      
      // Remove any remaining event handlers
      sanitized = sanitized.replace(/\son\w+="[^"]*"/gi, '');
      
      // Final cleanup
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
      
      return { html: sanitized, metadata };
    }
    
    /**
     * Enhanced image filtering - preserve real images, remove tracking pixels
     */
    static filterImages(html: string, preserveImages: boolean): string {
      if (!preserveImages) {
        // Remove all images if not preserving
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
        // Preserve real images – clean styles & handlers
        return match
          .replace(/style\s*=\s*["']([^"']*)\bvisibility\s*:\s*hidden\b([^"']*)["']/gi, (m, before, after) => {
            const cleanStyle = (before + after).replace(/;\s*;/g, ';').replace(/^;|;$/g, '').trim();
            return cleanStyle ? `style="${cleanStyle}"` : '';
          })
          .replace(/style\s*=\s*["']([^"']*)\bdisplay\s*:\s*none\b([^"']*)["']/gi, (m, before, after) => {
            const cleanStyle = (before + after).replace(/;\s*;/g, ';').replace(/^;|;$/g, '').trim();
            return cleanStyle ? `style="${cleanStyle}"` : '';
          })
          .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
      });
    }

    /**
     * Helper: Preserve list structure and hierarchy
     */
    static preserveLists(html: string, maxNesting: number) {
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
     * Helper: Clean content inside list items
     */
    static cleanListContent(content: string) {
      return content
        .replace(/<li[^>]*>\s*<\/li>/gi, '') // Remove empty items
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    /**
     * Helper: Clean inline content (remove styling but preserve text)
     */
    static cleanInlineContent(content: string) {
      return content
        .replace(/<(?!\/?)(?!(?:h[1-6]|p|ul|ol|li|a|strong|em|br|img)\b)[^>]*>/gi, ' ') // Remove all tags except the ones we want to keep
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    /**
     * Helper: Sanitize URLs to prevent XSS
     */
    static sanitizeUrl(url: string) {
      // Only allow safe protocols
      if (/^https?:\/\//.test(url) || /^mailto:/.test(url)) {
        return url;
      }
      return null; // Remove suspicious URLs
    }
    
    /**
     * Helper: Estimate word count from HTML
     */
    static estimateWordCount(html: string) {
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return text ? text.split(' ').length : 0;
    }
    
    /**
     * Fallback: Basic cleanup if main parser fails
     */
    static basicCleanup(html: string) {
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // SAFETY VALVE: Add detection for newsletter platform
    static detectNewsletterPlatform(html: string): string {
      const patterns = {
        'substack': /substackcdn\.com|substack\.com/i,
        'mailchimp': /mailchimp\.com|mc\.us/i,
        'convertkit': /convertkit\.com|ck\.page/i,
        'ghost': /ghost\.org|ghost\.io/i,
        'buttondown': /buttondown\.email/i,
        'beehiiv': /beehiiv\.com/i,
        'revue': /revue\.co|getrevue\.co/i
      };
      
      for (const [platform, pattern] of Object.entries(patterns)) {
        if (pattern.test(html)) {
          return platform;
        }
      }
      
      return 'unknown';
    }

    // DEFENSIVE PROCESSING: Apply platform-specific tweaks if needed
    static applyPlatformSpecificProcessing(html: string, platform: string): string {
      switch (platform) {
        case 'substack':
          // Substack-specific cleanup for those weird table artifacts
          return html.replace(/\s*[vdrye]\s*&gt;\s*/gi, ' ');
        
        case 'mailchimp':
          // Mailchimp often has heavy div nesting
          return html.replace(/<div[^>]*style="[^"]*text-align[^"]*"[^>]*>/gi, '<div>');
        
        default:
          return html;
      }
    }
  }
  
  // Export for Node.js
  // if (typeof module !== 'undefined' && module.exports) {
  //   module.exports = { NewsletterParser };
  // }
  
  // Export for ES6 modules (if using import/export)
  // export { NewsletterParser };