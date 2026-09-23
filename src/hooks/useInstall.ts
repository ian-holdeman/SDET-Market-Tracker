import { useEffect, useRef, useState } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
type Status = 'idle' | 'pending' | 'accepted' | 'dismissed' | 'unavailable' | 'installed';

export function useInstall() {
  const prompt = useRef<InstallPrompt | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const deadline = useRef<number | undefined>(undefined);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [standalone, setStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const clear = () => { window.clearTimeout(deadline.current); prompt.current = null; setAvailable(false); generation.current++; pending.current = false; };
    const modeChanged = () => { setStandalone(media.matches); if (media.matches) { clear(); setStatus('idle'); } };
    const offered = (event: Event) => {
      if (typeof (event as InstallPrompt).prompt !== 'function') return;
      event.preventDefault();
      if (media.matches) return;
      clear();
      prompt.current = event as InstallPrompt;
      setAvailable(true);
      setStatus('idle');
    };
    const installed = () => { clear(); setStatus('installed'); };
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', installed);
    media.addEventListener('change', modeChanged);
    return () => {
      window.clearTimeout(deadline.current);
      generation.current++;
      window.removeEventListener('beforeinstallprompt', offered);
      window.removeEventListener('appinstalled', installed);
      media.removeEventListener('change', modeChanged);
    };
  }, []);

  async function install() {
    const offered = prompt.current;
    if (!offered || pending.current || standalone) return;
    prompt.current = null; // Browser events are single-use, including dismissed prompts.
    pending.current = true;
    setAvailable(false);
    setStatus('pending');
    const attempt = ++generation.current;
    // Browser-owned UI can remain open; don't let it leave app controls stuck indefinitely.
    const timer = deadline.current = window.setTimeout(() => {
      if (generation.current === attempt) { generation.current++; pending.current = false; setStatus('unavailable'); }
    }, 60000);
    try {
      const choice = await offered.prompt();
      if (generation.current === attempt) setStatus(choice?.outcome === 'accepted' ? 'accepted' : choice?.outcome === 'dismissed' ? 'dismissed' : 'unavailable');
    } catch {
      if (generation.current === attempt) setStatus('unavailable');
    } finally {
      window.clearTimeout(timer);
      if (generation.current === attempt) pending.current = false;
    }
  }
  return { available, status, standalone, install };
}
