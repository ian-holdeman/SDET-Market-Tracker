import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Storage, CRC32C } from '@google-cloud/storage';
import { GoogleObjectStore } from '../../server/object-store';

test('Google SDK adapter pins generations, verifies checksums and sends conditional writes', async t => {
  const content = Buffer.from('sanitized evidence');
  const checksum = new CRC32C(); checksum.update(content);
  let mode = 'valid', uploads = 0;
  const seen: URL[] = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, 'http://localhost'); seen.push(url);
    res.setHeader('Content-Type', 'application/json');
    if (mode === 'denied') { res.writeHead(403); res.end(JSON.stringify({error:{code:403,message:'denied'}})); return; }
    if (mode === 'missing') { res.writeHead(404); res.end(JSON.stringify({error:{code:404,message:'missing'}})); return; }
    if (req.method === 'POST') {
      uploads++;
      assert.equal(url.searchParams.get('ifGenerationMatch'), '7');
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      assert.ok(Buffer.concat(chunks).includes(content), 'multipart body includes the evidence bytes');
      res.end(JSON.stringify({generation:'8',size:String(content.length),crc32c:checksum.toString()})); return;
    }
    if (url.searchParams.get('alt') === 'media') {
      assert.equal(url.searchParams.get('generation'), '7');
      // Missing storage-encoding headers must not silently disable our integrity check.
      res.setHeader('x-goog-hash', `crc32c=${checksum.toString()}`);
      res.end(mode === 'corrupt' ? Buffer.alloc(content.length, 65) : content); return;
    }
    res.end(JSON.stringify({generation:'7',size:String(content.length),crc32c:checksum.toString()}));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const storage = new Storage({projectId:'fixture', apiEndpoint:`http://127.0.0.1:${(server.address() as {port:number}).port}`, retryOptions:{autoRetry:false}, timeout:1000});
  const objects = new GoogleObjectStore('fixture-evidence', storage);
  assert.deepEqual(await objects.read('snapshots/evidence.json', 100), {generation:'7',bytes:content});
  await objects.put('snapshots/evidence.json', content, '7');
  assert.equal(uploads, 1);
  await assert.rejects(objects.read('snapshots/evidence.json', 1), /metadata/);
  mode = 'corrupt'; await assert.rejects(objects.read('snapshots/evidence.json', 100));
  mode = 'missing'; assert.equal(await objects.read('snapshots/evidence.json', 100), null);
  mode = 'denied'; await assert.rejects(objects.read('snapshots/evidence.json', 100), /unavailable/);
  assert.ok(seen.every(url => url.pathname.includes('/b/fixture-evidence/')));
});
