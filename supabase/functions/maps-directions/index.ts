import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      return new Response(
        JSON.stringify({ error: "Maps service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { originLat, originLng, destLat, destLng } = await req.json();

    // Validate coordinates
    if (
      typeof originLat !== 'number' || typeof originLng !== 'number' ||
      typeof destLat !== 'number' || typeof destLng !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate coordinate ranges
    if (
      originLat < -90 || originLat > 90 || originLng < -180 || originLng > 180 ||
      destLat < -90 || destLat > 90 || destLng < -180 || destLng > 180
    ) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of range" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Directions request: (${originLat}, ${originLng}) -> (${destLat}, ${destLng})`);

    const params = new URLSearchParams({
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      key: apiKey,
      mode: 'driving',
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params}`
    );

    const data = await response.json();

    if (data.status === "OK" && data.routes?.[0]) {
      const route = data.routes[0];
      const leg = route.legs?.[0];

      return new Response(
        JSON.stringify({
          distance: leg?.distance?.value || 0, // meters
          distanceText: leg?.distance?.text || '',
          duration: leg?.duration?.value || 0, // seconds
          durationText: leg?.duration?.text || '',
          polyline: route.overview_polyline?.points || '',
          startAddress: leg?.start_address || '',
          endAddress: leg?.end_address || '',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      console.log("Directions failed:", data.status);
      return new Response(
        JSON.stringify({ error: "Unable to calculate route", status: data.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in maps-directions:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
