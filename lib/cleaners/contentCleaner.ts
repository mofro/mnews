interface CleaningRule {
  id: string;
  description: string;
  pattern: RegExp;
  replacement: string;
  enabled: boolean;
}

// Common patterns for tracking elements, ads, and promotional content
const CLEANING_RULES: CleaningRule[] = [
  // Remove tracking pixels and 1x1 images
  {
    id: 'remove-tracking-pixels',
    description: 'Remove tracking pixels, beacons, and 1x1 images',
    pattern: /<img[^>]*(?:width=["']?1["']?|height=["']?1["']?|style=["'][^"']*display\s*:\s*none[^"']*["'])[^>]*>/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove common ad containers and promos
  {
    id: 'remove-ad-containers',
    description: 'Remove ad containers, banners, and promotional content',
    pattern: /<(?:div|section|aside)[^>]*(?:class|id)=["'][^"']*\b(?:ad|ads|advertisement|banner|sponsor|promo|promotion)\b[^"']*["'][^>]*>.*?<\/(?:div|section|aside)>/gis,
    replacement: '',
    enabled: true
  },
  
  // Remove email client specific elements and scripts
  {
    id: 'remove-email-client-elements',
    description: 'Remove email client specific elements and scripts',
    pattern: /<\/?(?:o:p|o:office|meta|link|style|script|iframe|noscript|object|embed|applet|frame|frameset)[^>]*>/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove Substack specific elements
  {
    id: 'remove-substack-elements',
    description: 'Remove Substack app links, social media icons, and READ IN APP buttons',
    pattern: /<a[^>]*\b(href=["']https?:\/\/substack\.com\/app-link\/[^"']*["']|class=["'][^"']*\b(?:app-link|share-icon|like-button|comment-button|share-button|read-in-app)\b[^"']*["'])[^>]*>.*?<\/a>/gis,
    replacement: '',
    enabled: true
  },
  
  // Remove footer content (unsubscribe, social media, etc.)
  {
    id: 'remove-footer-content',
    description: 'Remove newsletter footers, unsubscribe links, and social media sections',
    pattern: /<(?:div|footer|section)[^>]*(?:class|id|role)=["'][^"']*\b(?:footer|unsubscribe|social|follow|connect|share|promo|email|signature|contact)\b[^"']*["'][^>]*>.*?<\/(?:div|footer|section)>/gis,
    replacement: '',
    enabled: true
  },
  
  // Remove hidden elements
  {
    id: 'remove-hidden-elements',
    description: 'Remove hidden or invisible elements',
    pattern: /<[^>]*(?:style=["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|height\s*:\s*0|width\s*:\s*0|font-size\s*:\s*0)[^"']*["']|aria-hidden=["']true["']|hidden(?:=["']?[^>\s"']*["']?)?)[^>]*>.*?<\/[^>]*>/gis,
    replacement: '',
    enabled: true
  },
  
  // Remove empty elements and attributes
  {
    id: 'cleanup-markup',
    description: 'Remove empty elements and attributes',
    pattern: /<([a-z]+)[^>]*>\s*<\/\1>|\s+(?:class|style|id)=["']\s*["']/gi,
    replacement: '',
    enabled: true
  }
];

interface CleaningResult {
  cleanedContent: string;
  removedItems: Array<{
    ruleId: string;
    description: string;
    matches: number;
  }>;
}

export function cleanNewsletterContent(html: string): CleaningResult {
  let cleaned = html;
  const removedItems: CleaningResult['removedItems'] = [];
  
  for (const rule of CLEANING_RULES.filter(r => r.enabled)) {
    const beforeLength = cleaned.length;
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
    const matches = (html.length - cleaned.length) / rule.pattern.source.length;
    
    if (matches > 0) {
      removedItems.push({
        ruleId: rule.id,
        description: rule.description,
        matches: Math.round(matches)
      });
    }
  }
  
  // Clean up any leftover empty containers
  let previousLength;
  do {
    previousLength = cleaned.length;
    cleaned = cleaned.replace(/<([a-z]+)[^>]*>\s*<\/\1>/gi, '');
  } while (cleaned.length < previousLength);
  
  // Final cleanup: Be more conservative with the final cleanup
  cleaned = cleaned
    // Remove any inline event handlers
    .replace(/\s+on\w+=["'][^"']*["']/gi, '')
    // Remove any script tags that might have been missed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Clean up any leftover whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    cleanedContent: cleaned,
    removedItems
  };
}

// Optional: Add this to your existing parser pipeline
export function enhanceWithContentCleaning(parser: any) {
  const originalParse = parser.parseNewsletter;
  
  parser.parseNewsletter = function(rawHTML: string, options: any = {}) {
    const enableCleaning = options.enableContentCleaning !== false;
    
    if (enableCleaning) {
      const { cleanedContent } = cleanNewsletterContent(rawHTML);
      return originalParse.call(this, cleanedContent, options);
    }
    
    return originalParse.call(this, rawHTML, options);
  };
  
  return parser;
}
