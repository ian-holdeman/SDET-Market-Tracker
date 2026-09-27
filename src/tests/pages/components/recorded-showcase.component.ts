import { type Page, type Locator } from '@playwright/test';

export class RecordedShowcaseComponent {
  readonly root: Locator;
  readonly video: Locator;
  readonly monitor: Locator;
  readonly play: Locator;
  readonly retry: Locator;
  readonly speed: Locator;
  readonly details: Locator;
  constructor(page: Page) {
    this.root = page.getByTestId('recorded-showcase');
    this.video = this.root.getByTestId('recording-video');
    this.monitor = this.root.getByTestId('recording-monitor');
    this.play = this.root.getByRole('button', { name: 'Play recording', exact: true });
    this.retry = this.root.getByRole('button', { name: 'Retry recording', exact: true });
    this.speed = this.root.getByRole('combobox', { name: 'Playback speed' });
    this.details = this.root.getByText('About this test', { exact: true });
  }
  tab(name: string) { return this.root.getByRole('tab', { name, exact: true }); }
  async seekPlaying(seconds: number) {
    await this.video.evaluate(async (element: HTMLVideoElement, target) => {
      const sought = new Promise<void>(resolve => element.addEventListener('seeked', () => resolve(), { once: true }));
      element.currentTime = target;
      await sought;
      // A redundant play() after a playing seek can remain pending until the
      // clip ends in Linux WebKit. Seeking does not itself require a restart.
      if (element.paused) await element.play();
    }, seconds);
  }
  async mediaState() {
    return this.video.evaluate((element: HTMLVideoElement) => ({
      paused: element.paused, ended: element.ended, seeking: element.seeking,
      time: element.currentTime, duration: element.duration, ready: element.readyState,
      speed: element.playbackRate, width: element.videoWidth, height: element.videoHeight,
    }));
  }
}
