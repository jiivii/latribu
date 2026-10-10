import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Primary Brand Mark from Image 2 & 3 ("LA TRIBU • SISTEMA VISUAL WEB"):
 * Rainbow arch (Verde salvia #9AA08A, Amarillo miel #F1BF70, Rosa empolvado #DFAEA1),
 * three community figures inside, toasted wood cradle (#C39D70) with two sage leaves,
 * and rounded "LA TRIBU" typography.
 */
export const LaTribuRainbowLogo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  showTagline = false,
  size = 'md',
}) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-44 h-44',
  }[size];

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 240 185"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={dimensions}
        aria-label="Logo La Tribu Arcoíris"
      >
        {/* Outer Arch - Verde Salvia #9AA08A */}
        <path
          d="M 34 128 C 26 62, 68 18, 120 18 C 172 18, 214 62, 206 128"
          stroke="#9AA08A"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Middle Arch - Amarillo Miel #F1BF70 */}
        <path
          d="M 55 124 C 49 74, 80 39, 120 39 C 160 39, 191 74, 185 124"
          stroke="#F1BF70"
          strokeWidth="15"
          strokeLinecap="round"
        />
        {/* Inner Arch - Rosa Empolvado #DFAEA1 */}
        <path
          d="M 76 120 C 72 84, 92 60, 120 60 C 148 60, 168 84, 164 120"
          stroke="#DFAEA1"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Three Stylized Figures Inside Arch */}
        {/* Left Figure - Verde Salvia #9AA08A */}
        <circle cx="95" cy="94" r="10.5" fill="#9AA08A" />
        <path
          d="M 79 140 C 79 116, 86 108, 95 108 C 104 108, 110 116, 110 142 Z"
          fill="#9AA08A"
        />

        {/* Right Figure - Rosa Empolvado #DFAEA1 */}
        <circle cx="145" cy="94" r="10.5" fill="#DFAEA1" />
        <path
          d="M 130 142 C 130 116, 136 108, 145 108 C 154 108, 161 116, 161 140 Z"
          fill="#DFAEA1"
        />

        {/* Center Child Figure - Amarillo Miel #F1BF70 */}
        <circle cx="120" cy="107" r="8.5" fill="#F1BF70" />
        <path
          d="M 108 145 C 108 125, 113 119, 120 119 C 127 119, 132 125, 132 145 Z"
          fill="#F1BF70"
        />

        {/* Left Leaf - Verde Salvia #9AA08A */}
        <path
          d="M 28 141 C 38 140, 52 150, 56 165 C 42 164, 30 154, 28 141 Z"
          fill="#9AA08A"
        />
        {/* Right Leaf - Verde Salvia #9AA08A */}
        <path
          d="M 212 141 C 202 140, 188 150, 184 165 C 198 164, 210 154, 212 141 Z"
          fill="#9AA08A"
        />

        {/* Toasted Wood Cradle Base - Madera Tostada #C39D70 */}
        <path
          d="M 48 134 C 55 129, 68 135, 84 142 C 104 149, 136 149, 156 142 C 172 135, 185 129, 192 134 C 197 138, 190 153, 182 164 C 175 172, 152 176, 120 176 C 88 176, 65 172, 58 164 C 50 153, 43 138, 48 134 Z"
          fill="#C39D70"
        />
        {/* Subtle Wood Grain Lines */}
        <path
          d="M 62 154 C 95 162, 145 162, 178 154"
          stroke="#B0895B"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M 70 165 C 102 170, 138 170, 170 165"
          stroke="#B0895B"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>

      {showText && (
        <span className="font-display font-extrabold tracking-wider text-[#9AA08A] text-2xl sm:text-3xl mt-1 leading-none">
          LA TRIBU
        </span>
      )}
      {showTagline && (
        <span className="font-subtitle font-semibold text-[#707A63] text-sm sm:text-base mt-1.5 text-center">
          Celebraciones que se quedan en la memoria
        </span>
      )}
    </div>
  );
};

/**
 * Emblem Mark from Image 1:
 * Cozy house outline in dark sage (#4E5846) with coral heart (#E48E7F),
 * curved smile below, and 5 joyful rays around the roof.
 */
export const LaTribuHouseLogo: React.FC<{ className?: string; showText?: boolean }> = ({
  className = 'w-16 h-16',
  showText = false,
}) => {
  return (
    <div className="inline-flex flex-col items-center select-none">
      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Emblema Casita La Tribu"
      >
        {/* 5 Rays */}
        {/* Ray 1 - Left Coral */}
        <line
          x1="34"
          y1="66"
          x2="58"
          y2="74"
          stroke="#E69A8C"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Ray 2 - Upper Left Sage */}
        <line
          x1="58"
          y1="32"
          x2="74"
          y2="52"
          stroke="#8A9984"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Ray 3 - Top Center Honey Yellow */}
        <line
          x1="100"
          y1="16"
          x2="100"
          y2="42"
          stroke="#F1BF70"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Ray 4 - Upper Right Soft Blue */}
        <line
          x1="142"
          y1="32"
          x2="126"
          y2="52"
          stroke="#8FAAC7"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Ray 5 - Right Soft Lavender */}
        <line
          x1="166"
          y1="66"
          x2="142"
          y2="74"
          stroke="#A894C2"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* House Roof & Walls - Dark Sage #4E5846 */}
        <path
          d="M 66 84 L 100 56 L 134 84"
          stroke="#4E5846"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="74"
          y1="79"
          x2="74"
          y2="120"
          stroke="#4E5846"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <line
          x1="126"
          y1="79"
          x2="126"
          y2="120"
          stroke="#4E5846"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Warm Coral Heart Inside House */}
        <path
          d="M 100 116 C 100 116, 84 103, 84 91 C 84 84, 90 80, 95 83 C 98 85, 100 88, 100 88 C 100 88, 102 85, 105 83 C 110 80, 116 84, 116 91 C 116 103, 100 116, 100 116 Z"
          fill="#E58F7E"
        />

        {/* Smile Curve Underneath */}
        <path
          d="M 62 128 C 80 146, 120 146, 138 128"
          stroke="#4E5846"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className="font-display font-extrabold text-[#4E5846] text-xl tracking-wide -mt-1">
          LA TRIBU
        </span>
      )}
    </div>
  );
};
