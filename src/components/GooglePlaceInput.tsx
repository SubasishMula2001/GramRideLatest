/// <reference types="@types/google.maps" />
import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

declare global {
  interface Window {
    google: typeof google;
  }
}

interface GooglePlaceInputProps {
  type: 'pickup' | 'drop';
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

const GooglePlaceInput: React.FC<GooglePlaceInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { ready, error } = useGoogleMaps();
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    // Initialize Google Places Autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'in' }, // Restrict to India
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['geocode', 'establishment'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.formatted_address && place.geometry?.location) {
        onChange(
          place.formatted_address,
          place.geometry.location.lat(),
          place.geometry.location.lng()
        );
      }
    });
  }, [ready, onChange]);

  const handleUseGPS = async () => {
    if (!navigator.geolocation) {
      alert('GPS not supported on this device');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (ready && window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setGettingLocation(false);
              if (status === 'OK' && results?.[0]) {
                onChange(results[0].formatted_address, latitude, longitude);
              } else {
                onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude);
              }
            }
          );
        } else {
          setGettingLocation(false);
          onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude);
        }
      },
      (err) => {
        setGettingLocation(false);
        alert('Unable to get location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || (type === 'pickup' ? 'Search pickup location' : 'Search drop location')}
        className={`
          w-full pl-14 pr-24 py-4 rounded-xl border-2 bg-card text-foreground
          placeholder:text-muted-foreground transition-all duration-300
          focus:outline-none focus:ring-0
          ${type === 'pickup' 
            ? 'border-primary/20 focus:border-primary' 
            : 'border-secondary/20 focus:border-secondary'
          }
        `}
      />
      
      {type === 'pickup' && (
        <button 
          onClick={handleUseGPS}
          disabled={gettingLocation}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
        >
          {gettingLocation ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Getting...
            </>
          ) : (
            'Use GPS'
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
};

export default GooglePlaceInput;
