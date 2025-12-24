import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Loader2, Search } from 'lucide-react';
import { useMapsProxy } from '@/hooks/useMapsProxy';
import { useDebounce } from '@/hooks/useDebounce';

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
}

interface SecurePlaceInputProps {
  type: 'pickup' | 'drop';
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

const SecurePlaceInput: React.FC<SecurePlaceInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { geocodeCoordinates, getAutocomplete, getPlaceDetails } = useMapsProxy();
  const debouncedInput = useDebounce(inputValue, 300);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch autocomplete predictions
  useEffect(() => {
    const fetchPredictions = async () => {
      if (debouncedInput.length < 2) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);
      const results = await getAutocomplete(debouncedInput, sessionToken);
      setPredictions(results);
      setIsLoading(false);
      setShowDropdown(results.length > 0);
    };

    fetchPredictions();
  }, [debouncedInput, getAutocomplete, sessionToken]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPrediction = useCallback(async (prediction: PlacePrediction) => {
    setIsLoading(true);
    setShowDropdown(false);
    
    const details = await getPlaceDetails(prediction.placeId, sessionToken);
    
    if (details) {
      setInputValue(details.address);
      onChange(details.address, details.lat, details.lng);
    } else {
      setInputValue(prediction.description);
      onChange(prediction.description);
    }
    
    setIsLoading(false);
  }, [getPlaceDetails, onChange, sessionToken]);

  const handleUseGPS = async () => {
    if (!navigator.geolocation) {
      alert('GPS not supported on this device');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        const result = await geocodeCoordinates(latitude, longitude);
        setGettingLocation(false);
        
        if (result) {
          setInputValue(result.address);
          onChange(result.address, latitude, longitude);
        } else {
          const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setInputValue(coordString);
          onChange(coordString, latitude, longitude);
        }
      },
      (err) => {
        setGettingLocation(false);
        alert('Unable to get location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (newValue.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
    }
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
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
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

      {isLoading && !gettingLocation && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-auto"
        >
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-3 border-b border-border last:border-b-0"
            >
              <Search className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {prediction.mainText || prediction.description}
                </p>
                {prediction.secondaryText && (
                  <p className="text-xs text-muted-foreground truncate">
                    {prediction.secondaryText}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecurePlaceInput;
