import { useEffect } from 'react';

export function useBrowserPreview() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const existingIframe = document.getElementById('browser-preview-iframe');
    if (existingIframe) return;

    const iframe = document.createElement('iframe');
    iframe.id = 'browser-preview-iframe';
    iframe.src = "http://127.0.0.1:51819/iframe?pageId=page_75a46957-5224-4f64-b17d-2fc45bf4f135&parentOrigin=http%3A%2F%2Flocalhost%3A3000";
    
    // Make it visually hidden but still accessible
    iframe.style.position = 'fixed';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.padding = '0';
    iframe.style.margin = '-1px';
    iframe.style.overflow = 'hidden';
    iframe.style.clip = 'rect(0,0,0,0)';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    
    document.body.appendChild(iframe);

    // Cleanup function
    return () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };
  }, []);

  return null;
}
