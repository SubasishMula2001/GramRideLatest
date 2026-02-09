import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getApiKey } from "../_shared/getApiKey.ts";

function containsPlusCode(address: string): boolean {
  return /^[A-Z0-9]{4}\+[A-Z0-9]{2,3}/.test(address);
}

function findBestAddress(results: any[]): { address: string; placeId: string } | null {
  if (!results || results.length === 0) return null;

  const priorityTypes = [
    'street_address', 'premise', 'subpremise', 'establishment',
    'point_of_interest', 'neighborhood', 'sublocality_level_2',
    'sublocality_level_1', 'sublocality', 'locality',
    'administrative_area_level_3', 'administrative_area_level_2',
  ];

  for (const priorityType of priorityTypes) {
    const result = results.find((r: any) => 
      r.types?.includes(priorityType) && !containsPlusCode(r.formatted_address)
    );
    if (result) return { address: result.formatted_address, placeId: result.place_id };
  }

  const noPlusCodeResult = results.find((r: any) => !containsPlusCode(r.formatted_address));
  if (noPlusCodeResult) return { address: noPlusCodeResult.formatted_address, placeId: noPlusCodeResult.place_id };

  const firstResult = results[0];
  return { address: cleanPlusCode(firstResult.formatted_address), placeId: firstResult.place_id };
}

function cleanPlusCode(address: string): string {
  let cleaned = address.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3},?\s*/i, '');
  cleaned = cleaned.replace(/,?\s*[A-Z0-9]{4}\+[A-Z0-9]{2,3}\s*,?/gi, ',').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');
  return cleaned.trim();
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

    const { lat, lng } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of range" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Geocoding request from user ${authResult.userId}: ${lat}, ${lng}`);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`
    );

    const data = await response.json();

    if (data.status === "OK" && data.results?.length > 0) {
      const best = findBestAddress(data.results);
      if (best) {
        console.log(`Geocoding result: ${best.address.substring(0, 50)}...`);
        return new Response(
          JSON.stringify(best),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }
    
    console.log("Geocoding failed:", data.status);
    return new Response(
      JSON.stringify({ error: "Unable to geocode location", status: data.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in maps-geocode:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
