interface CleaningRule {
  id: string;
  description: string;
  pattern: RegExp;
  replacement: string;
  enabled: boolean;
}

// Common patterns for tracking elements, ads, and promotional content
const CLEANING_RULES: CleaningRule[] = [
  // Remove any raw CSS before the first HTML tag
  {
    id: 'remove-leading-css',
    description: 'Remove any raw CSS before the first HTML tag',
    pattern: /^[^<]*?(?=<[a-z])/i,
    replacement: '',
    enabled: true
  },
  
  // Remove style blocks
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
    description: 'Remove inline styles',
    pattern: /\s+style=["'][^"']*["']/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove Word/XML namespaces and processing instructions
  {
    id: 'remove-xml-namespaces',
    description: 'Remove XML namespaces and processing instructions',
    pattern: /<\?xml[^>]*\?>|<!\[if[^\]]*\]>|<!\[endif\]>/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove Microsoft Office specific elements and attributes
  {
    id: 'remove-ms-office-elements',
    description: 'Remove Microsoft Office specific elements',
    pattern: /<\/?(?:o:[a-z]+|w:[a-z]+|v:[a-z]+|m:[a-z]+|\w+:\w+)[^>]*>/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove Word document specific elements
  {
    id: 'remove-word-document-elements',
    description: 'Remove Word document specific elements',
    pattern: /<\/?w:WordDocument[^>]*>|<\/?o:WordDocument[^>]*>|<\/?v:background[^>]*>|<\/?v:shapetype[^>]*>|<\/?v:shape[^>]*>/gi,
    replacement: '',
    enabled: true
  },
  
  // Remove conditional comments and other MS Office specific comments
  {
    id: 'remove-ms-conditional-comments',
    description: 'Remove Microsoft conditional comments',
    pattern: /<!--\s*\[if[^>]*>.*?<\!\[endif\]-->/gis,
    replacement: '',
    enabled: true
  },
  
  // Remove email client specific elements
  {
    id: 'remove-email-client-elements',
    description: 'Remove email client specific elements',
    pattern: /<\/?(?:o:p|o:office|meta|link|script|iframe|noscript|object|embed|applet|frame|frameset|\w+:\w+)[^>]*>/gi,
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
  
  // Inline styles (moved up to catch them before other rules)
  {
    id: 'remove-inline-styles',
    description: 'Remove inline styles',
    pattern: /\s+style=["'][^"']*["']/gi,
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
  
  // First, remove any leading CSS before the first HTML tag
  const leadingCssMatch = cleaned.match(/^[^<]*?(?=<[a-z])/i);
  if (leadingCssMatch) {
    const beforeLength = cleaned.length;
    cleaned = cleaned.replace(/^[^<]*?(?=<[a-z])/i, '');
    if (cleaned.length < beforeLength) {
      removedItems.push({
        ruleId: 'leading-css-removed',
        description: 'Removed leading CSS before first HTML tag',
        matches: 1
      });
    }
  }
  
  // Process all other cleaning rules
  for (const rule of CLEANING_RULES.filter(r => r.enabled)) {
    const beforeLength = cleaned.length;
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
    
    if (cleaned.length < beforeLength) {
      removedItems.push({
        ruleId: rule.id,
        description: rule.description,
        matches: 1
      });
    }
  }
  
  // Clean up any leftover empty containers (but be careful with nested structures)
  let previousLength;
  const emptyElements = ['div', 'p', 'span', 'a', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  
  emptyElements.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>\\s*<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Final cleanup
  cleaned = cleaned
    // Remove any XML/HTML comments except conditional IE comments (handled by other rules)
    .replace(/<!--(?!\s*\[if)[\s\S]*?-->/g, '')
    // Remove any inline event handlers
    .replace(/\s+on\w+=["'][^"']*["']/gi, '')
    // Remove any script tags that might have been missed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove XML namespaces from remaining elements
    .replace(/<\/?([a-z]+):/gi, '<$1')
    // Remove empty attributes
    .replace(/\s+[a-z-]+=["']\s*["']/gi, '')
    // Clean up any leftover whitespace
    .replace(/\s+/g, ' ')
    .replace(/\s*<\/(p|div|span|a|strong|em|h[1-6])>/g, '</$1>') // Remove spaces before closing tags
    .replace(/(<[^>]+>)\s+/g, '$1') // Remove spaces after opening tags
    .replace(/\s+(<\/[^>]+>)/g, '$1') // Remove spaces before closing tags
    .replace(/>\s+</g, '><') // Remove spaces between tags
    // Remove any remaining XML/Word specific attributes
    .replace(/\s+(?:xmlns|w:|o:|v:|m:)[^=\s>]+(?:=["'][^"']*["'])?/gi, '')
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
