'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type PortalProps = {
  children: React.ReactNode;
  wrapperId?: string;
};

export const Portal = ({ children, wrapperId = 'portal-root' }: PortalProps): React.ReactPortal | null => {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Ensure this runs only on the client side
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    
    // Find or create the portal container
    let element = document.getElementById(wrapperId);
    let created = false;
    
    if (!element) {
      element = document.createElement('div');
      element.setAttribute('id', wrapperId);
      document.body.appendChild(element);
      created = true;
    }
    
    setContainer(element);
    
    return () => {
      if (created && element?.parentNode) {
        element.parentNode.removeChild(element);
      }
      setMounted(false);
    };
  }, [wrapperId]);

  if (!mounted || !container) return null;
  return createPortal(children, container);
};
