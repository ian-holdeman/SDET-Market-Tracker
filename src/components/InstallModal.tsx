import { Dialog } from './Dialog';
import { useInstall } from '../hooks/useInstall';

export function InstallModal({ close, installation }: { close: () => void; installation: ReturnType<typeof useInstall> }) {
  const { available, status, standalone, install } = installation;
  const message = standalone ? 'You’re using the app in a standalone window.'
    : status === 'installed' ? 'This browser reported that installation completed. Open Market Tracker from your home screen or app list.'
    : status === 'accepted' ? 'Installation was accepted. Your browser will finish adding the app.'
    : status === 'pending' ? 'Complete or dismiss the installation in your browser.'
    : status === 'dismissed' ? 'Installation was dismissed. You can still install from your browser’s menu.'
    : status === 'unavailable' ? 'The installation prompt is unavailable. Try your browser’s menu.'
    : available ? 'Add Market Tracker to your home screen and open it in its own window.'
    : 'Use your browser’s menu to add Market Tracker to your home screen.';
  return <Dialog title="Install app" close={close} compact>
    <p role="status" className="text-sm text-ink-body">{message}</p>
    {!standalone && status !== 'installed' && status !== 'accepted' && <>
      {available && <button type="button" onClick={install} className="min-h-11 rounded-lg border border-line-strong bg-info-surface-950 px-5 py-2 text-sm font-semibold text-info-ink-300 hover:bg-surface-800 focus-visible:outline-2 focus-visible:outline-focus">Install</button>}
      <p className="text-sm text-ink-muted">On Android, open this site in Brave or Chrome. Open the browser menu and look for <strong className="text-ink-strong">Install app</strong> or <strong className="text-ink-strong">Add to Home screen</strong>, then follow its prompts. Menu wording and availability vary by browser.</p>
      <p className="text-xs text-ink-muted">If no install option appears, try Chrome. A shortcut may still open in a browser tab. This page cannot check installations in other browsers.</p>
    </>}
    <p className="text-xs text-ink-muted">No account is needed to install. Market data, watchlists and test evidence require a connection.</p>
  </Dialog>;
}
