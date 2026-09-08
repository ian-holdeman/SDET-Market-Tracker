import type { Page } from '@playwright/test';
export class PipelineComponent {
  constructor(private page: Page) {}
  get root() {return this.page.getByTestId('pipeline-timeline');}
  get results() {return this.root.getByRole('region',{name:'Browser results',exact:true});}
  get replay() {return this.root.getByRole('button',{name:'Replay timeline',exact:true});}
  get pause() {return this.root.getByRole('button',{name:'Pause replay',exact:true});}
  get resume() {return this.root.getByRole('button',{name:'Resume replay',exact:true});}
  get position() {return this.root.getByRole('slider',{name:'Replay position',exact:true});}
  get retry() {return this.root.getByRole('button',{name:'Retry pipeline evidence',exact:true});}
  job(name: 'test'|'database') {return this.root.getByTestId(`pipeline-job-${name}`);}
}
