import { Storage, CRC32C } from '@google-cloud/storage';

export type StoredObject = { generation: string; bytes: Buffer };
export interface ObjectStore {
  read(name: string, maximumBytes: number): Promise<StoredObject | null>;
  put(name: string, bytes: Buffer, expectedGeneration: string): Promise<void>;
}

/** Private bucket access through ADC; no application user's credentials or public URL. */
export class GoogleObjectStore implements ObjectStore {
  private readonly storage: Storage;
  constructor(private readonly bucket: string, storage?: Storage) {
    if (!/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(bucket)) throw Error('Invalid evidence bucket name');
    this.storage = storage ?? new Storage({ timeout: 3000, retryOptions: { autoRetry: false } });
  }
  async read(name: string, maximumBytes: number): Promise<StoredObject | null> {
    const file = this.storage.bucket(this.bucket).file(name);
    let metadata;
    try { [metadata] = await file.getMetadata(); }
    catch (error) { if ((error as { code?: number }).code === 404) return null; throw Error('Evidence storage unavailable'); }
    if (!metadata.generation || !/^\d+$/.test(String(metadata.generation)) ||
        !Number.isSafeInteger(Number(metadata.size)) || Number(metadata.size) < 0 || Number(metadata.size) > maximumBytes || metadata.contentEncoding ||
        typeof metadata.crc32c !== 'string' || !/^[A-Za-z0-9+/]{6}==$/.test(metadata.crc32c)) {
      throw Error('Invalid evidence object metadata');
    }
    const stream = this.storage.bucket(this.bucket).file(name, { generation: String(metadata.generation) })
      .createReadStream({ validation: 'crc32c' });
    const timer = setTimeout(() => stream.destroy(Error('Evidence read deadline')), 3000);
    const chunks: Buffer[] = [];
    const checksum = new CRC32C();
    let size = 0;
    try {
      for await (const chunk of stream) {
        size += chunk.length;
        if (size > maximumBytes) throw Error('Evidence object exceeds size limit');
        checksum.update(Buffer.from(chunk));
        chunks.push(Buffer.from(chunk));
      }
      if (size !== Number(metadata.size)) throw Error('Evidence object size mismatch');
      if (!checksum.validate(metadata.crc32c)) throw Error('Evidence object checksum mismatch');
      return { generation: String(metadata.generation), bytes: Buffer.concat(chunks) };
    } finally { clearTimeout(timer); stream.destroy(); }
  }
  async put(name: string, bytes: Buffer, expectedGeneration: string) {
    if (!/^\d+$/.test(expectedGeneration)) throw Error('Missing object write precondition');
    await this.storage.bucket(this.bucket).file(name).save(bytes, {
      resumable: false, timeout: 3000, validation: 'crc32c',
      preconditionOpts: { ifGenerationMatch: expectedGeneration },
      metadata: { contentType: 'application/json', cacheControl: 'no-store' },
    });
  }
}
