import { PageView } from '../types';

export interface RouteState {
  page: PageView;
  symbol?: string;
}

/**
 * Parses the current window.location pathname and search query into structured page and symbol state.
 * Supported routes:
 *   /              -> home
 *   /board         -> board
 *   /board?symbol=X or /board?ticker=X or /board/X -> board with expanded symbol X
 *   /tests         -> tests
 *   /about         -> about
 */
export function parseRouteFromLocation(): RouteState {
  if (typeof window === 'undefined') {
    return { page: 'home' };
  }

  const pathname = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const paramSymbol = searchParams.get('symbol') || searchParams.get('ticker') || searchParams.get('s');

  if (pathname.startsWith('/board')) {
    // Check if symbol is in path like /board/NVDA or /board/
    const pathParts = pathname.split('/').filter(Boolean);
    let pathSymbol = pathParts[1] ? pathParts[1].toUpperCase() : undefined;
    const activeSymbol = paramSymbol ? paramSymbol.toUpperCase() : pathSymbol;
    return {
      page: 'board',
      symbol: activeSymbol,
    };
  }

  if (pathname.startsWith('/tests') || pathname.startsWith('/test')) {
    return { page: 'tests' };
  }

  if (pathname.startsWith('/about')) {
    return { page: 'about' };
  }

  // Fallback to home
  return { page: 'home' };
}

/**
 * Formats the browser URL pathname and search parameters for a given page and optional symbol.
 */
export function formatUrlForRoute(page: PageView, symbol?: string): string {
  switch (page) {
    case 'board':
      if (symbol) {
        return `/board?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
      }
      return '/board';
    case 'tests':
      return '/tests';
    case 'about':
      return '/about';
    case 'home':
    default:
      return '/';
  }
}

/**
 * Safely pushes or replaces state in window.history and updates the URL bar without full page reload.
 */
export function syncRouteUrl(page: PageView, symbol?: string, replace: boolean = false): void {
  if (typeof window === 'undefined') return;

  const targetUrl = formatUrlForRoute(page, symbol);
  const currentUrl = window.location.pathname + window.location.search;

  if (targetUrl !== currentUrl) {
    if (replace) {
      window.history.replaceState({ page, symbol }, '', targetUrl);
    } else {
      window.history.pushState({ page, symbol }, '', targetUrl);
    }
  }
}
