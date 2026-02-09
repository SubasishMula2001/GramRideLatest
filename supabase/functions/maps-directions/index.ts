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

    const { originLat, originLng, destLat, destLng } = await req.json();

    if (
      typeof originLat !== 'number' || typeof originLng !== 'number' ||
      typeof destLat !== 'number' || typeof destLng !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (
      originLat < -90 || originLat > 90 || originLng < -180 || originLng > 180 ||
      destLat < -90 || destLat > 90 || destLng < -180 || destLng > 180
    ) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of range" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Directions request from user ${authResult.userId}: (${originLat}, ${originLng}) -> (${destLat}, ${destLng})`);

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

      const startAddress = cleanPlusCode(leg?.start_address || '');
      const endAddress = cleanPlusCode(leg?.end_address || '');

      return new Response(
        JSON.stringify({
          distance: leg?.distance?.value || 0,
          distanceText: leg?.distance?.text || '',
          duration: leg?.duration?.value || 0,
          durationText: leg?.duration?.text || '',
          polyline: route.overview_polyline?.points || '',
          startAddress,
          endAddress,
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
