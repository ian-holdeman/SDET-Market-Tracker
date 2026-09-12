import React from 'react';
import { Brain, ArrowRight } from 'lucide-react';
import { PageView } from '../types';

interface TheLogicProps {
  onNavigate: (page: PageView) => void;
}

const card = 'bg-panel/90 border border-line/90 rounded-2xl p-6 sm:p-8 space-y-5';
const heading = 'text-xl sm:text-2xl font-bold text-ink-heading';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus';
const sourceRoot = 'https://github.com/ian-holdeman/SDET-Market-Tracker/blob/main/';

const evidence = [
  {
    title: 'Independent quote comparison', path: 'docs/market-comparison.md',
    text: 'An opt-in private check compares Yahoo and Finnhub quotes for three US stocks within a dated regular session and declared time and price tolerances. Unavailable or unaligned samples are inconclusive. Provider results stay private; this is separate from deterministic CI and does not establish accuracy across assets or historical adjustments.',
  },
  {
    title: 'Price calculation tests', path: 'scripts/tests/price-activity.test.ts',
    text: 'Injected prices and dates exercise month-end, weekends, leap days, zero baselines and short histories. These check the calculation rules; they do not independently reconcile Yahoo prices or corporate actions.',
  },
  {
    title: 'Market recovery scenarios', path: 'src/tests/specs/board/market-data.spec.ts',
    text: 'Mocked browser requests check that a failed refresh preserves the last price with a stale warning and that missing history stays unavailable. They establish presentation behavior, not provider uptime.',
  },
  {
    title: 'Asset registration scenarios', path: 'src/tests/specs/auth/auth.spec.ts',
    text: 'Mocked registration failure shows an error, leaves the asset unwatched and makes no watchlist write. Successful registration saves under the user UUID without granting curation. These browser checks do not prove database authorization.',
  },
  {
    title: 'Database ownership tests', path: 'supabase/tests/authorization.test.sql',
    text: 'Transactional pgTAP checks exercise grants and row-level security, including cross-user access, admin isolation and forged metadata. They test database policies, not Google sign-in.',
  },
  {
    title: 'Account deletion integration', path: 'scripts/auth-tests/deletion.test.ts',
    text: 'Disposable local Auth accounts exercise the real deletion endpoint and database cascades. Reusing an email creates a new UUID with no old watchlist or admin role. This uses password Auth locally, not Google OAuth or a hosted deployment.',
  },
  {
    title: 'Reporting integrity tests', path: 'scripts/tests/telemetry.test.ts',
    text: 'Controlled reports and GitHub responses exercise retries, missing cases, invalid provenance and expired artifacts. Passing ingestion is never substituted for passing tests. These fixtures do not establish current GitHub availability.',
  },
  {
    title: 'Nightly CI and publication', path: 'docs/test-telemetry.md',
    text: 'The Application baseline workflow targets 2:17 a.m. America/Denver daily, including weekends and unchanged commits. GitHub moves the spring-forward gap to 3:00 a.m.; runs can be delayed or missed, and public schedules can be disabled after 60 days of repository inactivity. The server accepts sanitized evidence only from the configured repository, branch and workflow, with matching commit, run and attempt. Local checks and manual runs do not prove scheduled publication.',
  },
];

export const TheLogic: React.FC<TheLogicProps> = ({ onNavigate }) => (
  <article aria-labelledby="logic-title" className="w-full max-w-5xl mx-auto space-y-8 sm:space-y-10 py-4 text-sm sm:text-base text-ink-secondary leading-relaxed">
    <header className="text-center max-w-3xl mx-auto space-y-4">
      <Brain aria-hidden="true" className="w-6 h-6 text-info-ink-400 mx-auto" />
      <h1 id="logic-title" className="text-3xl sm:text-4xl lg:text-5xl font-black text-ink-heading tracking-tight">The Logic</h1>
      <div className="h-[2px] w-32 sm:w-48 bg-gradient-to-r from-transparent via-info-500/70 to-transparent rounded-full mx-auto" />
      <p className="text-ink-muted">The project, the decisions behind it, and how I check the work.</p>
    </header>

    <section aria-labelledby="logic-why" className={card}>
      <h2 id="logic-why" className={heading}>Why I built this</h2>
      <p className="max-w-3xl">I wanted a market tracker that put the assets I care about and their most relevant information in one clean, easy-to-use view. As I learned more about investing, I developed a clearer idea of what I wanted to follow and how I wanted to see it. This app gives me a place to organize that information, sort through it, and maintain my own watchlist. It’s not my perfect tracker due to financial constraints, but each asset includes a Google Finance link so users can dive deeper.</p>
      <p className="max-w-3xl">The other (and more financially responsible) reason I built this app was to show off my skills as an engineer. I’ve had a long career in tech, but I haven’t done a personal project like this since college. Recent developments in tech and AI have reinvigorated my passion for the industry, and I want to show employers that I have the skills they’re looking for in an engineer. Over the course of a month, I designed and built the initial version of this app and its automation framework from the ground up. I intend to keep adding features and developing my skills as time goes on.</p>
    </section>

    <section aria-labelledby="logic-architecture" className={card}>
      <h2 id="logic-architecture" className={heading}>How the app works</h2>
      <p className="max-w-3xl">The browser brings together market data, private watchlists and published test evidence. Each has a different source of authority. Visitors can explore the Board, Tests and Logic without an account; Google sign-in enables a private watchlist.</p>
      <figure className="space-y-3" aria-labelledby="logic-flow-title">
        <figcaption id="logic-flow-title" className="text-sm font-semibold text-ink-heading">Data flow</figcaption>
        <div className="space-y-3">
          {[
            ['Market data', 'Yahoo', 'Express validation', 'React Board & charts'],
            ['Private watchlists', 'React + user session', 'Supabase Auth & API', 'PostgreSQL ownership rules'],
            ['Test evidence', 'GitHub Actions artifacts', 'Express evidence validation', 'React Tests & Home'],
          ].map(([label, ...steps]) => (
            <div key={label} className="rounded-xl bg-raised border border-line/70 p-4">
              <p className="text-xs font-semibold text-info-ink-300 mb-3">{label}</p>
              <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {steps.map((step, index) => <li key={step} className="flex items-center gap-2 min-w-0">
                  {index > 0 && <ArrowRight aria-hidden="true" className="w-4 h-4 shrink-0 text-ink-subtle rotate-90 sm:rotate-0" />}
                  <span><span className="sr-only">{index + 1}. </span>{step}</span>
                </li>)}
              </ol>
            </div>
          ))}
        </div>
      </figure>
      <div className="space-y-3 max-w-3xl">
        <p>Market responses are validated before use. Missing values stay unavailable, and a failed refresh labels retained observations stale. Provider observation time stays separate from retrieval time, including through caches.</p>
        <p>Watchlists belong to an authenticated UUID. Database grants and row-level security enforce ownership; hiding a button cannot grant or remove permission. Admin curation is separate from private watchlists. Registration and account deletion use server-side identity verification.</p>
        <p>GitHub supplies published test evidence. The server validates its source and retains a private snapshot for cold starts, then rechecks upstream evidence. Local runs cannot publish to the dashboard, and visitors cannot start tests.</p>
      </div>
      <div className="border-t border-line pt-5 space-y-3">
        <h3 className="font-semibold text-ink-heading">Tools and workflow</h3>
        <p className="text-sm text-ink-muted">The interface was developed with a mobile-first mindset. Try both mobile and desktop views to see how the layout adapts.</p>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {[
            ['Interface', 'React · TypeScript · Vite · Tailwind'],
            ['API and data', 'Node.js · Express · Supabase Auth · PostgreSQL'],
            ['Verification', 'Node test runner · Playwright · pgTAP'],
            ['Delivery checks', 'GitHub Actions · Docker / local Supabase'],
          ].map(([purpose, tools]) => <div key={purpose}><dt className="text-ink-heading font-medium">{purpose}</dt><dd className="text-ink-muted mt-1">{tools}</dd></div>)}
        </dl>
        <p className="text-sm text-ink-muted">Behavior changes start with a failing test or reproduction. GitHub Actions is configured for nightly checks at 2:17 a.m. Denver time: build, offline and browser checks run alongside SQL and local Auth checks. Trusted results populate The Tests. The app is hosted on Cloud Run; nightly CI does not deploy it.</p>
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <button onClick={() => onNavigate('board')} className={`px-4 py-2 rounded-xl bg-info-600 hover:bg-info-500 text-on-action text-sm font-semibold cursor-pointer ${focus}`}>The Board</button>
        <button onClick={() => onNavigate('tests')} className={`px-4 py-2 rounded-xl bg-positive-600 hover:bg-positive-500 text-on-action text-sm font-semibold cursor-pointer ${focus}`}>The Tests</button>
      </div>
    </section>

    <section aria-labelledby="logic-testing" className={card}>
      <h2 id="logic-testing" className={heading}>How I test it</h2>
      <p className="max-w-3xl">A valuable test makes sure your code does what it says it’s doing. The core features have to work: the Board has to load, users need to be able to save watchlists and add new assets, and the Tests dashboard needs to report results accurately. Those features need testable outputs, not just a page that looks like it worked.</p>
      <p className="max-w-3xl">That also means testing what happens when something goes wrong. If a market request fails, the app should clearly label retained data as stale. If a new asset can’t be validated, the app should explain the failure and leave the watchlist unchanged. And if a test passes only after a retry, the dashboard should show it as flaky rather than a clean pass.</p>
      <p className="max-w-3xl">The checks run at different levels. Controlled inputs test calculations and API failure handling. Browser tests check user workflows with mocked services. Local database and Auth tests check ownership, permissions, and account deletion against real services. Each covers a different part of the application; browser mocks alone can’t establish that the database keeps users’ data separate.</p>
      <details className="border-t border-line pt-4 text-sm">
        <summary className={`cursor-pointer text-info-ink-300 rounded-sm ${focus}`}>Evidence and coverage boundaries</summary>
        <div data-testid="logic-evidence" className="pt-5 space-y-5">
          {evidence.map(item => <div key={item.path} className="space-y-1">
            <a href={sourceRoot + item.path} className={`text-info-ink-300 underline underline-offset-4 rounded-sm ${focus}`}>{item.title}</a>
            <p className="text-ink-muted max-w-3xl">{item.text}</p>
          </div>)}
          <p className="text-ink-muted">Source links describe test scenarios on the main branch, not a current passing run. The Tests page separates published browser-case results, curated recordings with mocked services, and a historical CI timeline. Database job status does not supply database case counts.</p>
          <p className="text-ink-muted">Pass Rate counts first-attempt passes over all collected browser test-project cases. A passing retry stays flaky; missing evidence is unavailable, never a perfect score.</p>
          <p className="text-ink-muted">The nightly baseline keeps live-provider checks opt-in. The private quote comparison and hosted verification have limited, dated coverage; broad market reconciliation, load testing and physical-device checks remain gaps. Test duration is not application performance. No benchmark is claimed here.</p>
        </div>
      </details>

    </section>

    <section aria-labelledby="logic-ai" className={card}>
      <h2 id="logic-ai" className={heading}>AI and what comes next</h2>
      <p className="max-w-3xl">I started this project in Google AI Studio with Gemini and GitHub Copilot. Compared with learning Python in IDLE, I could already see how useful AI could be for building software. But I also spent a lot of time correcting mistakes and checking claims about functionality that didn’t hold up when I tested it. Iterating helped, though I still regularly needed to re-prompt or fix things myself.</p>
      <p className="max-w-3xl">Working with Astra has felt more like collaborating with a coworker I can give a task to and check in with along the way. I still draft and design the features before handing over implementation, then review each code slice as I would a junior developer’s pull request. Once the automated tests pass, I run a visual regression check of the site and manually test the new behavior where needed.</p>
      <p className="max-w-3xl">That workflow has helped me be more productive while keeping me involved in the decisions and verification. I appreciate being able to spend more time shaping the application, but I still need to understand what changed and check that it works.</p>
      <p className="max-w-3xl">I’d want to help a QA team stay up to date with the models available and learn where they’re useful. The most important thing I’ve learned is to take the work in bite-sized chunks. Don’t give the AI too much to handle at once. Give it clear rules and restrictions, keep a consistent design philosophy, and validate its outputs as you would any other developer’s work.</p>
      <p className="max-w-3xl">Don’t commit code you don’t understand, and keep your own skills sharp. A tool is only as strong as the person wielding it.</p>
    </section>
  </article>
);
