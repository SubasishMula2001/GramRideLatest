/// <reference types="@types/google.maps" />
import React, { useRef, useEffect, useState } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google: typeof google;
  }
}

interface RouteMapProps {
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  onRouteCalculated?: (distance: number, duration: number) => void;
}

const RouteMap: React.FC<RouteMapProps> = ({
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  onRouteCalculated,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const { ready, error } = useGoogleMaps();
  const [routeError, setRouteError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;

    // Default center (West Bengal, India)
    const defaultCenter = { lat: 22.5726, lng: 88.3639 };

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#16a34a',
        strokeWeight: 5,
      },
    });
    directionsRendererRef.current.setMap(mapInstanceRef.current);
  }, [ready]);

  // Calculate and display route
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !directionsRendererRef.current) return;
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      // Clear existing route
      directionsRendererRef.current.setDirections({ routes: [] } as google.maps.DirectionsResult);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: pickupLat, lng: pickupLng },
        destination: { lat: dropLat, lng: dropLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setRouteError(null);
          directionsRendererRef.current?.setDirections(result);

          // Extract distance and duration
          const route = result.routes[0];
          if (route?.legs?.[0]) {
            const leg = route.legs[0];
            const distanceKm = (leg.distance?.value || 0) / 1000;
            const durationMins = Math.ceil((leg.duration?.value || 0) / 60);
            onRouteCalculated?.(distanceKm, durationMins);
          }
        } else {
          setRouteError('Could not calculate route');
        }
      }
    );
  }, [ready, pickupLat, pickupLng, dropLat, dropLng, onRouteCalculated]);

  if (error) {
    return (
      <div className="w-full h-64 bg-muted rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Map unavailable</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="w-full h-64 bg-muted rounded-xl flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-64 rounded-xl overflow-hidden shadow-lg" />
      {routeError && (
        <div className="absolute bottom-2 left-2 right-2 bg-destructive/90 text-destructive-foreground text-xs px-3 py-2 rounded-lg">
          {routeError}
        </div>
      )}
    </div>
  );
};

export default RouteMap;
