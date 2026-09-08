/** Enforce a byte limit while reading, before buffering/parsing provider content. */
export async function providerJson(response: Response, limit = 5_000_000): Promise<unknown> {
  if (!response.ok || !response.body) throw Error('Provider response unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error('Provider response too large');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
  } finally { await reader.cancel(); }
}
