import React from 'react';
import { privacyEmail, privacySections, privacyUpdated } from '../content/privacy';

export function PrivacyNotice({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? 'h2' : 'h3';
  return <div className="space-y-5 text-sm leading-relaxed text-ink-secondary">
    <p className="text-xs text-ink-muted">Updated {privacyUpdated}</p>
    {privacySections.map(section => <section key={section.title}>
      <Heading className="mb-1 font-semibold text-ink-body">{section.title}</Heading>
      <p>{section.text}</p>
    </section>)}
    <section>
      <Heading className="mb-1 font-semibold text-ink-body">Operator</Heading>
      <p>Ian Holdeman operates this application personally from Utah. Contact: <a className="rounded text-info-ink-300 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-focus" href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
    </section>
  </div>;
}

export function PrivacyPage() {
  return <article aria-labelledby="privacy-page-title" className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-5 sm:p-8">
    <h1 id="privacy-page-title" className="mb-5 text-2xl font-bold text-ink-body">Privacy &amp; Data Notice</h1>
    <PrivacyNotice standalone />
  </article>;
}
