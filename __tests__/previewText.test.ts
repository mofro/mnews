import { extractPreviewText, removePreviewPadding } from '@/utils/string';

describe('Preview Text Utils', () => {
  describe('extractPreviewText', () => {
    it('should extract preview text from preview div', () => {
      const html = `
        <div>Some content</div>
        <div class="preview">
          This is a preview text with &nbsp; padding &amp; entities &#847; 
        </div>
        <div>More content</div>
      `;
      
      const { cleanedContent, previewText } = extractPreviewText(html);
      
      expect(previewText).toBe('This is a preview text with padding entities');
      expect(cleanedContent).not.toContain('class="preview"');
      expect(cleanedContent).toContain('Some content');
      expect(cleanedContent).toContain('More content');
    });
    
    it('should handle multiple preview divs and use the first one with content', () => {
      const html = `
        <div class="preview">First preview</div>
        <div class="preview">Second preview</div>
      `;
      
      const { previewText } = extractPreviewText(html);
      expect(previewText).toBe('First preview');
    });
    
    it('should return null if no preview text is found', () => {
      const html = '<div>No preview here</div>';
      const { previewText } = extractPreviewText(html);
      expect(previewText).toBeNull();
    });
  });
  
  describe('removePreviewPadding', () => {
    it('should remove common preview padding patterns', () => {
      const text = '&#847; &nbsp; Some text with padding &#173;';
      expect(removePreviewPadding(text)).toBe('Some text with padding');
    });
    
    it('should handle zero-width spaces', () => {
      const text = '\u200B\u200C\u200D\uFEFF Padded text \u200B\u200C\u200D\uFEFF';
      expect(removePreviewPadding(text)).toBe('Padded text');
    });
    
    it('should return empty string for null/undefined input', () => {
      expect(removePreviewPadding(null as any)).toBe('');
      expect(removePreviewPadding(undefined as any)).toBe('');
    });
  });
});
