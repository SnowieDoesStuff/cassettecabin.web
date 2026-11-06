import React from 'react';

interface CassetteSvgProps {
  title?: string;
  artist?: string;
  isPlaying?: boolean;
  className?: string;
  tapeColor?: string;
}

export const CassetteSvg: React.FC<CassetteSvgProps> = ({
  title = 'Mixtape Side A',
  artist = 'Cassette Cabin',
  isPlaying = false,
  className = 'w-full max-w-md h-auto',
  tapeColor = '#E8DFD0',
}) => {
  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 420 270"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-xl"
      >
        {/* Outer Tape Body */}
        <rect
          x="10"
          y="10"
          width="400"
          height="250"
          rx="18"
          fill={tapeColor}
          stroke="#4A3B32"
          strokeWidth="6"
        />

        {/* Screw details */}
        <circle cx="28" cy="28" r="4.5" fill="#C4B5A5" stroke="#4A3B32" strokeWidth="2" />
        <line x1="25" y1="28" x2="31" y2="28" stroke="#4A3B32" strokeWidth="2" />
        <circle cx="392" cy="28" r="4.5" fill="#C4B5A5" stroke="#4A3B32" strokeWidth="2" />
        <line x1="389" y1="28" x2="395" y2="28" stroke="#4A3B32" strokeWidth="2" />
        <circle cx="28" cy="242" r="4.5" fill="#C4B5A5" stroke="#4A3B32" strokeWidth="2" />
        <line x1="25" y1="242" x2="31" y2="242" stroke="#4A3B32" strokeWidth="2" />
        <circle cx="392" cy="242" r="4.5" fill="#C4B5A5" stroke="#4A3B32" strokeWidth="2" />
        <line x1="389" y1="242" x2="395" y2="242" stroke="#4A3B32" strokeWidth="2" />

        {/* Center Sticker / Label */}
        <rect
          x="42"
          y="35"
          width="336"
          height="195"
          rx="12"
          fill="#FFFDF9"
          stroke="#5C4033"
          strokeWidth="3.5"
        />

        {/* Decorative Tape Brand Strip */}
        <path
          d="M 42 70 L 378 70 L 378 88 L 42 88 Z"
          fill="#B5734C"
          opacity="0.85"
        />
        <path
          d="M 42 88 L 378 88 L 378 94 L 42 94 Z"
          fill="#D9822B"
          opacity="0.85"
        />

        {/* Handwritten Song Title & Artist Header */}
        <text
          x="60"
          y="60"
          fill="#3E2723"
          fontSize="15"
          fontWeight="bold"
          fontFamily="Comic Sans MS, Comic Neue, cursive"
        >
          {title.length > 28 ? title.slice(0, 26) + '...' : title}
        </text>
        <text
          x="360"
          y="60"
          textAnchor="end"
          fill="#6D4C41"
          fontSize="12"
          fontWeight="bold"
          fontFamily="Comic Sans MS, Comic Neue, cursive"
        >
          {artist.length > 18 ? artist.slice(0, 16) + '...' : artist}
        </text>

        {/* Tape Window Cutout */}
        <rect
          x="95"
          y="108"
          width="230"
          height="95"
          rx="10"
          fill="#2C221E"
          stroke="#4A3B32"
          strokeWidth="4"
        />

        {/* Clear Window Inner Panel */}
        <rect
          x="105"
          y="118"
          width="210"
          height="75"
          rx="6"
          fill="#3B2F2A"
          stroke="#1F1612"
          strokeWidth="2"
        />

        {/* Tape level ruler markers */}
        <line x1="190" y1="124" x2="190" y2="134" stroke="#8D6E63" strokeWidth="1.5" />
        <line x1="200" y1="124" x2="200" y2="138" stroke="#8D6E63" strokeWidth="2" />
        <line x1="210" y1="124" x2="210" y2="138" stroke="#D7CCC8" strokeWidth="2" />
        <line x1="220" y1="124" x2="220" y2="138" stroke="#8D6E63" strokeWidth="2" />
        <line x1="230" y1="124" x2="230" y2="134" stroke="#8D6E63" strokeWidth="1.5" />

        {/* Left Tape Reel (Spool) */}
        <g
          className={isPlaying ? 'animate-spin-tape origin-[150px_155px]' : ''}
          style={{ transformOrigin: '150px 155px' }}
        >
          {/* Spool outer tape pack */}
          <circle cx="150" cy="155" r="30" fill="#4E342E" stroke="#6D4C41" strokeWidth="2" />
          {/* Spool plastic wheel */}
          <circle cx="150" cy="155" r="20" fill="#ECEFF1" stroke="#37474F" strokeWidth="2.5" />
          <circle cx="150" cy="155" r="9" fill="#2C221E" />
          {/* Spool teeth */}
          <line x1="150" y1="137" x2="150" y2="145" stroke="#37474F" strokeWidth="3" />
          <line x1="150" y1="165" x2="150" y2="173" stroke="#37474F" strokeWidth="3" />
          <line x1="132" y1="155" x2="140" y2="155" stroke="#37474F" strokeWidth="3" />
          <line x1="160" y1="155" x2="168" y2="155" stroke="#37474F" strokeWidth="3" />
          <line x1="137" y1="142" x2="143" y2="148" stroke="#37474F" strokeWidth="3" />
          <line x1="157" y1="162" x2="163" y2="168" stroke="#37474F" strokeWidth="3" />
        </g>

        {/* Right Tape Reel (Spool) */}
        <g
          className={isPlaying ? 'animate-spin-tape origin-[270px_155px]' : ''}
          style={{ transformOrigin: '270px 155px' }}
        >
          {/* Spool outer tape pack */}
          <circle cx="270" cy="155" r="24" fill="#4E342E" stroke="#6D4C41" strokeWidth="2" />
          {/* Spool plastic wheel */}
          <circle cx="270" cy="155" r="20" fill="#ECEFF1" stroke="#37474F" strokeWidth="2.5" />
          <circle cx="270" cy="155" r="9" fill="#2C221E" />
          {/* Spool teeth */}
          <line x1="270" y1="137" x2="270" y2="145" stroke="#37474F" strokeWidth="3" />
          <line x1="270" y1="165" x2="270" y2="173" stroke="#37474F" strokeWidth="3" />
          <line x1="252" y1="155" x2="260" y2="155" stroke="#37474F" strokeWidth="3" />
          <line x1="280" y1="155" x2="288" y2="155" stroke="#37474F" strokeWidth="3" />
          <line x1="257" y1="142" x2="263" y2="148" stroke="#37474F" strokeWidth="3" />
          <line x1="277" y1="162" x2="283" y2="168" stroke="#37474F" strokeWidth="3" />
        </g>

        {/* Magnetic Tape Bridge */}
        <path
          d="M 150 185 L 270 185"
          stroke="#4E342E"
          strokeWidth="6"
        />

        {/* Lower Trapezoid Faceplate for Heads */}
        <polygon
          points="70,230 110,256 310,256 350,230"
          fill="#3E2723"
          stroke="#271915"
          strokeWidth="3"
        />
        <circle cx="150" cy="245" r="6" fill="#8D6E63" />
        <circle cx="270" cy="245" r="6" fill="#8D6E63" />
        <circle cx="210" cy="245" r="4.5" fill="#D7CCC8" />

        {/* Side A / 60 Min stamp */}
        <text
          x="65"
          y="155"
          fill="#B5734C"
          fontSize="24"
          fontWeight="bold"
          fontFamily="Comic Sans MS, Comic Neue, cursive"
        >
          A
        </text>
        <text
          x="65"
          y="172"
          fill="#8D6E63"
          fontSize="10"
          fontFamily="Comic Sans MS, Comic Neue, cursive"
        >
          60 MIN
        </text>
      </svg>
    </div>
  );
};
