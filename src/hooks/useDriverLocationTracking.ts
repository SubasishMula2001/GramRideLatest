import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseDriverLocationTrackingOptions {
  driverId: string | null;
  isActive: boolean;
  updateIntervalMs?: number;
}

export const useDriverLocationTracking = ({
  driverId,
  isActive,
  updateIntervalMs = 10000 // Update every 10 seconds
}: UseDriverLocationTrackingOptions) => {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const updateDriverLocation = useCallback(async (lat: number, lng: number) => {
    if (!driverId) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          current_lat: lat,
          current_lng: lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) {
        console.error('Error updating driver location:', error);
      } else {
        console.log('Driver location updated:', { lat, lng });
        lastLocationRef.current = { lat, lng };
      }
    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  }, [driverId]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        lastLocationRef.current = { lat: latitude, lng: longitude };
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Please enable location access for ride tracking');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    // Send location updates at regular intervals
    intervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        updateDriverLocation(lastLocationRef.current.lat, lastLocationRef.current.lng);
      }
    }, updateIntervalMs);

    // Send initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateDriverLocation(latitude, longitude);
      },
      (error) => {
        console.error('Error getting initial position:', error);
      },
      { enableHighAccuracy: true }
    );
  }, [updateDriverLocation, updateIntervalMs]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    lastLocationRef.current = null;
  }, []);

  useEffect(() => {
    if (isActive && driverId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActive, driverId, startTracking, stopTracking]);

  return {
    lastLocation: lastLocationRef.current
  };
};
