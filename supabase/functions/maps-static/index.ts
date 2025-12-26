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

    const { originLat, originLng, destLat, destLng, polyline, width = 400, height = 200 } = await req.json();

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

    console.log(`Static map request: (${originLat}, ${originLng}) -> (${destLat}, ${destLng})`);

    // Build the static map URL
    const params = new URLSearchParams({
      size: `${width}x${height}`,
      maptype: 'roadmap',
      key: apiKey,
      scale: '2', // High DPI
      format: 'png',
    });

    // Add markers for origin and destination
    const markers = [
      `color:green|label:A|${originLat},${originLng}`,
      `color:red|label:B|${destLat},${destLng}`,
    ];

    let url = `https://maps.googleapis.com/maps/api/staticmap?${params}`;
    
    // Add markers
    markers.forEach(marker => {
      url += `&markers=${encodeURIComponent(marker)}`;
    });

    // Add polyline path if available
    if (polyline) {
      url += `&path=enc:${encodeURIComponent(polyline)}&path=weight:4|color:0x4CAF50`;
    }

    // Fetch the image
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Static map API error:", response.status);
      return new Response(
        JSON.stringify({ error: "Could not generate map" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Return the map URL instead of the image for simplicity
    return new Response(
      JSON.stringify({ mapUrl: url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in maps-static:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
