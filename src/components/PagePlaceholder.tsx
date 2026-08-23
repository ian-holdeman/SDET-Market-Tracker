import React from 'react';
import { ArrowLeft, Layers, Terminal, User, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { PageView } from '../types';

interface PagePlaceholderProps {
  page: PageView;
  onBackToHome: () => void;
}

export const PagePlaceholder: React.FC<PagePlaceholderProps> = ({ page, onBackToHome }) => {
  const getPageInfo = () => {
    switch (page) {
      case 'board':
        return {
          title: 'The Board',
          badge: 'Upcoming Page 2',
          icon: <Layers className="w-8 h-8 text-blue-400" />,
          description: 'A curated multi-asset watchlist dashboard with customizable columns, technical indicators, sector allocation breakdowns, and live price alerts.',
          roadmap: [
            'Interactive multi-ticker watchlist table (VTI, SPY, QQQ, NVDA, AAPL, etc.)',
            'Sector heatmaps and asset allocation breakdown',
            'Real-time price deltas with visual sorting and filtering',
            'SDET automated assertions on data feed sync',
          ],
        };
      case 'tests':
        return {
          title: 'The Tests',
          badge: 'Upcoming Page 3',
          icon: <Terminal className="w-8 h-8 text-emerald-400" />,
          description: 'A live visual feed to automated test runs, test suites, execution logs, API contract validations, and SDET quality metrics.',
          roadmap: [
            'Live simulated and real-time automated test runner execution feeds',
            'API contract verification (JSON schema, response latencies, data bounds)',
            'Visual regression test summaries and flaky test diagnostic logs',
            'Code coverage heatmaps and test pipeline run histories',
          ],
        };
      case 'about':
        return {
          title: 'About & SDET Craft',
          badge: 'Upcoming Page 4',
          icon: <User className="w-8 h-8 text-purple-400" />,
          description: 'The engineer profile, SDET testing philosophy, architecture rationale, and project documentation for hiring managers and collaborators.',
          roadmap: [
            'Ian\'s background as a Software Development Engineer in Test (SDET)',
            'System architecture documentation and test automation framework design',
            'Tech stack overview: React 19, TypeScript, Tailwind CSS, Playwright/Cypress patterns',
            'Direct links to GitHub, LinkedIn, and resume download',
          ],
        };
      default:
        return {
          title: 'Page Under Construction',
          badge: 'Coming Soon',
          icon: <Sparkles className="w-8 h-8 text-blue-400" />,
          description: 'This page is queued for development.',
          roadmap: [],
        };
    }
  };

  const info = getPageInfo();

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-14 px-4">
      <button
        id="placeholder-back-btn"
        onClick={onBackToHome}
        className="mb-8 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-sm font-medium transition-all group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Landing Page</span>
      </button>

      <div className="bg-[#0F141E] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
            {info.icon}
          </div>
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800/60 mb-2">
              {info.badge}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {info.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-2 leading-relaxed">
              {info.description}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Planned Features for this Section
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {info.roadmap.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-[#141A26] border border-slate-800/80 text-xs text-slate-300"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onBackToHome}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            Return to Landing View
          </button>
        </div>
      </div>
    </div>
  );
};
