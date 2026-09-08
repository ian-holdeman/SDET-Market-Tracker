import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, TextLayer, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';

GlobalWorkerOptions.workerSrc = workerUrl;
const PDF_URL = '/resume.pdf';
const DEADLINE = 15_000;

function ResumeSheet({ document, number, onError }: { document: PDFDocumentProxy; number: number; onError: () => void }) {
  const paper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let render: RenderTask | undefined;
    let layer: TextLayer | undefined;
    let observer: ResizeObserver | undefined;
    const timer = window.setTimeout(() => { if (!disposed) { onError(); render?.cancel(); layer?.cancel(); } }, DEADLINE);
    void (async () => {
      const page = await document.getPage(number);
      if (disposed) return;
      const viewport = page.getViewport({ scale: 4 / 3 });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const target = canvas.current!;
      target.width = Math.ceil(viewport.width * outputScale);
      target.height = Math.ceil(viewport.height * outputScale);
      paper.current!.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      const container = text.current!;
      container.replaceChildren();
      container.style.setProperty('--total-scale-factor', String(viewport.scale));
      const resize = () => { container.style.transform = `scale(${paper.current!.clientWidth / viewport.width})`; };
      observer = new ResizeObserver(resize);
      observer.observe(paper.current!);
      resize();
      render = page.render({ canvas: target, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] });
      layer = new TextLayer({ textContentSource: page.streamTextContent(), container, viewport });
      await Promise.all([render.promise, layer.render()]);
      if (!disposed) setReady(true);
    })().catch(() => { if (!disposed) onError(); }).finally(() => window.clearTimeout(timer));
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer?.disconnect();
      render?.cancel();
      layer?.cancel();
    };
  }, [document, number, onError]);
  return (
    <section aria-label={`Resume page ${number}`} aria-busy={!ready} data-testid="resume-page" className="mb-5">
      <div ref={paper} className="relative aspect-[17/22] overflow-hidden bg-white shadow-md">
        <canvas ref={canvas} data-testid="resume-canvas" aria-hidden="true" className="block h-auto w-full" />
        <div ref={text} className="textLayer origin-top-left" />
      </div>
    </section>
  );
}

export default function ResumeViewer() {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const failed = React.useCallback(() => setError(true), []);
  useEffect(() => {
    const originalTitle = window.document.title;
    window.document.title = 'Ian Holdeman | Resume';
    return () => { window.document.title = originalTitle; };
  }, []);
  useEffect(() => {
    let disposed = false;
    let task: ReturnType<typeof getDocument> | undefined;
    const controller = new AbortController();
    setDocument(null);
    setError(false);
    const timer = window.setTimeout(() => {
      if (disposed) return;
      setError(true);
      controller.abort();
      void task?.destroy();
    }, DEADLINE);
    void (async () => {
      const response = await fetch(PDF_URL, { signal: controller.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('Resume unavailable');
      const data = new Uint8Array(await response.arrayBuffer());
      if (disposed || controller.signal.aborted) return;
      // Local embedded fonts are drawn as paths, preserving the existing CSP without blob fonts or eval.
      task = getDocument({ data, disableFontFace: true, useWasm: false, useSystemFonts: false });
      const pdf = await task.promise;
      if (!disposed && !controller.signal.aborted) setDocument(pdf);
    })().catch(() => { if (!disposed) setError(true); }).finally(() => window.clearTimeout(timer));
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      controller.abort();
      void task?.destroy();
    };
  }, []);

  return (
    <main className="min-h-screen bg-canvas px-3 py-5 text-ink-body sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[816px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-base font-semibold text-ink-heading sm:text-lg">Ian Holdeman’s resume</h1>
          <a href={PDF_URL} download="Ian-Holdeman-Resume.pdf" className="inline-flex items-center gap-1.5 rounded text-xs text-ink-muted underline underline-offset-4 hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-focus">
            <Download aria-hidden="true" className="h-3.5 w-3.5" />Download PDF
          </a>
        </header>
        {error ? <div role="alert" className="rounded-xl border border-line bg-panel p-5 text-sm">
          <p>The resume preview could not be loaded. Try again, or use the download link.</p>
          {/* Reload also clears a failed PDF.js worker import cached by the browser/module runtime. */}
          <button onClick={() => window.location.reload()} className="mt-3 rounded text-info-ink-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus">Try again</button>
        </div> : document ? Array.from({ length: document.numPages }, (_, index) => <ResumeSheet key={index} document={document} number={index + 1} onError={failed} />)
          : <p role="status" className="text-sm text-ink-muted">Loading resume…</p>}
      </div>
    </main>
  );
}
