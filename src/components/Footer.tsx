import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 sm:mt-24 border-t border-slate-800/80 bg-[#080B10] py-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-500 text-center sm:text-left">
            © {new Date().getFullYear()} Ian Holdeman
          </p>

          <p className="font-mono text-[11px] text-slate-500 text-center sm:text-right">
            Public Market Data • Strict Read-Only
          </p>
        </div>
      </div>
    </footer>
  );
};
