import React, { useState } from 'react';

interface TickerLogoProps {
  symbol: string;
  assetType?: 'ETF' | 'Stock';
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TickerLogo: React.FC<TickerLogoProps> = ({
  symbol,
  assetType = 'Stock',
  logoUrl,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Size mapping
  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px] rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-11 h-11 text-sm rounded-2xl',
  }[size];

  // Specific brand SVG vectors for the core tracked tickers
  const renderBrandLogo = () => {
    switch (symbol.toUpperCase()) {
      case 'GOOGL':
      case 'GOOG':
        return (
          <svg className="w-3/5 h-3/5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        );

      case 'VTI':
      case 'VXUS':
        // Vanguard's signature red ship emblem
        return (
          <svg className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#96151D" />
            <path
              d="M12 3L6 17H8.5L12 7.5L15.5 17H18L12 3Z"
              fill="#FFFFFF"
            />
            <path
              d="M9.5 19H14.5L13.5 21H10.5L9.5 19Z"
              fill="#FFFFFF"
              opacity="0.8"
            />
          </svg>
        );

      case 'SPY':
        // State Street SPDR track mark (Navy & Gold track)
        return (
          <svg className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0A2540" />
            <path
              d="M5 16L12 6L19 16H15.5L12 10.5L8.5 16H5Z"
              fill="#E5A93C"
            />
          </svg>
        );

      case 'QQQ':
        // Invesco QQQ geometric emblem (Cobalt Blue & Cyan)
        return (
          <svg className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#002F6C" />
            <circle cx="12" cy="12" r="6" stroke="#00B4D8" strokeWidth="2.5" />
            <path d="M16 16L19 19" stroke="#00B4D8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'SCHD':
        // Charles Schwab iconic blue square with clean white S wave
        return (
          <svg className="w-3/5 h-3/5" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#00A0DF" />
            <path
              d="M7 16C7 13 17 13 17 9C17 7 15 6 12 6C9 6 7.5 7.5 7.5 7.5"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        );

      default:
        return null;
    }
  };

  const brandSvg = renderBrandLogo();

  // If we have custom logo URL that hasn't errored
  if (logoUrl && !imgError) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden border border-slate-700/80 bg-slate-900 shadow-inner shrink-0 ${sizeClasses} ${className}`}>
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-contain p-1"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // If we have an inline SVG brand icon for this ticker
  if (brandSvg) {
    return (
      <div 
        className={`flex items-center justify-center shrink-0 border border-slate-700/80 bg-[#0c1017] shadow-inner ${sizeClasses} ${className}`}
        title={`${symbol} Logo`}
      >
        {brandSvg}
      </div>
    );
  }

  // Fallback: Clean styled typography badge
  return (
    <div
      className={`flex items-center justify-center font-mono font-black border shadow-inner shrink-0 ${
        assetType === 'ETF'
          ? 'bg-blue-950/70 border-blue-800/60 text-blue-300'
          : 'bg-slate-900 border-slate-700/80 text-white'
      } ${sizeClasses} ${className}`}
    >
      {symbol.slice(0, 3)}
    </div>
  );
};
