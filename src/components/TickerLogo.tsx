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

  // Specific brand SVG vectors for all tracked tickers
  const renderBrandLogo = () => {
    const sym = symbol.toUpperCase();

    switch (sym) {
      // --- VANGUARD ETFs ---
      case 'VTI':
      case 'VOO':
      case 'VXUS':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#96151D" />
            <path d="M12 3.5L5.5 16.5H8.5L12 7.5L15.5 16.5H18.5L12 3.5Z" fill="#FFFFFF" />
            <path d="M9 18H15L13.8 20.5H10.2L9 18Z" fill="#FFFFFF" opacity="0.85" />
          </svg>
        );

      // --- INVESCO ETFs ---
      case 'QQQM':
      case 'QQQ':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#002F6C" />
            <circle cx="12" cy="12" r="6.5" stroke="#00B4D8" strokeWidth="2.2" />
            <path d="M16.5 16.5L19.5 19.5" stroke="#00B4D8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2.5" fill="#00E5FF" />
          </svg>
        );

      case 'SPMO':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#002F6C" />
            <circle cx="12" cy="12" r="6.5" stroke="#00B4D8" strokeWidth="2.2" />
            <path d="M7 15L12 9L15 12L18 7M18 7H14M18 7V11" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      // --- CHARLES SCHWAB ---
      case 'SCHD':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#00A0DF" />
            <path
              d="M7 16.5C7 13.5 17 13.5 17 9.5C17 7.2 15 6 12 6C9 6 7.5 7.5 7.5 7.5"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        );

      // --- ISHARES / BLACKROCK ---
      case 'IWM':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#000000" />
            <polygon points="17,5 21,5 15,19 11,19" fill="#FF0037" />
            <text x="7" y="17" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif">i</text>
          </svg>
        );

      // --- SPDR / STATE STREET ---
      case 'DIA':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0A2540" />
            <polygon points="12,4 15,10 21,10 16,14 18,20 12,16 6,20 8,14 3,10 9,10" fill="#E63946" />
            <circle cx="12" cy="12" r="3.2" fill="#FFFFFF" />
          </svg>
        );

      // --- SPACEX (SPCX) ---
      case 'SPCX':
      case 'SPACEX':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#050508" />
            {/* SpaceX stylized X with orbital trajectory curve */}
            <path d="M5 6L11 18H8L4 9L5 6Z" fill="#FFFFFF" />
            <path d="M12 6L6 18H9L19 6H12Z" fill="#FFFFFF" />
            {/* Iconic SpaceX swoosh trailing arc */}
            <path d="M7 17C11 13 15 9.5 20 7" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );

      // --- FIDELITY SECTOR ETFS ---
      case 'FCOM': // Communication
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,14 18,14" fill="#FFD100" />
            <path d="M8 18C10 16.5 14 16.5 16 18M6 20C9.5 17.5 14.5 17.5 18 20" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        );

      case 'FDIS': // Consumer Discretionary
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <path d="M7 16H17L16 20H8L7 16Z" fill="#FFFFFF" opacity="0.9" />
          </svg>
        );

      case 'FSTA': // Consumer Staples
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <path d="M12 15V21M12 16C10 16 9 17.5 9 19C10.5 19 12 18 12 16ZM12 17C14 17 15 18.5 15 20C13.5 20 12 19 12 17Z" stroke="#FFFFFF" strokeWidth="1.2" fill="#FFFFFF" />
          </svg>
        );

      case 'FENY': // Energy
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <path d="M12 15C10.5 16.5 10 18 10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19C14 18 13.5 16.5 12 15Z" fill="#FFA500" stroke="#FFFFFF" strokeWidth="0.8" />
          </svg>
        );

      case 'FNCL': // Financials
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <rect x="7" y="15" width="10" height="2" fill="#FFFFFF" />
            <line x1="8.5" y1="17" x2="8.5" y2="20" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="12" y1="17" x2="12" y2="20" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="15.5" y1="17" x2="15.5" y2="20" stroke="#FFFFFF" strokeWidth="1.2" />
            <rect x="6" y="20" width="12" height="1.5" fill="#FFFFFF" />
          </svg>
        );

      case 'FHLC': // Health Care
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <path d="M10.5 15H13.5V17H15.5V19H13.5V21H10.5V19H8.5V17H10.5V15Z" fill="#FFFFFF" />
          </svg>
        );

      case 'FIDU': // Industrials
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <circle cx="12" cy="18" r="2.8" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="2 1.5" />
            <circle cx="12" cy="18" r="1.2" fill="#FFFFFF" />
          </svg>
        );

      case 'FMAT': // Materials
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <polygon points="12,15 16,18 12,21 8,18" stroke="#FFFFFF" strokeWidth="1.4" fill="none" />
          </svg>
        );

      case 'FTEC': // Information Technology
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <rect x="9" y="15.5" width="6" height="5" rx="0.5" stroke="#FFFFFF" strokeWidth="1.2" fill="#007A33" />
            <line x1="7" y1="17" x2="9" y2="17" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="7" y1="19" x2="9" y2="19" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="15" y1="17" x2="17" y2="17" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="15" y1="19" x2="17" y2="19" stroke="#FFFFFF" strokeWidth="1.2" />
          </svg>
        );

      case 'FUTY': // Utilities
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#007A33" />
            <polygon points="12,4 6,13 18,13" fill="#FFD100" />
            <path d="M12.5 14.5L9.5 18H12.5L11.5 21.5L14.5 17.5H11.5L12.5 14.5Z" fill="#FFFFFF" />
          </svg>
        );

      // --- TECH MEGA CAPS & SEMICONDUCTORS ---
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

      case 'NVDA':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#1A1A1A" />
            <path
              d="M6 14C6 9.58 9.58 6 14 6C16.21 6 18.21 6.9 19.66 8.34L17.54 10.46C16.63 9.55 15.38 9 14 9C11.24 9 9 11.24 9 14C9 16.76 11.24 19 14 19C15.38 19 16.63 18.45 17.54 17.54L19.66 19.66C18.21 21.1 16.21 22 14 22C9.58 22 6 18.42 6 14Z"
              fill="#76B900"
            />
          </svg>
        );

      case 'AMD':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#141414" />
            <path d="M5 5H13L9 9H5V5Z" fill="#00A859" />
            <path d="M19 5V13L15 9V5H19Z" fill="#00A859" />
            <path d="M19 19H11L15 15H19V19Z" fill="#00A859" />
          </svg>
        );

      case 'MSFT':
        return (
          <svg className="w-3/5 h-3/5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="8" height="8" fill="#F25022" />
            <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
            <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
            <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
          </svg>
        );

      case 'AAPL':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#18181B" />
            <path
              d="M15.5 13.5C15.5 11.5 17.1 10.4 17.2 10.3C16.2 8.9 14.7 8.7 14.2 8.6C13 8.5 11.8 9.3 11.2 9.3C10.6 9.3 9.6 8.6 8.6 8.6C7.3 8.6 6.1 9.4 5.4 10.5C4.1 12.8 5.1 16.2 6.3 18C6.9 18.9 7.6 19.8 8.6 19.8C9.6 19.8 9.9 19.2 11.1 19.2C12.3 19.2 12.6 19.8 13.6 19.8C14.7 19.8 15.3 18.9 15.9 18C16.6 17 16.9 16 16.9 15.9C16.8 15.8 15.5 15.3 15.5 13.5Z"
              fill="#FFFFFF"
            />
            <path
              d="M13.5 7.1C14 6.5 14.4 5.6 14.3 4.7C13.5 4.8 12.5 5.3 12 5.9C11.5 6.5 11.1 7.4 11.2 8.3C12.1 8.4 13 7.8 13.5 7.1Z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'META':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0081FB" />
            <path d="M16.5 8C14.8 8 13.4 9.1 12 10.7C10.6 9.1 9.2 8 7.5 8C4.5 8 2.5 10.5 2.5 13.5C2.5 16.5 4.5 19 7.5 19C9.5 19 11 17.8 12 16.1C13 17.8 14.5 19 16.5 19C19.5 19 21.5 16.5 21.5 13.5C21.5 10.5 19.5 8 16.5 8ZM7.5 16.5C5.8 16.5 4.8 14.9 4.8 13.5C4.8 12.1 5.8 10.5 7.5 10.5C8.8 10.5 9.9 11.5 10.8 13.5C9.9 15.5 8.8 16.5 7.5 16.5ZM16.5 16.5C15.2 16.5 14.1 15.5 13.2 13.5C14.1 11.5 15.2 10.5 16.5 10.5C18.2 10.5 19.2 12.1 19.2 13.5C19.2 14.9 18.2 16.5 16.5 16.5Z" fill="#FFFFFF" />
          </svg>
        );

      case 'INTC':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0071C5" />
            <text x="12" y="15.5" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="system-ui, sans-serif">intel</text>
            <circle cx="8.5" cy="7.5" r="1.1" fill="#00C7FD" />
          </svg>
        );

      case 'MU':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#003366" />
            <path d="M4 17V8.5L8 14L12 8.5V17" stroke="#0072CE" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="17.5" cy="14" r="2.5" fill="#00A3E0" />
          </svg>
        );

      case 'MRVL':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0C2340" />
            <path d="M4 18L10 6L14 14L16 10L20 18" stroke="#E31837" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      case 'SNDK':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#D01923" />
            <text x="12" y="16.5" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-1">SD</text>
          </svg>
        );

      case 'WDC':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#004B87" />
            <text x="12" y="16.5" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">WD</text>
          </svg>
        );

      // --- CONSUMER & RETAIL ---
      case 'AMZN':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#131921" />
            <text x="12" y="12.5" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900" fontFamily="system-ui, sans-serif">a</text>
            <path d="M6.5 15.5C9.5 18 14.5 18 17.5 15.5" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" />
            <polygon points="17.5,14 19,16.5 16,16.5" fill="#FF9900" />
          </svg>
        );

      case 'TSLA':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#E82127" />
            <path
              d="M12 7.5C14.2 7.5 16.5 8.1 18 9.2L19 6.5C16.8 5.2 14.4 4.5 12 4.5C9.6 4.5 7.2 5.2 5 6.5L6 9.2C7.5 8.1 9.8 7.5 12 7.5ZM12 9.5C11.6 9.5 10.7 9.6 10.2 9.8L10.7 18.5H13.3L13.8 9.8C13.3 9.6 12.4 9.5 12 9.5Z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'JMKE':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#002D62" />
            <circle cx="12" cy="12" r="9" stroke="#C8102E" strokeWidth="1.5" />
            <text
              x="12"
              y="15.5"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
              letterSpacing="-0.5"
            >
              JM
            </text>
          </svg>
        );

      // --- FINANCIAL SERVICES & BROKERAGE ---
      case 'SOFI':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#00ADB5" />
            <circle cx="8" cy="8" r="2.2" fill="#FFFFFF" />
            <circle cx="16" cy="8" r="2.2" fill="#FFFFFF" />
            <circle cx="8" cy="16" r="2.2" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
          </svg>
        );

      case 'HOOD':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#171B26" />
            <path d="M12 4C12 4 8 9 8 13C8 16 10 18 12 20C14 18 16 16 16 13C16 9 12 4 12 4Z" fill="#00C805" />
            <path d="M12 4V20" stroke="#171B26" strokeWidth="1" />
          </svg>
        );

      case 'COIN':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0052FF" />
            <circle cx="12" cy="12" r="5" fill="#FFFFFF" />
            <rect x="11" y="9" width="6" height="6" fill="#0052FF" />
          </svg>
        );

      // --- CYBERSECURITY & ENTERPRISE SOFTWARE ---
      case 'CRWD':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#181818" />
            <path d="M5 15L12 4L19 15L14 13L12 19L10 13L5 15Z" fill="#D91E2A" />
          </svg>
        );

      case 'PANW':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#FA582D" />
            <circle cx="8" cy="8" r="2.5" fill="#FFFFFF" />
            <circle cx="16" cy="8" r="2.5" fill="#FFFFFF" />
            <circle cx="12" cy="16" r="2.5" fill="#FFFFFF" />
            <path d="M8 8L16 8L12 16L8 8Z" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        );

      case 'ORCL':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#C74634" />
            <rect x="5" y="7" width="14" height="10" rx="5" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          </svg>
        );

      case 'IBM':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0F2D59" />
            <text x="12" y="16" textAnchor="middle" fill="#5A96E3" fontSize="10" fontWeight="900" fontFamily="system-ui, monospace" letterSpacing="1">IBM</text>
            <line x1="4" y1="9" x2="20" y2="9" stroke="#0F2D59" strokeWidth="0.8" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="#0F2D59" strokeWidth="0.8" />
            <line x1="4" y1="15" x2="20" y2="15" stroke="#0F2D59" strokeWidth="0.8" />
          </svg>
        );

      // --- HEALTHCARE & BIOTECH ---
      case 'FBIO':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#1E293B" />
            <polygon points="12,4 19,8 19,16 12,20 5,16 5,8" stroke="#06B6D4" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="3" fill="#06B6D4" />
          </svg>
        );

      case 'ISRG':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#002B66" />
            <circle cx="12" cy="12" r="7" stroke="#00A3E0" strokeWidth="1.8" />
            <path d="M12 5V19M5 12H19" stroke="#00A3E0" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
          </svg>
        );

      case 'MRNA':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#CC0000" />
            <path d="M4 14C7 8 10 16 13 10C16 4 18 12 20 8" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="6" cy="12" r="1.5" fill="#FFFFFF" />
            <circle cx="12" cy="11" r="1.5" fill="#FFFFFF" />
            <circle cx="18" cy="9" r="1.5" fill="#FFFFFF" />
          </svg>
        );

      // --- INDUSTRIALS & AEROSPACE ---
      case 'AIRJ':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0B1B3D" />
            <path d="M12 4L19 18L12 15L5 18L12 4Z" fill="#38BDF8" />
            <path d="M12 4L12 15L19 18L12 4Z" fill="#FFFFFF" opacity="0.7" />
          </svg>
        );

      case 'RKLB':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#0A0A0A" />
            <path d="M12 3L16 13H13L15 21L8 11H11L12 3Z" fill="#E50914" />
          </svg>
        );

      case 'FLNC':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#1D4ED8" />
            <path d="M13 3L6 13H12L11 21L18 11H12L13 3Z" fill="#38BDF8" />
          </svg>
        );

      // --- EMERGING TECH, QUANTUM & AI ---
      case 'IONQ':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#130924" />
            <ellipse cx="12" cy="12" rx="7.5" ry="3" stroke="#A855F7" strokeWidth="1.5" transform="rotate(-30 12 12)" />
            <ellipse cx="12" cy="12" rx="7.5" ry="3" stroke="#EC4899" strokeWidth="1.5" transform="rotate(30 12 12)" />
            <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" />
          </svg>
        );

      case 'SYM':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#1E242E" />
            <rect x="5" y="5" width="5" height="5" rx="1" fill="#F59E0B" />
            <rect x="14" y="5" width="5" height="5" rx="1" fill="#F59E0B" />
            <rect x="5" y="14" width="5" height="5" rx="1" fill="#F59E0B" />
            <rect x="14" y="14" width="5" height="5" rx="1" fill="#10B981" />
          </svg>
        );

      case 'IREN':
        return (
          <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="#064E3B" />
            <circle cx="12" cy="12" r="6" stroke="#10B981" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx="12" cy="12" r="3" fill="#34D399" />
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

