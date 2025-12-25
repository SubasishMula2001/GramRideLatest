import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DriverLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

interface UseDriverLocationSubscriptionOptions {
  driverId: string | null;
  isActive: boolean;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Estimate time based on average speed (30 km/h for toto in local areas)
const estimateTime = (distanceKm: number): number => {
  const avgSpeedKmh = 30;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60); // minutes
};

export const useDriverLocationSubscription = ({
  driverId,
  isActive,
  pickupLat,
  pickupLng,
  dropLat,
  dropLng
}: UseDriverLocationSubscriptionOptions) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [distanceToDrop, setDistanceToDrop] = useState<number | null>(null);
  const [etaToPickup, setEtaToPickup] = useState<number | null>(null);
  const [etaToDrop, setEtaToDrop] = useState<number | null>(null);

  const updateDistances = useCallback((lat: number, lng: number) => {
    if (pickupLat && pickupLng) {
      const distPickup = calculateDistance(lat, lng, pickupLat, pickupLng);
      setDistanceToPickup(Math.round(distPickup * 10) / 10);
      setEtaToPickup(estimateTime(distPickup));
    }

    if (dropLat && dropLng) {
      const distDrop = calculateDistance(lat, lng, dropLat, dropLng);
      setDistanceToDrop(Math.round(distDrop * 10) / 10);
      setEtaToDrop(estimateTime(distDrop));
    }
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  // Fetch initial driver location
  useEffect(() => {
    if (!driverId || !isActive) return;

    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('current_lat, current_lng, updated_at')
        .eq('id', driverId)
        .single();

      if (!error && data && data.current_lat && data.current_lng) {
        setDriverLocation({
          lat: Number(data.current_lat),
          lng: Number(data.current_lng),
          updatedAt: data.updated_at || new Date().toISOString()
        });
        updateDistances(Number(data.current_lat), Number(data.current_lng));
      }
    };

    fetchInitialLocation();
  }, [driverId, isActive, updateDistances]);

  // Subscribe to real-time location updates
  useEffect(() => {
    if (!driverId || !isActive) return;

    console.log('Setting up driver location subscription for:', driverId);

    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driverId}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.current_lat && updated.current_lng) {
            const lat = Number(updated.current_lat);
            const lng = Number(updated.current_lng);
            
            console.log('Driver location update received:', { lat, lng });
            
            setDriverLocation({
              lat,
              lng,
              updatedAt: updated.updated_at || new Date().toISOString()
            });
            updateDistances(lat, lng);
          }
        }
      )
      .subscribe((status) => {
        console.log('Driver location subscription status:', status);
      });

    return () => {
      console.log('Cleaning up driver location subscription');
      supabase.removeChannel(channel);
    };
  }, [driverId, isActive, updateDistances]);

  return {
    driverLocation,
    distanceToPickup,
    distanceToDrop,
    etaToPickup,
    etaToDrop
  };
};
