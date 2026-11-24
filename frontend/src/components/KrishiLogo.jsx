import React from "react";

export default function KrishiLogo({ size = 38, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill="none"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="krishiBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="krishiSproutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>
        <linearGradient id="krishiSunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="krishiGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#052e16" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Rounded Modern App Icon Background */}
      <rect width="48" height="48" rx="11" fill="url(#krishiBgGrad)" />

      {/* Subtle Digital / AI Trace Lines representing smart agriculture */}
      <path d="M 6 24 C 12 24, 14 32, 20 32" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" opacity="0.65" />
      <path d="M 42 24 C 36 24, 34 16, 28 16" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" opacity="0.65" />
      <circle cx="20" cy="32" r="1.5" fill="#86efac" opacity="0.8" />
      <circle cx="28" cy="16" r="1.5" fill="#86efac" opacity="0.8" />

      {/* Rising Sun (Dawn / Harvest) */}
      <circle cx="24" cy="16" r="5" fill="url(#krishiSunGrad)" opacity="0.95" />
      <path d="M24 8.5 V10" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M29.5 10 L28.4 11.1" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M18.5 10 L19.6 11.1" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" />

      {/* Fertile Soil Furrow Lines */}
      <path d="M 8 38 C 16 35, 32 35, 40 38" stroke="#14532d" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
      <path d="M 12 41 C 18 39, 30 39, 36 41" stroke="#14532d" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />

      {/* Sprouting Plant (Agriculture Growth) */}
      <path d="M24 37 C24 29 24 21 24 16" stroke="url(#krishiSproutGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#krishiGlow)" />
      
      {/* Left Leaf */}
      <path d="M24 28 C20 28 13 25 14 18 C20 18 23 23 24 28 Z" fill="url(#krishiSproutGrad)" filter="url(#krishiGlow)" />
      <path d="M17 22 C19.5 22.5 22 25 24 27" stroke="#16a34a" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />

      {/* Right Leaf */}
      <path d="M24 24 C27 24 34 22 34 15 C28 15 25 19 24 24 Z" fill="#bbf7d0" filter="url(#krishiGlow)" />
      <path d="M30 18.5 C28 19.5 26 21.5 24 23" stroke="#15803d" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />

      {/* Growth Core Node */}
      <circle cx="24" cy="16" r="1.4" fill="#ffffff" />
    </svg>
  );
}
