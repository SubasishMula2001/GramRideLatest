import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getApiKey } from "../_shared/getApiKey.ts";

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

    const { originLat, originLng, destLat, destLng, polyline, width = 400, height = 200 } = await req.json();

    if (
      typeof originLat !== 'number' || typeof originLng !== 'number' ||
      typeof destLat !== 'number' || typeof destLng !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Static map request from user ${authResult.userId}: (${originLat}, ${originLng}) -> (${destLat}, ${destLng})`);

    const params = new URLSearchParams({
      size: `${width}x${height}`,
      maptype: 'roadmap',
      key: apiKey,
      scale: '2',
      format: 'png',
    });

    const markers = [
      `color:green|label:A|${originLat},${originLng}`,
      `color:red|label:B|${destLat},${destLng}`,
    ];

    let url = `https://maps.googleapis.com/maps/api/staticmap?${params}`;
    
    markers.forEach(marker => {
      url += `&markers=${encodeURIComponent(marker)}`;
    });

    if (polyline) {
      url += `&path=enc:${encodeURIComponent(polyline)}&path=weight:4|color:0x4CAF50`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Static map API error:", response.status);
      return new Response(
        JSON.stringify({ error: "Could not generate map" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

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
