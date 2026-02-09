import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getApiKey } from "../_shared/getApiKey.ts";

function cleanPlusCode(address: string): string {
  return address
    .replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,4},?\s*/i, '')
    .replace(/,?\s*[A-Z0-9]{4}\+[A-Z0-9]{2,4}\s*,?/gi, ',')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
}

async function verifyAuth(req: Request, corsHeaders: Record<string, string>): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  
  if (error || !data?.claims?.sub) {
    console.error("Auth verification failed:", error?.message || "No claims found");
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return { userId: data.claims.sub as string };
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const authResult = await verifyAuth(req, corsHeaders);
  if (authResult instanceof Response) return authResult;

  try {
    const apiKey = await getApiKey("google_maps_api_key");
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

    if (!/^[a-zA-Z0-9_-]+$/.test(placeId)) {
      return new Response(
        JSON.stringify({ error: "Invalid place ID format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Place details request from user ${authResult.userId}: ${placeId}`);

    const params = new URLSearchParams({
      place_id: placeId,
      key: apiKey,
      fields: 'formatted_address,geometry,name',
    });

    if (sessionToken) params.append('sessiontoken', sessionToken);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );

    const data = await response.json();

    if (data.status === "OK" && data.result) {
      const result = data.result;
      const cleanedAddress = cleanPlusCode(result.formatted_address || '');
      
      return new Response(
        JSON.stringify({
          address: cleanedAddress,
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
