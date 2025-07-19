interface CleaningRule {
  id: string;
  description: string;
  pattern: RegExp;
  replacement: string;
  enabled: boolean;
}

// Common patterns for tracking elements, ads, and promotional content
const CLEANING_RULES: CleaningRule[] = [
  // Remove entire style blocks first
  {
    id: 'remove-style-blocks',
    description: 'Remove all style blocks',
    pattern: /<style[^>]*>[\s\S]*?<\/style>/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove inline styles
  {
    id: 'remove-inline-styles',
    description: 'Remove all inline styles',
    pattern: /\s+style=["'][^"']*["']/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove common CSS classes that contain style information
  {
    id: 'remove-style-classes',
    description: 'Remove style-related classes',
    pattern: /\s+class=["'][^"']*\b(?:mso|Mso|style|font|color|size|align|margin|padding|border|width|height|bgcolor|background|text-|font-|line-|letter-|word-|whitespace-|break-|list-|table-|border-|rounded-|shadow-|opacity-|overflow-|position-|top-|right-|bottom-|left-|z-|float-|clear-|object-|gap-|space-|divide-|ring-|ring-offset-)\S*\b[^"']*["']/gi,
    replacement: '',
    enabled: true
  },
  
  // Substack app links and social media icons
  {
    id: 'remove-substack-app-links',
    description: 'Remove Substack app links and social media icons',
    pattern: /<a[^>]*\b(href=["']https?:\/\/substack\.com\/app-link\/[^"']*["']|class=["'][^"']*\b(?:app-link|share-icon|like-button|comment-button|share-button)\b[^"']*["'])[^>]*>.*?<\/a>/gis,
    replacement: '',
    enabled: true
  },
  
  // Substack read-in-app buttons
  {
    id: 'remove-read-in-app',
    description: 'Remove READ IN APP buttons',
    pattern: /<a[^>]*\bclass=["'][^"']*\bread-in-app\b[^>]*>.*?<\/a>/gis,
    replacement: '',
    enabled: true
  },
  
  // Remove empty style and class attributes
  {
    id: 'remove-empty-attrs',
    description: 'Remove empty style and class attributes',
    pattern: /\s+(?:style|class)=["']\s*["']/gi,
    replacement: '',
    enabled: true
  },
  
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
  
  // Final cleanup: Remove any remaining CSS rules or style attributes
  cleaned = cleaned
    // Remove any remaining style attributes that might have been missed
    .replace(/\s+style=["'][^"']*["']/gi, '')
    // Remove any inline event handlers
    .replace(/\s+on\w+=["'][^"']*["']/gi, '')
    // Remove any data-* attributes that might contain styling
    .replace(/\s+data-[\w-]+(?:=["'].*?["'])?/gi, '')
    // Remove any remaining class attributes
    .replace(/\s+class=["'][^"']*["']/gi, '')
    // Remove any remaining empty attributes
    .replace(/\s+[\w-]+=(?:""|'')/gi, '')
    // Remove any remaining CSS rules
    .replace(/[a-z\-]+\s*:\s*[^;\{\}]+(;|(?=\s*[\{\}]|$))/gi, '')
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
