import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, LogIn, Moon, Settings, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppearance } from '../hooks/useAppearance';
import { Dialog } from './Dialog';
import type { PageView, UserProfile } from '../types';

interface UserSettingsProps { onNavigate: (page: PageView) => void; }
const actionStyle = 'shrink-0 rounded-xl border border-line-strong bg-surface-800 px-4 py-2.5 text-xs font-semibold text-ink-strong hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed';

export function UserSettings({ onNavigate }: UserSettingsProps) {
  const { user, loading, openAuthModal } = useAuth();
  if (!user && loading) return <div role="status" className="mx-auto max-w-xl rounded-2xl border border-line bg-panel p-8 text-sm text-ink-muted">Loading account…</div>;
  if (!user) return <div className="mx-auto max-w-xl rounded-2xl border border-line bg-panel p-8 text-center space-y-6">
    <Settings aria-hidden="true" className="mx-auto h-7 w-7 text-info-ink-400" />
    <div className="space-y-2"><h1 className="text-2xl font-bold text-ink-heading">Account Settings</h1>
      <p className="text-sm text-ink-muted">Sign in to manage your account settings and saved watchlist.</p></div>
    <button onClick={() => openAuthModal('login')} className="inline-flex items-center gap-2 rounded-xl bg-info-600 px-5 py-3 text-sm font-semibold text-on-action hover:bg-info-500">
      <LogIn aria-hidden="true" className="h-4 w-4" />Sign In to Your Account
    </button>
  </div>;
  return <AccountSettings key={user.id} user={user} onNavigate={onNavigate} />;
}

function AccountSettings({ user, onNavigate }: UserSettingsProps & { user: UserProfile }) {
  const { deleteAccount, clearWatchlist, accountBusy } = useAuth();
  const { theme, setTheme } = useAppearance();
  const [dialog, setDialog] = useState<'clear' | 'delete' | null>(null);
  const [pending, setPending] = useState<'clear' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true), submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const open = (kind: 'clear' | 'delete', button: HTMLButtonElement) => {
    button.focus(); // Safari pointer activation does not focus buttons automatically.
    setError(null); setNotice(null); setDialog(kind);
  };
  const submit = async () => {
    if (!dialog || submitting.current || accountBusy) return;
    const operation = dialog;
    submitting.current = true; setPending(operation); setError(null); setNotice(null);
    try {
      if (operation === 'delete') await deleteAccount(); else await clearWatchlist();
      if (!mounted.current) return;
      setDialog(null);
      if (operation === 'delete') onNavigate('home');
      else setNotice('Watchlist cleared. Your account remains.');
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'The request was not confirmed. Check your current account before retrying.');
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(null);
    }
  };
  const progress = pending === 'delete' ? 'Deleting account… Closing this dialog does not cancel the request.' : 'Clearing watchlist… Closing this dialog does not cancel the request.';
  return <section aria-labelledby="settings-title" className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
    <div className="border-b border-line px-5 py-5 sm:px-7">
      <p data-testid="settings-name" className="break-words text-lg font-semibold text-ink-heading">{user.username}</p>
      <h1 ref={heading} tabIndex={-1} id="settings-title" className="mt-1 text-sm text-ink-muted">Settings</h1>
    </div>
    <div className="divide-y divide-line">
      <div className="settings-row">
        <div><h2 className="settings-label">Appearance</h2></div>
        <fieldset className="flex gap-1 rounded-xl border border-line-strong bg-surface-900 p-1">
          <legend className="sr-only">Appearance</legend>
          {(['light', 'dark'] as const).map(value => <label key={value} className="relative cursor-pointer">
            <input className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" type="radio" name="appearance" value={value} checked={theme === value} onChange={() => setTheme(value)} onClick={() => { if (theme === value) setTheme(value); }} />
            <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted peer-checked:bg-surface-700 peer-checked:text-ink-heading peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
              {value === 'light' ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}{value === 'light' ? 'Light' : 'Dark'}
            </span>
          </label>)}
        </fieldset>
      </div>
      <div className="settings-row">
        <div><h2 className="settings-label">Clear Watchlist</h2><p className="settings-description">{user.watchlist.length ? `${user.watchlist.length} saved ${user.watchlist.length === 1 ? 'asset' : 'assets'}.` : 'Your watchlist is empty.'}</p></div>
        <button className={actionStyle} disabled={accountBusy || !user.watchlist.length} onClick={event => open('clear', event.currentTarget)}>Clear Watchlist</button>
      </div>
      <div className="settings-row">
        <div><h2 className="settings-label">Delete Account</h2><p className="settings-description">Remove your app account and saved watchlist.</p></div>
        <button id="btn-delete-account" className="shrink-0 rounded-xl border border-danger-surface-800 bg-danger-surface-950/50 px-4 py-2.5 text-xs font-semibold text-danger-ink-300 hover:bg-danger-surface-900/60 disabled:opacity-50" disabled={accountBusy} onClick={event => open('delete', event.currentTarget)}>Delete Account</button>
      </div>
      <div className="settings-row">
        <h2 className="settings-label">Privacy</h2>
        <a href="/privacy" className="inline-flex items-center gap-2 rounded text-xs font-semibold text-info-ink-300 underline underline-offset-4">Privacy &amp; Data Notice<ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
      </div>
    </div>
    {!dialog && (pending || error || notice) && <div className="border-t border-line px-5 py-4 sm:px-7">
      {pending && <p role="status" className="text-sm text-ink-muted">{progress}</p>}
      {error && <p role="alert" className="text-sm text-danger-ink-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-positive-ink-400">{notice}</p>}
    </div>}
    {dialog && <Dialog compact fallbackFocus={heading} title={dialog === 'clear' ? 'Clear Watchlist' : 'Delete Account'} close={() => setDialog(null)}>
      {dialog === 'clear' ? <p className="text-sm text-ink-secondary">Remove all saved assets from your watchlist? Your account remains, and you can save assets again.</p> : <div className="space-y-3 text-sm text-ink-secondary">
        <p>Delete your app authentication identity, all personal watchlist items and any app admin assignment? A later sign-in creates a fresh account.</p>
        <p className="text-xs text-ink-muted">This does not delete your Google account or shared Board assets. Provider backups and security logs follow provider retention policies; immediate erasure from those systems is not guaranteed.</p>
      </div>}
      {pending && <p role="status" className="text-sm text-ink-muted">{progress}</p>}
      {error && <p role="alert" className="text-sm text-danger-ink-300">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button className={actionStyle} onClick={() => setDialog(null)}>{pending ? 'Close' : 'Cancel'}</button>
        <button id={dialog === 'delete' ? 'confirm-delete-account-btn' : undefined} disabled={!!pending || accountBusy} onClick={() => void submit()} className="rounded-xl bg-danger-600 px-4 py-2.5 text-xs font-semibold text-on-action hover:bg-danger-500 disabled:opacity-50">
          {dialog === 'delete' ? 'Yes, Delete Account' : 'Yes, Clear Watchlist'}
        </button>
      </div>
    </Dialog>}
  </section>;
}
