import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useMapsProxy } from '@/hooks/useMapsProxy';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, loading: authLoading } = useAuth();
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [authError, setAuthError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { geocodeCoordinates, getAutocomplete, getPlaceDetails } = useMapsProxy();
  const debouncedInput = useDebounce(inputValue, 300);

  // Update input when value prop changes (from parent)
  useEffect(() => {
    if (!isUserTyping) {
      setInputValue(value);
    }
  }, [value, isUserTyping]);

  // Fetch autocomplete predictions - only when user is typing and authenticated
  useEffect(() => {
    // Don't make API calls while auth is loading
    if (authLoading) {
      return;
    }

    if (!isUserTyping || debouncedInput.length < 2) {
      if (debouncedInput.length < 2) {
        setPredictions([]);
        setAuthError(false);
      }
      return;
    }

    // Check if user is authenticated
    if (!user) {
      setAuthError(true);
      setPredictions([]);
      setShowDropdown(true);
      return;
    }

    setAuthError(false);

    const fetchPredictions = async () => {
      setIsLoading(true);
      try {
        const results = await getAutocomplete(debouncedInput, sessionToken);
        setPredictions(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput, sessionToken, isUserTyping, user, authLoading]);

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
    setIsUserTyping(false);
    setPredictions([]);
    
    try {
      const details = await getPlaceDetails(prediction.placeId, sessionToken);
      
      if (details) {
        // Prefer the specific place name from the prediction (what user clicked)
        // Fall back to details.name, then details.address
        const displayName = prediction.mainText || details.name || details.address;
        
        // For the address passed to parent, use the name + city/state for context if available
        // This ensures both display and backend get meaningful location info
        let fullDisplayAddress = displayName;
        if (prediction.secondaryText && !displayName.includes(prediction.secondaryText.split(',')[0])) {
          fullDisplayAddress = `${displayName}, ${prediction.secondaryText}`;
        }
        
        setInputValue(fullDisplayAddress);
        onChange(fullDisplayAddress, details.lat, details.lng);
      } else {
        // Fallback to prediction description
        const displayName = prediction.mainText 
          ? `${prediction.mainText}${prediction.secondaryText ? `, ${prediction.secondaryText}` : ''}`
          : prediction.description;
        setInputValue(displayName);
        onChange(displayName);
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
      const displayName = prediction.mainText 
        ? `${prediction.mainText}${prediction.secondaryText ? `, ${prediction.secondaryText}` : ''}`
        : prediction.description;
      setInputValue(displayName);
      onChange(displayName);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange, sessionToken]);

  const handleUseGPS = async () => {
    if (!navigator.geolocation) {
      alert('GPS not supported on this device');
      return;
    }

    setGettingLocation(true);
    setIsUserTyping(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const result = await geocodeCoordinates(latitude, longitude);
          
          if (result) {
            setInputValue(result.address);
            onChange(result.address, latitude, longitude);
          } else {
            const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setInputValue(coordString);
            onChange(coordString, latitude, longitude);
          }
        } catch (error) {
          console.error('Geocoding failed:', error);
          const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setInputValue(coordString);
          onChange(coordString, latitude, longitude);
        } finally {
          setGettingLocation(false);
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
    setIsUserTyping(true);
    if (newValue.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      setIsUserTyping(false);
    }, 200);
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
        onFocus={() => {
          setIsUserTyping(true);
          if (predictions.length > 0) setShowDropdown(true);
        }}
        onBlur={handleInputBlur}
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

      {isLoading && !gettingLocation && type !== 'pickup' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Auth Error Message */}
      {showDropdown && authError && inputValue.length >= 2 && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-destructive/30 rounded-xl shadow-elevated z-[100] p-4 animate-fade-in"
        >
          <p className="text-sm text-destructive text-center">
            Please login to search locations
          </p>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && predictions.length > 0 && !authError && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-elevated z-[100] max-h-64 overflow-auto animate-fade-in"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              onClick={() => handleSelectPrediction(prediction)}
              onMouseDown={(e) => e.preventDefault()}
              className={`
                w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors 
                flex items-start gap-3 border-b border-border/50 last:border-b-0
                ${index === 0 ? 'rounded-t-xl' : ''}
                ${index === predictions.length - 1 ? 'rounded-b-xl' : ''}
              `}
            >
              <div className={`
                mt-0.5 p-1.5 rounded-full flex-shrink-0
                ${type === 'pickup' ? 'bg-primary/10' : 'bg-secondary/10'}
              `}>
                <MapPin className={`w-3 h-3 ${type === 'pickup' ? 'text-primary' : 'text-secondary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {prediction.mainText || prediction.description}
                </p>
                {prediction.secondaryText && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {prediction.secondaryText}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading state for autocomplete */}
      {isLoading && isUserTyping && inputValue.length >= 2 && !authError && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-elevated z-[100] p-4 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Finding locations...</span>
        </div>
      )}
    </div>
  );
};

export default SecurePlaceInput;
