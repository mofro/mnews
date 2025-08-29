'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  wrapperId?: string;
}

export const Portal = ({ children, wrapperId = 'portal-root' }: PortalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  let portalRoot = document.getElementById(wrapperId);
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', wrapperId);
    document.body.appendChild(portalRoot);
  }

  return createPortal(children, portalRoot);
};
