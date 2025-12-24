import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BookingTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  variant: 'passenger' | 'goods';
}

const BookingTypeCard: React.FC<BookingTypeCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  variant,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full p-6 rounded-2xl border-2 transition-all duration-300
        bg-gradient-card shadow-card hover:shadow-elevated
        ${variant === 'passenger' 
          ? 'border-primary/20 hover:border-primary' 
          : 'border-secondary/20 hover:border-secondary'
        }
        hover:scale-[1.02] active:scale-[0.98]
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`
          p-4 rounded-xl transition-all duration-300 group-hover:scale-110
          ${variant === 'passenger' 
            ? 'bg-gradient-primary shadow-soft' 
            : 'bg-gradient-secondary shadow-soft'
          }
        `}>
          <Icon className="w-8 h-8 text-primary-foreground" />
        </div>
        
        <div className="flex-1 text-left">
          <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
          ${variant === 'passenger' 
            ? 'bg-primary/10 group-hover:bg-primary' 
            : 'bg-secondary/10 group-hover:bg-secondary'
          }
        `}>
          <svg 
            className={`w-5 h-5 transition-all duration-300 
              ${variant === 'passenger' 
                ? 'text-primary group-hover:text-primary-foreground' 
                : 'text-secondary group-hover:text-secondary-foreground'
              }
              group-hover:translate-x-0.5
            `}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default BookingTypeCard;
