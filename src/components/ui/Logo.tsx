import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function Logo({ className = '', iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Beacon / Rescue Lifebuoy with an upward momentum curve */}
      <svg
        width="34"
        height="34"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-amber-500 shrink-0"
      >
        {/* Beacon dash outline */}
        <circle 
          cx="16" 
          cy="16" 
          r="13" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeDasharray="4 2" 
          className="opacity-40" 
        />
        {/* Core lifebuoy */}
        <circle 
          cx="16" 
          cy="16" 
          r="8" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          className="opacity-90"
        />
        {/* Shines / Beacons lines */}
        <line x1="16" y1="2" x2="16" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="27" x2="16" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Core signal dot */}
        <circle cx="16" cy="16" r="3.5" fill="currentColor" />
        {/* Upward momentum arc */}
        <path
          d="M5 13C8.5 7.5 23.5 7.5 27 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {!iconOnly && (
        <span className="font-sans font-bold text-xl tracking-[0.2em] text-neutral-50 hover:text-amber-400 transition-colors duration-200">
          SAUVEUR
        </span>
      )}
    </div>
  );
}
