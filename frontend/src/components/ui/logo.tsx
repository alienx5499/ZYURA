import React from "react";

type LogoProps = {
  className?: string
  size?: number
  title?: string
}

const Logo: React.FC<LogoProps> = ({ className, size = 28, title = "EscrowZero" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 128 128" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block' }}
    aria-label={title}
  >
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#f3f4f6"/>
        <stop offset="0.5" stopColor="#d1d5db"/>
        <stop offset="1" stopColor="#9ca3af"/>
      </linearGradient>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    {/* Badge */}
    <rect x="8" y="8" width="112" height="112" rx="24" fill="#0b0b0c"/>
    <rect x="10" y="10" width="108" height="108" rx="22" fill="#0f1115" stroke="url(#metal)" strokeOpacity="0.25"/>

    {/* EZ Monogram */}
    {/* E */}
    <path d="M36 42h32M36 64h24M36 86h32" stroke="url(#metal)" strokeWidth="8" strokeLinecap="round" filter="url(#softGlow)"/>
    <path d="M36 42v44" stroke="url(#metal)" strokeWidth="8" strokeLinecap="round" filter="url(#softGlow)"/>

    {/* Z */}
    <path d="M68 42h24l-24 44h24" stroke="url(#metal)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" filter="url(#softGlow)"/>

    {/* Inner highlight */}
    <path d="M38 46h28M38 64h20M38 82h28M70 46h20l-22 40h20" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export { Logo }


