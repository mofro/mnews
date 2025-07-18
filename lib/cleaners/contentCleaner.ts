interface CleaningRule {
  id: string;
  description: string;
  pattern: RegExp;
  replacement: string;
  enabled: boolean;
}

// Common patterns for tracking elements, ads, and promotional content
const CLEANING_RULES: CleaningRule[] = [
  // Tracking pixels (1x1, transparent, or tiny images)
  {
    id: 'remove-tracking-pixels',
    description: 'Remove tracking pixels and beacons',
    pattern: /<img[^>]*(?:width=["']?1["']?|height=["']?1["']?|style=["'][^"']*display\s*:\s*none[^"']*["'])[^>]*>/gi,
    replacement: '',
    enabled: true
  },
  
  // Common ad containers and iframes
  {
    id: 'remove-ad-containers',
    description: 'Remove common ad containers',
    pattern: /<div[^>]*(?:class|id)=["'][^"']*\b(?:ad|ads|advertisement|banner|sponsor|promo)\b[^"']*["'][^>]*>.*?<\/div>/gis,
    replacement: '',
    enabled: true
  },
  
  // Unsubscribe/social media links in footers
  {
    id: 'remove-footer-promos',
    description: 'Remove newsletter footers and social media promos',
    pattern: /<div[^>]*(?:class|id)=["'][^"']*\b(?:footer|unsubscribe|social|follow|connect|share|promo)\b[^"']*["'][^>]*>.*?<\/div>/gis,
    replacement: '',
    enabled: true
  },
  
  // Email client-specific elements (Outlook, Gmail, etc.)
  {
    id: 'remove-email-client-elements',
    description: 'Remove email client specific elements',
    pattern: /<\/?(?:o:p|o:office|meta|link|style|script|iframe)[^>]*>/gi,
    replacement: '',
    enabled: true
  },
  
  // Empty or whitespace-only elements
  {
    id: 'remove-empty-elements',
    description: 'Remove empty elements',
    pattern: /<([a-z]+)[^>]*>\s*<\/\1>/gi,
    replacement: '',
    enabled: true
  },
  
  // Hidden elements
  {
    id: 'remove-hidden-elements',
    description: 'Remove hidden elements',
    pattern: /<[^>]*(?:style=["'][^"']*display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^>]*>.*?<\/[^>]*>/gis,
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
