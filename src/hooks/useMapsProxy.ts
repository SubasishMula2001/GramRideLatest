import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GeocodingResult {
  address: string;
  placeId?: string;
}

interface AutocompleteResult {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
}

interface PlaceDetailsResult {
  address: string;
  name?: string;
  lat: number;
  lng: number;
}

interface DirectionsResult {
  distance: number; // meters
  distanceText: string;
  duration: number; // seconds
  durationText: string;
  polyline: string;
  startAddress: string;
  endAddress: string;
}

export const useMapsProxy = () => {
  const geocodeCoordinates = useCallback(async (lat: number, lng: number): Promise<GeocodingResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('maps-geocode', {
        body: { lat, lng }
      });

      if (error) {
        console.error('Geocoding error:', error);
        return null;
      }

      return data as GeocodingResult;
    } catch (err) {
      console.error('Geocoding failed:', err);
      return null;
    }
  }, []);

  const getAutocomplete = useCallback(async (input: string, sessionToken?: string): Promise<AutocompleteResult[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('maps-autocomplete', {
        body: { input, sessionToken }
      });

      if (error) {
        console.error('Autocomplete error:', error);
        return [];
      }

      return data?.predictions || [];
    } catch (err) {
      console.error('Autocomplete failed:', err);
      return [];
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string, sessionToken?: string): Promise<PlaceDetailsResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('maps-place-details', {
        body: { placeId, sessionToken }
      });

      if (error) {
        console.error('Place details error:', error);
        return null;
      }

      return data as PlaceDetailsResult;
    } catch (err) {
      console.error('Place details failed:', err);
      return null;
    }
  }, []);

  const getDirections = useCallback(async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<DirectionsResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('maps-directions', {
        body: { originLat, originLng, destLat, destLng }
      });

      if (error) {
        console.error('Directions error:', error);
        return null;
      }

      return data as DirectionsResult;
    } catch (err) {
      console.error('Directions failed:', err);
      return null;
    }
  }, []);

  return {
    geocodeCoordinates,
    getAutocomplete,
    getPlaceDetails,
    getDirections,
  };
};
