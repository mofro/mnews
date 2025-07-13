/**
 * Footnote Link Processing utilities – Step 4 extension
 * Converts inline links into numbered footnote references and appends a
 * footnote section at the bottom of the content.
 */

import type { ProcessingStep } from './parser';

interface LinkReference {
  id: number;
  url: string;
  linkText: string;
  context: string;
  domain: string;
}

export class FootnoteLinkProcessor {
  /** Extract links and convert to footnote style */
  static processLinksToFootnotes(htmlContent: string, opts?: {
    maxContextLength?: number;
    footnotePreviewLength?: number;
    cleanTrackingParams?: boolean;
  }): {
    processedContent: string;
    footnoteSection: string;
    linkCount: number;
  } {
    const { maxContextLength = 30, footnotePreviewLength = 60, cleanTrackingParams = true } =
      opts || {};

    const linkRegistry: LinkReference[] = [];
    let linkCounter = 0;

    // Replace links with numbered anchors and populate registry
    const processedHTML = htmlContent.replace(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>).)*)<\/a>/gi,
      (match, url, linkText) => {
        linkCounter++;

        const contextBefore = this.extractContext(
          htmlContent,
          match,
          'before',
          maxContextLength,
        );
        const contextAfter = this.extractContext(
          htmlContent,
          match,
          'after',
          maxContextLength,
        );
        const fullContext = `${contextBefore}${linkText}${contextAfter}`.trim();

        const cleanUrl = cleanTrackingParams ? this.sanitizeUrl(url) : url;
        const domain = this.extractDomain(cleanUrl);

        linkRegistry.push({
          id: linkCounter,
          url: cleanUrl,
          linkText: linkText.replace(/<[^>]*>/g, '').trim(),
          context: fullContext.replace(/<[^>]*>/g, '').trim(),
          domain,
        });

        return `${linkText} <a href="#footnote-${linkCounter}" id="ref-${linkCounter}" class="footnote-ref">[${linkCounter}]</a>`;
      },
    );

    const footnoteSection = this.generateFootnoteSection(linkRegistry, footnotePreviewLength);

    return {
      processedContent: processedHTML,
      footnoteSection,
      linkCount: linkCounter,
    };
  }

  private static extractContext(
    content: string,
    linkMatch: string,
    direction: 'before' | 'after',
    maxLength: number,
  ): string {
    const index = content.indexOf(linkMatch);
    if (index === -1) return '';

    if (direction === 'before') {
      const start = Math.max(0, index - maxLength);
      const snippet = content.substring(start, index);
      const lastSpace = snippet.lastIndexOf(' ');
      return lastSpace > 0 ? snippet.substring(lastSpace + 1) : snippet;
    }
    // after
    const end = Math.min(content.length, index + linkMatch.length + maxLength);
    const snippet = content.substring(index + linkMatch.length, end);
    const firstSpace = snippet.indexOf(' ');
    return firstSpace > 0 ? snippet.substring(0, firstSpace) : snippet;
  }

  private static generateFootnoteSection(
    links: LinkReference[],
    footnotePreviewLength: number,
  ): string {
    if (links.length === 0) return '';

    const itemsHtml = links
      .map((link) => {
        const preview =
          link.context.length > footnotePreviewLength
            ? link.context.substring(0, footnotePreviewLength) + '...'
            : link.context;
        return `<div class="footnote-item" id="footnote-${link.id}">
  <a href="#ref-${link.id}" class="footnote-back">[${link.id}]</a>
  <span class="footnote-context">\"${preview}\"</span>
  <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="footnote-link">${
          link.linkText
        } (${link.domain})</a>
</div>`;
      })
      .join('\n');

    return `\n\n<div class="footnotes-section">\n<h3 class="footnotes-header">References</h3>\n<div class="footnotes-list">\n${itemsHtml}\n</div>\n</div>`;
  }

  private static sanitizeUrl(url: string): string {
    const clean = url.replace(/[?&](utm_[^&]*|fbclid|gclid|_ga|ref)[^&]*/g, '');
    if (!clean.match(/^https?:\/\//)) return `https://${clean}`;
    return clean.replace(/[?&]$/, '');
  }

  private static extractDomain(url: string): string {
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, '');
    } catch {
      return url.split('/')[0] || 'unknown';
    }
  }
}

/**
 * Convenience wrapper to integrate with parser steps.
 */
export function integrateFootnoteLinks(content: string, steps: ProcessingStep[], opts?: {
  maxContextLength?: number;
  footnotePreviewLength?: number;
  cleanTrackingParams?: boolean;
}): string {
  try {
    const { processedContent, footnoteSection, linkCount } =
      FootnoteLinkProcessor.processLinksToFootnotes(content, opts);

    steps.push({
      stepName: 'footnote-links',
      input: content.substring(0, 200) + '...',
      output: processedContent.substring(0, 200) + '...',
      success: true,
      metadata: { linksProcessed: linkCount, footnoteLength: footnoteSection.length },
    } as ProcessingStep & { metadata: any });

    return processedContent + footnoteSection + `<style>${footnoteCSS}</style>`;
  } catch (error) {
    steps.push({
      stepName: 'footnote-links',
      input: content.substring(0, 200) + '...',
      output: content.substring(0, 200) + '...',
      success: false,
      error: error instanceof Error ? error.message : 'Footnote processing failed',
    });
    return content;
  }
}

export const footnoteCSS = `
.footnote-ref{color:#0066cc;text-decoration:none;font-size:.9em;font-weight:bold}.footnote-ref:hover{color:#0052a3}.footnotes-section{margin-top:2em;padding-top:1em;border-top:1px solid #ddd}.footnotes-header{font-size:1.1em;font-weight:bold;margin-bottom:1em;color:#333}.footnotes-list{font-size:.9em;line-height:1.4}.footnote-item{margin-bottom:.8em;padding-left:.5em}.footnote-back{color:#0066cc;text-decoration:none;font-weight:bold;margin-right:.5em}.footnote-context{color:#666;font-style:italic;margin-right:.5em}.footnote-link{color:#0066cc;text-decoration:none}.footnote-link:hover{text-decoration:underline}html{scroll-behavior:smooth}`;
