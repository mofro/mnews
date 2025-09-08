import DOMPurify from 'dompurify';
import logger from '../utils/logger.js';

interface ProcessedContent {
  content: string;
  warnings: string[];
  hasContent: boolean;
}

/**
 * Processes article content with proper sanitization and fallbacks
 * @param article - The article object containing content to process
 * @returns Processed content with warnings and content availability flag
 */
export function processArticleContent(article: {
  content?: string | null;
  rawContent?: string | null;
  cleanContent?: string | null;
  url?: string;
}): ProcessedContent {
  const warnings: string[] = [];
  const debugInfo = {
    hasContent: Boolean(article.content?.trim()),
    hasRawContent: Boolean(article.rawContent?.trim()),
    hasCleanContent: Boolean(article.cleanContent?.trim()),
    hasUrl: Boolean(article.url)
  };

  // Always log content processing details in development
  const logDebug = (message: string, data: any = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[ContentProcessor] ${message}`, data);
    }
    logger.debug(`[ContentProcessor] ${message}`, data);
  };

  logDebug('Processing article content', {
    ...debugInfo,
    contentLength: article.content?.length,
    cleanContentLength: article.cleanContent?.length,
    rawContentLength: article.rawContent?.length,
    contentPreview: article.content?.substring(0, 150) + '...',
    cleanContentPreview: article.cleanContent?.substring(0, 150) + '...',
    rawContentPreview: article.rawContent?.substring(0, 150) + '...',
    hasUrl: Boolean(article.url)
  });

  // 1. Content source selection with priority
  let contentToProcess = '';
  let source = 'none';
  
  // Priority order: cleanContent > content > rawContent
  if (article.cleanContent?.trim()) {
    contentToProcess = article.cleanContent.trim();
    source = 'cleanContent';
    logDebug('Using cleanContent as content source', { length: contentToProcess.length });
  } else if (article.content?.trim()) {
    contentToProcess = article.content.trim();
    source = 'content';
    logDebug('Using content as content source', { length: contentToProcess.length });
  } else if (article.rawContent?.trim()) {
    contentToProcess = article.rawContent.trim();
    source = 'rawContent';
    warnings.push('Using rawContent as fallback');
  }

  // 2. Handle empty content
  if (!contentToProcess) {
    const warning = 'No valid content found in any content field';
    warnings.push(warning);
    
    return {
      content: '<p class="empty-content">No content available for this article.</p>',
      warnings,
      hasContent: false
    };
  }

  // 3. Clean and prepare HTML before sanitization
  const cleanedContent = contentToProcess
    // Fix common malformed tags and attributes first
    .replace(/<\/?di>/g, '') // Remove malformed <di> tags
    .replace(/<\/?titl[^>]*>/g, '') // Remove malformed <titl> tags
    
    // Fix unclosed HTML tags and malformed structure
    .replace(/<\/?(html|head|body)[^>]*>/g, '') // Remove any HTML/HEAD/BODY tags
    
    // Fix malformed image tags
    .replace(/<img([^>]*)>/g, (_match, attrs) => {
      // Ensure img tags are properly closed and have required attributes
      let fixedAttrs = attrs;
      
      // Ensure src attribute is present
      if (!/src=/.test(attrs)) {
        fixedAttrs = 'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" ' + fixedAttrs;
      }
      
      // Ensure alt attribute is present
      if (!/alt=/.test(attrs)) {
        fixedAttrs += ' alt=""';
      }
      
      return `<img${fixedAttrs} />`;
    })
    
    // Fix unclosed tags (except self-closing ones)
    .replace(/<([a-z]+)([^>]*[^/])?>(?![\s\S]*<\/\1>)/gi, (_match, tag, _attrs = '') => {
      const selfClosingTags = ['img', 'br', 'hr', 'meta', 'link', 'input'];
      // Don't close self-closing tags
      if (selfClosingTags.includes(tag.toLowerCase())) {
        return _match.endsWith('/>') ? _match : `${_match.replace(/\/?>$/, '')} />`;
      }
      return `${_match}</${tag}>`;
    })
    
    // Remove empty paragraphs and divs that can cause layout issues
    .replace(/<p[^>]*>\s*<\/p>/g, '')
    .replace(/<div[^>]*>\s*<\/div>/g, '')
    .replace(/<span[^>]*>\s*<\/span>/g, '');

  // 4. Sanitize the content
  let sanitized = '';
  try {
    const sanitizeConfig = {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'div', 'span', 'a', 'img',
        'ul', 'ol', 'li', 'strong', 'em', 'u',
        'blockquote', 'pre', 'code', 'hr',
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
      ADD_ATTR: ['target', 'rel'],
      FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload']
    };
    
    sanitized = DOMPurify.sanitize(cleanedContent, sanitizeConfig);
    
    if (!sanitized) {
      throw new Error('Content was removed during sanitization');
    }

    // 5. Post-process the sanitized content
    let finalContent = sanitized;
    
    // Add source attribution if we have a URL
    if (article.url) {
      finalContent += `
        <div class="article-source">
          <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="source-link">
            View original article
          </a>
        </div>`;
    }

    // Log success
    logDebug('Successfully processed content', {
      source,
      originalLength: contentToProcess.length,
      processedLength: finalContent.length,
      warningCount: warnings.length
    });

    return {
      content: finalContent,
      warnings,
      hasContent: true
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during content processing';
    logDebug('Error processing content', { error: errorMessage, source });
    
    return {
      content: `<div class="error-content">
        <p>Unable to display article content due to an error.</p>
        ${warnings.length > 0 ? `<div class="warnings">
          <p>Warnings encountered:</p>
          <ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>` : ''}
      </div>`,
      warnings: [...warnings, `Processing error: ${errorMessage}`],
      hasContent: false
    };
  }
}
