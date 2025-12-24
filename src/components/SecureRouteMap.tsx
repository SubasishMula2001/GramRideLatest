import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, Navigation, ArrowRight } from 'lucide-react';
import { useMapsProxy } from '@/hooks/useMapsProxy';

interface SecureRouteMapProps {
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  onRouteCalculated?: (distance: number, duration: number) => void;
}

const SecureRouteMap: React.FC<SecureRouteMapProps> = ({
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  onRouteCalculated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceText: string;
    durationText: string;
    startAddress: string;
    endAddress: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { getDirections } = useMapsProxy();

  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
        setRouteInfo(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const result = await getDirections(pickupLat, pickupLng, dropLat, dropLng);

      if (result) {
        setRouteInfo({
          distanceText: result.distanceText,
          durationText: result.durationText,
          startAddress: result.startAddress,
          endAddress: result.endAddress,
        });
        
        // Convert meters to km and seconds to minutes
        const distanceKm = result.distance / 1000;
        const durationMins = Math.ceil(result.duration / 60);
        onRouteCalculated?.(distanceKm, durationMins);
      } else {
        setError('Could not calculate route');
      }

      setIsLoading(false);
    };

    calculateRoute();
  }, [pickupLat, pickupLng, dropLat, dropLng, getDirections, onRouteCalculated]);

  if (isLoading) {
    return (
      <div className="w-full bg-muted rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground">Calculating route...</span>
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
    <div className="w-full bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 shadow-lg border border-border">
      {/* Route Summary */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
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

      {/* Route Details */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
            <Navigation className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Pickup</p>
            <p className="text-sm font-medium text-foreground truncate">{routeInfo.startAddress}</p>
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
            <p className="text-sm font-medium text-foreground truncate">{routeInfo.endAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureRouteMap;
