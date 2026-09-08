import type { ObjectStore, StoredObject } from '../../server/object-store';

/** Disposable conditional-write store; never configured in application runtime. */
export class MemoryObjects implements ObjectStore {
  objects = new Map<string, StoredObject>();
  serial = 0;
  denied = false;
  async read(name: string, max: number) {
    if (this.denied) throw Error('denied');
    const value = this.objects.get(name);
    if (value && value.bytes.length > max) throw Error('oversized');
    return value ? { ...value, bytes: Buffer.from(value.bytes) } : null;
  }
  async put(name: string, bytes: Buffer, generation: string) {
    if (this.denied) throw Error('denied');
    if ((this.objects.get(name)?.generation ?? '0') !== generation) throw Error('precondition');
    this.objects.set(name, { generation: String(++this.serial), bytes: Buffer.from(bytes) });
  }
}
