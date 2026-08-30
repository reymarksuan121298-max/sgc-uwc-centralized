import React from 'react';

export default function AgentMascotAvatar({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showStatus = true,
  className = ''
}) {
  const sizeMap = {
    sm: { box: 'w-7 h-7', dot: 'w-2 h-2', stroke: 1.5 },
    md: { box: 'w-10 h-10', dot: 'w-2.5 h-2.5', stroke: 2 },
    lg: { box: 'w-12 h-12', dot: 'w-3 h-3', stroke: 2 },
    xl: { box: 'w-16 h-16', dot: 'w-3.5 h-3.5', stroke: 2.5 }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div className={`relative ${currentSize.box} rounded-full bg-[#001D47] border-2 border-[#FFD700] p-0.5 shadow-md flex items-center justify-center overflow-hidden`}>
        {/* Agent Maria SVG Illustration */}
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background circle */}
          <circle cx="50" cy="50" r="48" fill="#002B66" />
          
          {/* Hair back */}
          <path d="M28 45 C24 60 22 75 28 85 C32 88 38 88 40 85 C34 70 34 55 36 45 Z" fill="#4A2E18" />
          <path d="M72 45 C76 60 78 75 72 85 C68 88 62 88 60 85 C66 70 66 55 64 45 Z" fill="#4A2E18" />
          
          {/* Neck & Shoulders */}
          <rect x="42" y="66" width="16" height="12" rx="4" fill="#FAD0B1" />
          
          {/* Navy Uniform Jacket */}
          <path d="M20 98 C20 80 32 72 50 72 C68 72 80 80 80 98 Z" fill="#001D47" />
          {/* White Collar / Shirt */}
          <path d="M42 72 L50 84 L58 72 L50 70 Z" fill="#FFFFFF" />
          {/* Blue Tie */}
          <path d="M48 76 L52 76 L53 88 L50 92 L47 88 Z" fill="#0077D4" />
          {/* Gold Collar Trim */}
          <path d="M36 76 L44 72 L46 76 L40 84 Z" fill="#FFD700" />
          <path d="M64 76 L56 72 L54 76 L60 84 Z" fill="#FFD700" />

          {/* Face */}
          <path d="M32 40 C32 26 68 26 68 40 C68 56 60 68 50 68 C40 68 32 56 32 40 Z" fill="#FAD0B1" />
          
          {/* Hair Front Bangs */}
          <path d="M30 38 C34 26 66 26 70 38 C65 30 55 32 50 35 C44 32 35 30 30 38 Z" fill="#5C3A21" />
          <path d="M31 38 C32 48 34 54 36 58 C34 50 33 42 32 38 Z" fill="#5C3A21" />
          <path d="M69 38 C68 48 66 54 64 58 C66 50 67 42 68 38 Z" fill="#5C3A21" />

          {/* Headband / Hairband */}
          <path d="M31 34 C36 22 64 22 69 34" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />

          {/* Eyes */}
          <ellipse cx="43" cy="46" rx="2.5" ry="3.5" fill="#2C3E50" />
          <ellipse cx="57" cy="46" rx="2.5" ry="3.5" fill="#2C3E50" />
          <circle cx="44" cy="45" r="1" fill="#FFFFFF" />
          <circle cx="58" cy="45" r="1" fill="#FFFFFF" />

          {/* Eyebrows */}
          <path d="M40 40 C42 38 46 39 47 41" stroke="#3E2714" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M60 40 C58 38 54 39 53 41" stroke="#3E2714" strokeWidth="1.2" strokeLinecap="round" />

          {/* Cheeks Blush */}
          <circle cx="39" cy="52" r="3" fill="#FF8A8A" opacity="0.4" />
          <circle cx="61" cy="52" r="3" fill="#FF8A8A" opacity="0.4" />

          {/* Smile */}
          <path d="M46 56 C48 59 52 59 54 56" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />

          {/* Headset & Mic */}
          <path d="M30 40 C28 40 27 44 27 48 C27 52 29 54 31 54 L32 40 Z" fill="#7F8C8D" />
          <path d="M28 50 C28 60 36 64 43 62" stroke="#BDC3C7" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="44" cy="62" r="2.2" fill="#2C3E50" />
        </svg>
      </div>

      {/* Online Status Indicator */}
      {showStatus && (
        <span className={`absolute bottom-0 right-0 ${currentSize.dot} rounded-full bg-[#00E676] ring-2 ring-[#001D47] shadow-xs`} />
      )}
    </div>
  );
}
