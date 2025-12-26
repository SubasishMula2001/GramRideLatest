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

    const { placeId, sessionToken } = await req.json();

    if (typeof placeId !== 'string' || !placeId.trim()) {
      return new Response(
        JSON.stringify({ error: "Invalid place ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate place ID format (basic check)
    if (!/^[a-zA-Z0-9_-]+$/.test(placeId)) {
      return new Response(
        JSON.stringify({ error: "Invalid place ID format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Place details request: ${placeId}`);

    const params = new URLSearchParams({
      place_id: placeId,
      key: apiKey,
      fields: 'formatted_address,geometry,name',
    });

    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );

    const data = await response.json();

    if (data.status === "OK" && data.result) {
      const result = data.result;
      return new Response(
        JSON.stringify({
          address: result.formatted_address,
          name: result.name,
          lat: result.geometry?.location?.lat,
          lng: result.geometry?.location?.lng,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      console.log("Place details failed:", data.status);
      return new Response(
        JSON.stringify({ error: "Unable to get place details" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in maps-place-details:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
