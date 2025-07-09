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
        let result = { html: rawHTML, metadata: { processingSteps: [] } };
        
        result = this.preprocess(result.html, result.metadata);
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
            processingVersion: '2.6.0-fallback',
            processedAt: new Date().toISOString(),
            error: error.message,
            wordCount: this.estimateWordCount(rawHTML),
            compressionRatio: '0%'
          }
        };
      }
    }
    
    /**
     * Stage 1: Remove email cruft and noise
     */
    static preprocess(html, metadata) {
      metadata.processingSteps.push('preprocess');
      
      let cleaned = html;
      
      cleaned = cleaned
        // Remove entire style blocks (including those massive CSS media queries)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove script blocks  
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        // Remove tracking pixels and tiny images
        .replace(/<img[^>]*(?:width|height)="1"[^>]*>/gi, '')
        // Remove those invisible character sequences from email templates
        .replace(/͏[\s\u00A0\u00AD]*­͏[\s\u00A0\u00AD]*/g, ' ')
        // Remove email table wrapper cruft but keep content
        .replace(/<table[^>]*role="presentation"[^>]*>[\s\S]*?<\/table>/gi, (match) => {
          return match.replace(/<\/?(?:table|tbody|tr|td)[^>]*>/gi, ' ');
        })
        // Clean up email-specific divs
        .replace(/<div[^>]*class="[^"]*(?:email|preview|header|footer)[^"]*"[^>]*>/gi, '<div>')
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
      
      return { html: cleaned, metadata };
    }
    
    /**
     * Stage 2: Extract and preserve semantic structure
     */
    static extractStructure(html, metadata, config) {
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
     * Stage 3: Clean up remaining HTML while preserving format
     */
    static preserveFormat(html, metadata, config) {
      metadata.processingSteps.push('preserve-format');
      
      let formatted = html;
      
      // Remove all HTML tags except the ones we want to keep
      formatted = formatted.replace(/<(?!\/?(?:h[1-6]|p|ul|ol|li|a|strong|em|br)\b)[^>]+>/gi, ' ');
      
      // Clean up HTML entities
      formatted = formatted
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"');
      
      // Normalize whitespace
      formatted = formatted
        .replace(/\n{3,}/g, '\n\n')  // Collapse multiple line breaks
        .replace(/[ \t]{2,}/g, ' ')  // Collapse multiple spaces
        .replace(/>\s+</g, '><')     // Remove space between tags
        .trim();
      
      return { html: formatted, metadata };
    }
    
    /**
     * Stage 4: Security cleanup
     */
    static sanitize(html, metadata) {
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
     * Helper: Preserve list structure and hierarchy
     */
    static preserveLists(html, maxNesting) {
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
    static cleanListContent(content) {
      return content
        .replace(/<li[^>]*>\s*<\/li>/gi, '') // Remove empty items
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    /**
     * Helper: Clean inline content (remove styling but preserve text)
     */
    static cleanInlineContent(content) {
      return content
        .replace(/<(?!\/?(strong|em|a)\b)[^>]+>/gi, ' ') // Keep only basic formatting
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    /**
     * Helper: Sanitize URLs to prevent XSS
     */
    static sanitizeUrl(url) {
      // Only allow safe protocols
      if (/^https?:\/\//.test(url) || /^mailto:/.test(url)) {
        return url;
      }
      return null; // Remove suspicious URLs
    }
    
    /**
     * Helper: Estimate word count from HTML
     */
    static estimateWordCount(html) {
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return text ? text.split(' ').length : 0;
    }
    
    /**
     * Fallback: Basic cleanup if main parser fails
     */
    static basicCleanup(html) {
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
  
  // Export for Node.js
  // if (typeof module !== 'undefined' && module.exports) {
  //   module.exports = { NewsletterParser };
  // }
  
  // Export for ES6 modules (if using import/export)
  // export { NewsletterParser };