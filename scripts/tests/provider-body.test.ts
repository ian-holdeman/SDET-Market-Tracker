import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAsset } from '../../server/assets';

test('registration cancels an oversized provider body before parsing or accepting it', async () => {
  let cancellations = 0;
  const request = async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(5_000_001)); },
    cancel() { cancellations++; },
  }));
  // A short harness deadline reproduces the old unbounded response.json() read:
  // the source intentionally does not close after sending an oversized chunk.
  let timer: ReturnType<typeof setTimeout>;
  const result = await Promise.race([
    validateAsset('AAPL', request as typeof fetch).then(()=>'accepted', ()=>'rejected'),
    new Promise<string>(resolve => { timer = setTimeout(()=>resolve('still-reading'), 1500); }),
  ]);
  clearTimeout(timer!);
  assert.equal(result, 'rejected');
  assert.equal(cancellations, 2);
});
