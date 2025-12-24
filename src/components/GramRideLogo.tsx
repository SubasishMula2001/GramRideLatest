import React from 'react';

interface GramRideLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 32, text: 'text-lg' },
  md: { icon: 44, text: 'text-xl' },
  lg: { icon: 56, text: 'text-2xl' },
  xl: { icon: 72, text: 'text-3xl' },
};

const GramRideLogo: React.FC<GramRideLogoProps> = ({ 
  size = 'md', 
  showText = true,
  className = '' 
}) => {
  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          className="fill-primary"
        />
        
        {/* G letter forming the base - starts and R continues from it */}
        <path
          d="M30 50C30 38.954 38.954 30 50 30C58.5 30 65.5 34.5 69 41L61 46C59 42 55 39 50 39C44.477 39 40 44.477 40 50C40 55.523 44.477 61 50 61C54 61 57.5 59 59.5 56H50V48H70V52C70 63.046 61.046 72 50 72C38.954 72 30 63.046 30 50Z"
          className="fill-primary-foreground"
        />
        
        {/* R letter integrated - sharing the vertical stem with G's right side */}
        <path
          d="M55 48H62C67 48 71 52 71 57C71 60.5 69 63.5 66 65L73 75H63L57 66V75H50V56H55V48Z"
          className="fill-secondary"
        />
        
        {/* Small accent dot */}
        <circle
          cx="76"
          cy="32"
          r="6"
          className="fill-secondary"
        />
      </svg>
      
      {showText && (
        <span className={`font-bold ${text} text-foreground`}>
          <span className="text-gradient-primary">Gram</span>
          <span className="text-secondary">Ride</span>
        </span>
      )}
    </div>
  );
};

export default GramRideLogo;
