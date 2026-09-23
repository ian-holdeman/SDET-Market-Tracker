import { Page, expect } from '@playwright/test';
import { FooterComponent } from './components/footer.component';

export class InstallPage {
  constructor(readonly page: Page) {}
  get opener() { return new FooterComponent(this.page).installLink; }
  get dialog() { return this.page.getByRole('dialog', { name: 'Install app', exact: true }); }
  get close() { return this.dialog.getByRole('button', { name: 'Close Install app' }); }
  get install() { return this.dialog.getByRole('button', { name: 'Install', exact: true }); }
  get status() { return this.dialog.getByRole('status'); }
  get offlineHeading() { return this.page.getByRole('heading', { name: 'Connection needed' }); }
  get retry() { return this.page.getByRole('button', { name: 'Try again' }); }
  async open() { await this.opener.click(); }
  async controlled() {
    await this.page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await this.page.reload();
    await expect.poll(() => this.page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  }
  async cachePaths() {
    return this.page.evaluate(async () => {
      const names = (await caches.keys()).filter(name => name.startsWith('imt-pwa-offline-'));
      return Promise.all(names.map(async name => ({ name, paths: (await (await caches.open(name)).keys()).map(request => new URL(request.url).pathname).sort() })));
    });
  }

  async waitingCache() {
    return this.page.evaluate(async () => {
      const worker = (await navigator.serviceWorker.getRegistration())?.waiting;
      if (!worker) return null;
      return new Promise<string>((resolve, reject) => {
        const channel = new MessageChannel();
        const cleanup = () => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); };
        const timer = setTimeout(() => { cleanup(); reject(new Error('Waiting worker did not identify its cache')); }, 3000);
        channel.port1.onmessage = event => { cleanup(); resolve(event.data); };
        worker.postMessage('offline-cache-name', [channel.port2]);
      });
    });
  }
  async prompt(outcome: 'accepted' | 'dismissed' | 'error' | 'pending') {
    await this.page.evaluate(value => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(window, { installCalls: 0 });
      Object.assign(event, { prompt: async () => {
        (window as any).installCalls++;
        if (value === 'error') throw new Error('Browser declined');
        if (value === 'pending') return new Promise(resolve => Object.assign(window, { finishInstall: () => resolve({ outcome: 'dismissed' }) }));
        return { outcome: value };
      } });
      window.dispatchEvent(event);
    }, outcome);
  }
}
