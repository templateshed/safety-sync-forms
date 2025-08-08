import { useEffect } from 'react';

// Triggers the callback when the tab becomes visible, window gains focus, or page is shown from bfcache
export function useOnVisible(callback: () => void) {
  useEffect(() => {
    let ticking = false;
    const run = () => {
      if (ticking) return;
      ticking = true;
      // Defer to next microtask to avoid double-firing in some browsers
      Promise.resolve().then(() => {
        callback();
        ticking = false;
      });
    };

    const onFocus = () => run();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    const onPageShow = () => run();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [callback]);
}
