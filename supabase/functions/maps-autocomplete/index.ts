import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      return new Response(
        JSON.stringify({ error: "Maps service not configured", predictions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { input, sessionToken } = await req.json();

    if (typeof input !== 'string' || input.trim().length < 2) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Sanitize input - remove special characters that could cause issues
    const sanitizedInput = input.replace(/[<>{}]/g, '').substring(0, 200);

    console.log(`Autocomplete request: "${sanitizedInput.substring(0, 30)}..."`);

    const params = new URLSearchParams({
      input: sanitizedInput,
      key: apiKey,
      components: 'country:in', // Restrict to India
      types: 'geocode|establishment',
    });

    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    );

    const data = await response.json();

    if (data.status === "OK" || data.status === "ZERO_RESULTS") {
      const predictions = (data.predictions || []).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text,
      }));

      return new Response(
        JSON.stringify({ predictions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      console.log("Autocomplete failed:", data.status);
      return new Response(
        JSON.stringify({ error: "Autocomplete failed", predictions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in maps-autocomplete:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
