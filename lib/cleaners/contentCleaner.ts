import { JSDOM } from "jsdom";
import { decodeTrackingUrl } from "@/lib/utils/decodeTrackingUrl";

interface CleaningRule {
  id: string;
  description: string;
  pattern: RegExp;
  replacement: string | ((...args: any[]) => string);
  enabled: boolean;
}

// Common patterns for tracking elements, ads, and promotional content
const CLEANING_RULES: CleaningRule[] = [
  // Remove any raw CSS before the first HTML tag
  {
    id: "remove-leading-css",
    description: "Remove any raw CSS before the first HTML tag",
    pattern: /^[^<]*?(?=<[a-z])/i,
    replacement: "",
    enabled: true,
  },

  // Remove style blocks
  {
    id: "remove-style-blocks",
    description: "Remove all style blocks",
    pattern: /<style[^>]*>[\s\S]*?<\/style>/gi,
    replacement: "",
    enabled: true,
  },

  // Remove inline styles but preserve semantic structure
  {
    id: "clean-inline-styles",
    description: "Clean inline styles while preserving semantic structure",
    pattern: /<([a-z][a-z0-9]*)(?:[^>]*?\s+style=["'][^"']*["'])([^>]*)>/gi,
    replacement: (_match: string, tag: string, rest: string) => {
      // Preserve these specific attributes
      const preservedAttrs = [
        "colspan",
        "rowspan",
        "scope",
        "headers",
        "abbr",
        "title",
      ];
      const attrs = rest.match(/\s+([a-z-]+)(?:=["']([^"']*)["'])?/gi) || [];
      const cleanAttrs = attrs
        .filter((attr) => {
          const attrName = attr.split("=")[0].trim();
          return preservedAttrs.includes(attrName.toLowerCase());
        })
        .join(" ");

      return `<${tag}${cleanAttrs}>`;
    },
    enabled: false, // Keep inline styles — needed for email formatting
  },

  // Clean up table structure
  {
    id: "clean-tables",
    description: "Clean and simplify table structure",
    pattern: /<table[^>]*>([\s\S]*?)<\/table>/gi,
    replacement: (match: string) => {
      // Convert table to div-based layout if it's used for layout purposes
      const isLayoutTable =
        !match.match(/<t[dh][\s>]/i) ||
        match.match(/role=["']presentation["']/i) ||
        match.match(/<table[^>]*\s+cellpadding=["']0["'][^>]*>/i) ||
        match.match(/<table[^>]*\s+border=["']0["'][^>]*>/i);

      if (isLayoutTable) {
        // Convert layout table to divs
        return match
          .replace(/<\/?t(?:head|body|foot|r|d|h)[^>]*>/gi, "")
          .replace(/<table[^>]*>/gi, '<div class="layout-grid">')
          .replace(/<\/table>/gi, "</div>");
      }

      // Clean up data tables
      return match
        .replace(/<t(?:head|body|foot)[^>]*>/gi, "")
        .replace(/<\/t(?:head|body|foot)>/gi, "")
        .replace(/<tr[^>]*>/gi, "<tr>")
        .replace(/<t[dh][^>]*>/gi, (cell) => {
          const isHeader = cell.toLowerCase().startsWith("<th");
          const cellContent = cell
            .replace(/<t[dh][^>]*>/i, "")
            .replace(/<\/t[dh]>/i, "");
          return isHeader
            ? `<th>${cellContent}</th>`
            : `<td>${cellContent}</td>`;
        });
    },
    enabled: true,
  },

  // Remove Word/XML namespaces and processing instructions
  {
    id: "remove-xml-namespaces",
    description: "Remove XML namespaces and processing instructions",
    pattern: /<\?xml[^>]*\?>|<!\[if[^\]]*\]>|<!\[endif\]>/gi,
    replacement: "",
    enabled: true,
  },

  // Remove Microsoft Office specific elements and attributes
  {
    id: "remove-ms-office-elements",
    description: "Remove Microsoft Office specific elements",
    pattern: /<\/?(?:o:[a-z]+|w:[a-z]+|v:[a-z]+|m:[a-z]+|\w+:\w+)[^>]*>/gi,
    replacement: "",
    enabled: true,
  },

  // Remove Word document specific elements
  {
    id: "remove-word-document-elements",
    description: "Remove Word document specific elements",
    pattern:
      /<\/?w:WordDocument[^>]*>|<\/?o:WordDocument[^>]*>|<\/?v:background[^>]*>|<\/?v:shapetype[^>]*>|<\/?v:shape[^>]*>/gi,
    replacement: "",
    enabled: true,
  },

  // Remove conditional comments and other MS Office specific comments
  {
    id: "remove-ms-conditional-comments",
    description: "Remove Microsoft conditional comments",
    pattern: /<!--\s*\[if[^>]*>.*?<!\[endif\]-->/gis,
    replacement: "",
    enabled: true,
  },

  // Remove email client specific elements
  {
    id: "remove-email-client-elements",
    description: "Remove email client specific elements",
    pattern:
      /<\/?(?:o:p|o:office|meta|link|script|iframe|noscript|object|embed|applet|frame|frameset|\w+:\w+)[^>]*>/gi,
    replacement: "",
    enabled: true,
  },
  // Substack app links and social media icons
  {
    id: "remove-substack-app-links",
    description: "Remove Substack app links and social media icons",
    pattern:
      /<a[^>]*\b(href=["']https?:\/\/substack\.com\/app-link\/[^"']*["']|class=["'][^"']*\b(?:app-link|share-icon|like-button|comment-button|share-button)\b[^"']*["'])[^>]*>.*?<\/a>/gis,
    replacement: "",
    enabled: true,
  },

  // Substack read-in-app buttons
  {
    id: "remove-read-in-app",
    description: "Remove READ IN APP buttons",
    pattern: /<a[^>]*\bclass=["'][^"']*\bread-in-app\b[^>]*>.*?<\/a>/gis,
    replacement: "",
    enabled: true,
  },

  // Inline styles — disabled: preserve for readable email rendering
  {
    id: "remove-inline-styles",
    description: "Remove inline styles",
    pattern: /\s+style=["'][^"']*["']/gi,
    replacement: "",
    enabled: false,
  },

  // Tracking pixels (1x1, transparent, or tiny images)
  {
    id: "remove-tracking-pixels",
    description: "Remove tracking pixels and beacons",
    pattern:
      /<img[^>]*(?:width=["']?1["']?|height=["']?1["']?|style=["'][^"']*display\s*:\s*none[^"']*["'])[^>]*>/gi,
    replacement: "",
    enabled: true,
  },

  // Common ad containers and iframes
  {
    id: "remove-ad-containers",
    description: "Remove common ad containers",
    pattern:
      /<div[^>]*(?:class|id)=["'][^"']*\b(?:ad|ads|advertisement|banner|sponsor|promo)\b[^"']*["'][^>]*>.*?<\/div>/gis,
    replacement: "",
    enabled: true,
  },

  // Unsubscribe/social media links in footers
  {
    id: "remove-footer-promos",
    description: "Remove newsletter footers and social media promos",
    pattern:
      /<div[^>]*(?:class|id)=["'][^"']*\b(?:footer|unsubscribe|social|follow|connect|share|promo)\b[^"']*["'][^>]*>.*?<\/div>/gis,
    replacement: "",
    enabled: true,
  },

  // Email client-specific elements (Outlook, Gmail, etc.)
  {
    id: "remove-email-client-elements",
    description: "Remove email client specific elements",
    pattern: /<\/?(?:o:p|o:office|meta|link|style|script|iframe)[^>]*>/gi,
    replacement: "",
    enabled: true,
  },

  // Empty or whitespace-only elements
  {
    id: "remove-empty-elements",
    description: "Remove empty elements",
    pattern: /<([a-z]+)[^>]*>\s*<\/\1>/gi,
    replacement: "",
    enabled: true,
  },

  // Hidden elements
  {
    id: "remove-hidden-elements",
    description: "Remove hidden elements",
    pattern:
      /<[^>]*(?:style=["'][^"']*display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^>]*>.*?<\/[^>]*>/gis,
    replacement: "",
    enabled: true,
  },
];

interface CleaningResult {
  cleanedContent: string;
  removedItems: Array<{
    ruleId: string;
    description: string;
    matches: number;
  }>;
}

// Nav labels that identify header chrome containers (Sign Up | Advertise | View Online rows)
const NAV_LABELS = [
  "sign up",
  "advertise",
  "view online",
  "view in browser",
  "manage preferences",
  "unsubscribe",
];

/**
 * DOM-based semantic extraction pass.
 * Runs before regex rules to handle structural email noise that regex can't
 * safely address: gmail forwarding wrappers, hidden preheaders, header chrome,
 * nested email layout tables, and tracking link decoding.
 */
function extractEmailContent(html: string): string {
  try {
    const {
      window: { document },
    } = new JSDOM(html);
    const body = document.body;

    // 1. Unwrap Gmail forwarding wrapper
    //    Removes:  <p class="gmail_quote">On Jun 10 ... wrote:</p>
    //    Unwraps:  <blockquote class="gmail_quote">REAL CONTENT</blockquote>
    body.querySelectorAll("p.gmail_quote").forEach((el) => el.remove());
    body.querySelectorAll("blockquote.gmail_quote").forEach((bq) => {
      bq.replaceWith(...Array.from(bq.childNodes));
    });

    // 2. Remove hidden preheader elements (display:none, max-height:0)
    body.querySelectorAll("[style]").forEach((el) => {
      const s = el.getAttribute("style") ?? "";
      if (
        /display\s*:\s*none/i.test(s) ||
        /max-height\s*:\s*0(?:px)?[\s;,"']/i.test(s)
      ) {
        el.remove();
      }
    });

    // 2b. Remove tracking pixels — <img> with 1×1 dimensions or max-height ≤ 12px
    body.querySelectorAll("img").forEach((img) => {
      const w = img.getAttribute("width");
      const h = img.getAttribute("height");
      const style = img.getAttribute("style") ?? "";
      const maxH = /max-height\s*:\s*(\d+)px/i.exec(style);
      if (
        (w === "1" && h === "1") ||
        w === "1" ||
        h === "1" ||
        (maxH && parseInt(maxH[1]) <= 12)
      ) {
        img.remove();
      }
    });

    // 3. Remove header chrome — containers where ALL links are nav labels
    //    e.g. the "Sign Up | Advertise | View Online" row at the top of TLDR.
    //    Process innermost elements first (reverse) so parent containers see
    //    the already-cleaned state when we reach them.
    Array.from(body.querySelectorAll("td, div"))
      .reverse()
      .forEach((container) => {
        if (!container.isConnected) return;
        const links = Array.from(container.querySelectorAll("a"));
        if (links.length < 2) return;
        const navCount = links.filter((a) =>
          NAV_LABELS.some((kw) =>
            (a.textContent?.trim().toLowerCase() ?? "").includes(kw),
          ),
        ).length;
        // Only remove if every link is a nav label — avoids nuking content containers
        if (navCount >= 2 && navCount === links.length) container.remove();
      });

    // 4. Unwrap email layout tables (multi-pass for deeply nested structures)
    //    Layout marker heuristic: has align/cellpadding/cellspacing/border attrs
    //    OR class matches container/document.
    //    Data tables (with <thead> or scope attrs) are left alone.
    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      Array.from(body.querySelectorAll("table")).forEach((table) => {
        if (!table.isConnected) return;
        if (table.querySelector("thead") || table.querySelector("th[scope]"))
          return;
        const isLayout =
          ["align", "cellpadding", "cellspacing", "border"].some((a) =>
            table.hasAttribute(a),
          ) ||
          /\b(container|document)\b/i.test(table.getAttribute("class") ?? "");
        if (!isLayout) return;
        table.replaceWith(...Array.from(table.childNodes));
        changed = true;
      });
      if (!changed) break;
    }

    // Unwrap orphaned table-structure elements left after table removal
    for (const tag of ["tbody", "thead", "tfoot", "tr", "td", "th"]) {
      body.querySelectorAll(tag).forEach((el) => {
        if (el.isConnected) el.replaceWith(...Array.from(el.childNodes));
      });
    }

    // 4b. Remove footer blocks — containers whose only content is unsubscribe/
    //     copyright/address boilerplate. Walk up from the unsubscribe link to the
    //     nearest div or td ancestor, and remove it if it contains no content
    //     headings and no long paragraphs (i.e. it's pure footer chrome).
    const UNSUB_SIGNALS = [
      "unsubscribe",
      "opt out",
      "opt-out",
      "manage preferences",
      "manage subscriptions",
      "email preferences",
    ];
    body.querySelectorAll("a").forEach((a) => {
      if (!a.isConnected) return;
      const text = (a.textContent ?? "").trim().toLowerCase();
      if (!UNSUB_SIGNALS.some((s) => text.includes(s))) return;
      let candidate: Element | null = a;
      for (let i = 0; i < 6; i++) {
        const parent: Element | null = candidate
          ? candidate.parentElement
          : null;
        if (!parent || parent === body) break;
        const tag = parent.tagName.toLowerCase();
        if (tag === "div" || tag === "td") {
          const hasHeadings = !!parent.querySelector("h1,h2,h3,h4");
          const longParas = Array.from(parent.querySelectorAll("p")).filter(
            (para) => (para.textContent ?? "").trim().length > 200,
          );
          if (!hasHeadings && longParas.length === 0) {
            parent.remove();
            return;
          }
        }
        candidate = parent;
      }
    });

    // 5. Decode tracking URLs on all surviving links
    body.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") ?? "";
      const decoded = decodeTrackingUrl(href);
      if (decoded !== href) a.setAttribute("href", decoded);
    });

    // 4c. Unwrap constrained tracking anchors.
    //     Gofobo-style ESPs wrap real text in <a style="max-width:19px;max-height:15px">
    //     so the clickable area is invisible while text still renders. Unwrap these
    //     anchors to remove the tracking link while preserving the visible content.
    body.querySelectorAll("a[style]").forEach((a) => {
      if (!a.isConnected) return;
      const style = a.getAttribute("style") ?? "";
      const maxW = /\bmax-width\s*:\s*(\d+)px/i.exec(style);
      const maxH = /\bmax-height\s*:\s*(\d+)px/i.exec(style);
      const isConstrained =
        (maxW !== null && parseInt(maxW[1]) <= 20) ||
        (maxH !== null && parseInt(maxH[1]) <= 20);
      if (!isConstrained) return;
      // Only unwrap if there's meaningful content inside
      if ((a.textContent ?? "").trim().length < 3 && !a.querySelector("img"))
        return;
      a.replaceWith(...Array.from(a.childNodes));
    });

    // 6. Strip inline color/background properties so dark mode CSS can apply.
    //    Layout properties (width, height, padding, margin, etc.) are preserved.
    const COLOR_PROPS =
      /\b(color|background(?:-color)?|border-color|outline-color)\s*:[^;]+;?/gi;
    body.querySelectorAll("[style]").forEach((el) => {
      const cleaned = (el.getAttribute("style") ?? "")
        .replace(COLOR_PROPS, "")
        .trim();
      if (cleaned) el.setAttribute("style", cleaned);
      else el.removeAttribute("style");
    });

    // 7. Strip invisible characters common in email HTML:
    //    soft hyphens, zero-width spaces/joiners, BOM, and the ͏ separator
    //    used by ESPs to pad preheader text.
    let html7 = body.innerHTML;
    html7 = html7
      .replace(/͏[\s\u00A0\u00AD\u00AD]*\u00AD͏[\s\u00A0\u00AD\u00AD]*/g, " ")
      .replace(/(?:\u00AD|\u200B|\u200C|\u200D|\uFEFF)+/g, "")
      .replace(/͏+/g, "");

    return html7;
  } catch {
    // If DOM extraction fails for any reason, return the original HTML untouched
    return html;
  }
}

export function cleanNewsletterContent(html: string): CleaningResult {
  // Phase 1: DOM-based structural extraction
  let cleaned = extractEmailContent(html);
  const removedItems: CleaningResult["removedItems"] = [];

  // First, remove any leading CSS before the first HTML tag
  const leadingCssMatch = cleaned.match(/^[^<]*?(?=<[a-z])/i);
  if (leadingCssMatch) {
    const beforeLength = cleaned.length;
    cleaned = cleaned.replace(/^[^<]*?(?=<[a-z])/i, "");
    if (cleaned.length < beforeLength) {
      removedItems.push({
        ruleId: "leading-css-removed",
        description: "Removed leading CSS before first HTML tag",
        matches: 1,
      });
    }
  }

  // Process all other cleaning rules
  for (const rule of CLEANING_RULES.filter((r) => r.enabled)) {
    const beforeLength = cleaned.length;

    // Handle both string and function replacements
    if (typeof rule.replacement === "function") {
      cleaned = cleaned.replace(rule.pattern, rule.replacement as any);
    } else {
      cleaned = cleaned.replace(rule.pattern, rule.replacement);
    }

    if (cleaned.length !== beforeLength) {
      removedItems.push({
        ruleId: rule.id,
        description: rule.description,
        matches: 1,
      });
    }
  }

  // Clean up any leftover empty containers (but be careful with nested structures)
  const emptyElements = [
    "div",
    "p",
    "span",
    "a",
    "strong",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
  ];

  emptyElements.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>\\s*<\\/${tag}>`, "gi");
    cleaned = cleaned.replace(regex, "");
  });

  // Remove noise attributes but preserve style and class (needed for email formatting)
  cleaned = cleaned
    // Remove data-* attributes except for specific ones we want to keep
    .replace(
      /\s+data-(?!testid|id|name|type|value|role|aria-)[a-z0-9-]+(?:=["'][^"']*["'])?/gi,
      "",
    )
    // Remove any remaining inline event handlers
    .replace(/\s+on[a-z]+=["'][^"']*["']/gi, "")
    // Remove any remaining XML/Word specific attributes
    .replace(/\s+(?:xmlns|w:|o:|v:|m:)[^=\s>]+(?:=["'][^"']*["'])?/gi, "");

  // Convert semantic elements to divs with appropriate roles for better accessibility
  cleaned = cleaned
    .replace(/<header[^>]*>/gi, '<div role="banner">')
    .replace(/<\/header>/gi, "</div>")
    .replace(/<footer[^>]*>/gi, '<div role="contentinfo">')
    .replace(/<\/footer>/gi, "</div>")
    .replace(/<nav[^>]*>/gi, '<div role="navigation">')
    .replace(/<\/nav>/gi, "</div>")
    .replace(/<main[^>]*>/gi, '<div role="main">')
    .replace(/<\/main>/gi, "</div>");

  // Note: malformed-HTML fixing (unclosed tags, self-closing, unquoted attrs) was
  // removed — the DOM extraction pass via JSDOM produces valid HTML so these
  // regex hacks are unnecessary and actively harmful on well-formed input.

  // Final cleanup
  cleaned = cleaned
    // Remove any XML/HTML comments except conditional IE comments (handled by other rules)
    .replace(/<!--(?!\s*\[if)[\s\S]*?-->/g, "")
    // Remove any inline event handlers
    .replace(/\s+on\w+=["'][^"']*["']/gi, "")
    // Remove any script tags that might have been missed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove XML namespaces from remaining elements
    .replace(/<\/?([a-z]+):/gi, "<$1")
    // Remove empty attributes
    .replace(/\s+[a-z-]+=["']\s*["']/gi, "")
    // Clean up any leftover whitespace
    .replace(/\s+/g, " ")
    .replace(/\s*<\/(p|div|span|a|strong|em|h[1-6])>/g, "</$1>") // Remove spaces before closing tags
    .replace(/(<[^>]+>)\s+/g, "$1") // Remove spaces after opening tags
    .replace(/\s+(<\/[^>]+>)/g, "$1") // Remove spaces before closing tags
    .replace(/>\s+</g, "><") // Remove spaces between tags
    // Remove any remaining XML/Word specific attributes
    .replace(/\s+(?:xmlns|w:|o:|v:|m:)[^=\s>]+(?:=["'][^"']*["'])?/gi, "")
    .trim();

  return {
    cleanedContent: cleaned,
    removedItems,
  };
}

// Optional: Add this to your existing parser pipeline
export function enhanceWithContentCleaning(parser: any) {
  const originalParse = parser.parseNewsletter;

  parser.parseNewsletter = function (rawHTML: string, options: any = {}) {
    const enableCleaning = options.enableContentCleaning !== false;

    if (enableCleaning) {
      const { cleanedContent } = cleanNewsletterContent(rawHTML);
      return originalParse.call(this, cleanedContent, options);
    }

    return originalParse.call(this, rawHTML, options);
  };

  return parser;
}
