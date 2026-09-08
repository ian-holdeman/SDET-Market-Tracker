import { useSyncExternalStore } from 'react';
type Appearance = 'light' | 'dark';
const subscribe = (notify: () => void) => {
  window.addEventListener('appearancechange', notify);
  return () => window.removeEventListener('appearancechange', notify);
};
const snapshot = (): Appearance => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
export function useAppearance() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'dark' as const);
  const setTheme = (value: Appearance) => window.dispatchEvent(new CustomEvent('appearancepreference', { detail: value }));
  return { theme, setTheme };
}
