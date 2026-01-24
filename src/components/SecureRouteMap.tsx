import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, MapPin, Navigation, ArrowRight, Map } from 'lucide-react';
import { useMapsProxy } from '@/hooks/useMapsProxy';

// Helper to clean Plus Codes from addresses (e.g., "5MP3+XP5, Location" -> "Location")
const cleanPlusCode = (address: string): string => {
  return address
    .replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,4},?\s*/i, '')
    .replace(/,?\s*[A-Z0-9]{4}\+[A-Z0-9]{2,4}\s*,?/gi, ',')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
};

interface SecureRouteMapProps {
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  driverLat?: number;
  driverLng?: number;
  showMap?: boolean;
  onRouteCalculated?: (distance: number, duration: number) => void;
}

const SecureRouteMap: React.FC<SecureRouteMapProps> = ({
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  driverLat,
  driverLng,
  showMap = true,
  onRouteCalculated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distanceText: string;
    durationText: string;
    startAddress: string;
    endAddress: string;
    polyline: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { getDirections, getStaticMap } = useMapsProxy();
  
  // Use refs to track previous coordinates and prevent duplicate calls
  const lastCoordsRef = useRef<string>('');
  const onRouteCalculatedRef = useRef(onRouteCalculated);
  const isCalculatingRef = useRef(false);
  
  // Update the ref when callback changes
  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  }, [onRouteCalculated]);

  const calculateRoute = useCallback(async () => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      setRouteInfo(null);
      setMapUrl(null);
      return;
    }

    // Create a unique key for current coordinates including driver position
    const coordsKey = `${pickupLat},${pickupLng},${dropLat},${dropLng},${driverLat || ''},${driverLng || ''}`;
    
    // Skip if already calculated for these coordinates or currently calculating
    if (coordsKey === lastCoordsRef.current || isCalculatingRef.current) {
      return;
    }
    
    isCalculatingRef.current = true;
    lastCoordsRef.current = coordsKey;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getDirections(pickupLat, pickupLng, dropLat, dropLng);

      if (result) {
        setRouteInfo({
          distanceText: result.distanceText,
          durationText: result.durationText,
          startAddress: result.startAddress,
          endAddress: result.endAddress,
          polyline: result.polyline,
        });
        
        // Convert meters to km and seconds to minutes
        const distanceKm = result.distance / 1000;
        const durationMins = Math.ceil(result.duration / 60);
        onRouteCalculatedRef.current?.(distanceKm, durationMins);

        // Fetch static map if showMap is enabled
        if (showMap) {
          const mapImageUrl = await getStaticMap(
            pickupLat, 
            pickupLng, 
            dropLat, 
            dropLng, 
            result.polyline,
            600,
            300
          );
          setMapUrl(mapImageUrl);
        }
      } else {
        setError('Could not calculate route');
        lastCoordsRef.current = ''; // Reset so user can retry
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setError('Could not calculate route');
      lastCoordsRef.current = ''; // Reset so user can retry
    } finally {
      setIsLoading(false);
      isCalculatingRef.current = false;
    }
  }, [pickupLat, pickupLng, dropLat, dropLng, driverLat, driverLng, getDirections, getStaticMap, showMap]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  if (isLoading) {
    return (
      <div className="w-full bg-muted rounded-xl p-6 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-muted-foreground text-sm">Calculating route...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-destructive/10 rounded-xl p-4 text-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!routeInfo) {
    return (
      <div className="w-full bg-muted rounded-xl p-6 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Enter pickup and drop locations to see route</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl overflow-hidden shadow-lg border border-border">
      {/* Map Image */}
      {showMap && mapUrl && (
        <div className="relative w-full h-48 bg-muted">
          <img 
            src={mapUrl} 
            alt="Route map" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
          
          {/* Map overlay info */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                {routeInfo.distanceText}
              </div>
              <div className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                {routeInfo.durationText}
              </div>
            </div>
            <div className="bg-background/90 backdrop-blur p-1.5 rounded-full">
              <Map className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Route Summary - show larger stats when no map */}
      {(!showMap || !mapUrl) && (
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{routeInfo.distanceText}</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">{routeInfo.durationText}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
          </div>
        </div>
      )}

      {/* Route Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
            <Navigation className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Pickup</p>
            <p className="text-sm font-medium text-foreground truncate">{cleanPlusCode(routeInfo.startAddress)}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-secondary/10 flex-shrink-0">
            <MapPin className="w-4 h-4 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Drop-off</p>
            <p className="text-sm font-medium text-foreground truncate">{cleanPlusCode(routeInfo.endAddress)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureRouteMap;
