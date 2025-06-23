"use client";

import { useEffect } from 'react';

export function ScrollUnlocker() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const body = document.body;

      if (body.hasAttribute('data-scroll-locked')) {
        body.removeAttribute('data-scroll-locked');
        body.style.overflow = 'auto';
      }

      // Radix usa RemoveScroll que bloquea eventos, re-habilitamos manualmente:
      document.body.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false, capture: true });
      document.body.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false, capture: true });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'style'],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
