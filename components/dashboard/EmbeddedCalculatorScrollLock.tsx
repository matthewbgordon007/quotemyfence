'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * On the supplier embedded sheet page, `#main-content` is normally the scroll root.
 * Wheel/trackpad gestures over cross-origin iframes (Sheets / Excel) still chain-scroll that root.
 * While this wrapper is mounted, we make `main` a non-scrolling flex column and keep all scrolling
 * inside this inner region so overscroll stays off the rest of the dashboard.
 */
export function EmbeddedCalculatorScrollLock({ children }: { children: ReactNode }) {
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const prevOverflow = main.style.overflow;
    const prevDisplay = main.style.display;
    const prevFlexDir = main.style.flexDirection;
    main.style.overflow = 'hidden';
    main.style.display = 'flex';
    main.style.flexDirection = 'column';
    return () => {
      main.style.overflow = prevOverflow;
      main.style.display = prevDisplay;
      main.style.flexDirection = prevFlexDir;
    };
  }, []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-none [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}
