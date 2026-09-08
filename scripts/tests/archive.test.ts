import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PipelineArchive } from '../../server/test-archive';
import { pipelineFixture, pipelineBrowserEvidence } from '../../src/tests/fixtures/pipeline';
import { MemoryObjects } from '../test-support/memory-objects';

const now = Date.parse('2026-09-08T12:00:00Z');
const complete = () => ({ ...pipelineFixture(now), browserEvidence: pipelineBrowserEvidence() });

test('an explicitly published archive survives source expiry with original attempts and dates', async () => {
  const objects = new MemoryObjects(), publisher = new PipelineArchive(objects, () => now);
  await publisher.publish(complete());
  const later = new PipelineArchive(objects, () => now + 180 * 86400000);
  const value = await later.read();
  assert.equal(value?.source, 'archive');
  assert.equal(value?.startedAt, complete().startedAt);
  assert.deepEqual(value?.browserEvidence, complete().browserEvidence);
  assert.equal(value?.archivePublishedAt, new Date(now).toISOString());
});

test('invalid or failed replacement cannot destroy the selected archive', async () => {
  const objects = new MemoryObjects(), archive = new PipelineArchive(objects, () => now);
  await archive.publish(complete());
  const previous = await archive.read();
  await assert.rejects(archive.publish({ ...complete(), browserEvidence: null }));
  objects.denied = true;
  await assert.rejects(archive.publish(complete()));
  objects.denied = false;
  assert.deepEqual(await archive.read(), previous);
});

test('corruption and revocation fail closed and no old publisher restores the selection', async () => {
  const objects = new MemoryObjects(), archive = new PipelineArchive(objects, () => now);
  await archive.publish(complete());
  const object = [...objects.objects.entries()].find(([name]) => name.includes('/objects/'))!;
  const original = Buffer.from(object[1].bytes);
  object[1].bytes = Buffer.from('{}');
  await assert.rejects(archive.read());
  object[1].bytes = original;
  const oldSelection = objects.objects.get(archive.selectionName)!;
  await archive.revoke();
  assert.equal(await archive.read(), null);
  await assert.rejects(objects.put(archive.selectionName, oldSelection.bytes, oldSelection.generation));
  await assert.rejects(archive.publish(complete()), /Explicit restore/);
  await archive.publish(complete(), true);
  assert.ok(await archive.read());
});

test('overlapping publishers cannot replace a newer verified selection', async () => {
  const objects = new MemoryObjects(), archive = new PipelineArchive(objects, () => now);
  await archive.publish(complete());
  const originalPut = objects.put.bind(objects);
  let release!: () => void, entered!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  let block = true;
  objects.put = async (name, bytes, generation) => {
    if (name === archive.selectionName && block) { block = false; entered(); await gate; }
    return originalPut(name, bytes, generation);
  };
  const stale = new PipelineArchive(objects, () => now + 1000).publish(complete());
  await ready;
  const newer = new PipelineArchive(objects, () => now + 2000);
  await newer.publish(complete());
  release();
  await assert.rejects(stale, /precondition/);
  assert.equal((await newer.read())?.archivePublishedAt, new Date(now + 2000).toISOString());
});

test('revocation during an archive read prevents returning the old selection', async () => {
  const objects = new MemoryObjects(), archive = new PipelineArchive(objects, () => now);
  await archive.publish(complete());
  const read = objects.read.bind(objects);
  objects.read = async (name, max) => {
    const result = await read(name, max);
    if (name.includes('/objects/')) await archive.revoke();
    return result;
  };
  await assert.rejects(archive.read(), /selection changed/);
});

test('an owner can revoke a corrupt selection without serving or trusting its contents', async () => {
  const objects = new MemoryObjects(), archive = new PipelineArchive(objects, () => now);
  await archive.publish(complete());
  const selected = objects.objects.get(archive.selectionName)!;
  await objects.put(archive.selectionName, Buffer.from('{bad'), selected.generation);
  await assert.rejects(archive.read());
  await archive.revoke();
  assert.equal(await archive.read(), null);
});
