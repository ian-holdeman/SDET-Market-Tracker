const maxBytes = 8 * 1024 * 1024;

// Native WebKit media requests bypass Playwright routing on Windows. A bounded
// HEAD check also gives users consistent HTTP errors before native decoding.
// Playback uses the immutable local URL so range requests work across browsers.
export async function verifyRecordingAvailability(src: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<void> {
  signal.throwIfAborted();
  const response = await request(src, { method: 'HEAD', signal });
  const size = Number(response.headers.get('content-length'));
  if (!response.ok || !response.headers.get('content-type')?.startsWith('video/mp4') ||
      !Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
    throw Error('Recording unavailable');
  }
  signal.throwIfAborted();
}
