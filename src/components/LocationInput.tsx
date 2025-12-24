import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface LocationInputProps {
  type: 'pickup' | 'drop';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div className="relative">
      <div className={`
        absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full
        ${type === 'pickup' ? 'bg-primary/10' : 'bg-secondary/10'}
      `}>
        {type === 'pickup' ? (
          <Navigation className="w-4 h-4 text-primary" />
        ) : (
          <MapPin className="w-4 h-4 text-secondary" />
        )}
      </div>
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || (type === 'pickup' ? 'Pickup location' : 'Drop location')}
        className={`
          w-full pl-14 pr-4 py-4 rounded-xl border-2 bg-card text-foreground
          placeholder:text-muted-foreground transition-all duration-300
          focus:outline-none focus:ring-0
          ${type === 'pickup' 
            ? 'border-primary/20 focus:border-primary' 
            : 'border-secondary/20 focus:border-secondary'
          }
        `}
      />
      
      {type === 'pickup' && (
        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:underline">
          Use GPS
        </button>
      )}
    </div>
  );
};

export default LocationInput;
