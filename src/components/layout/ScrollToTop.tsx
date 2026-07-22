import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset scroll to the top on every route change. Without this, navigating from a
 * scrolled listing into a detail page leaves you halfway down the new page.
 * Nested message threads keep their own inner scroll, so a window reset is harmless there.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
