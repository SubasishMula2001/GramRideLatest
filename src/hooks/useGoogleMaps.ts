import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export const useGoogleMaps = () => {
  const [ready, setReady] = useState(isLoaded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) {
      setReady(true);
      return;
    }

    if (isLoading && loadPromise) {
      loadPromise.then(() => setReady(true)).catch(err => setError(err.message));
      return;
    }

    isLoading = true;
    loadPromise = (async () => {
      try {
        // Check if user is authenticated before fetching API key
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Authentication required to load maps');
        }

        // Fetch API key from edge function (requires authentication)
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        
        if (error || !data?.apiKey) {
          console.error('Failed to load Google Maps API key:', error);
          throw new Error('Failed to load Google Maps API key');
        }

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Maps'));
          document.head.appendChild(script);
        });

        isLoaded = true;
        setReady(true);
      } catch (err: any) {
        console.error('Google Maps loading error:', err);
        setError(err.message);
        throw err;
      } finally {
        isLoading = false;
      }
    })();

    loadPromise.catch(err => setError(err.message));
  }, []);

  return { ready, error };
};
