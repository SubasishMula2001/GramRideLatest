import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Check if address contains a Plus Code (format like "5MP3+XP5")
function containsPlusCode(address: string): boolean {
  return /^[A-Z0-9]{4}\+[A-Z0-9]{2,3}/.test(address);
}

// Find the best human-readable address from geocoding results
function findBestAddress(results: any[]): { address: string; placeId: string } | null {
  if (!results || results.length === 0) return null;

  // Priority order for address types
  const priorityTypes = [
    'street_address',
    'premise',
    'subpremise',
    'establishment',
    'point_of_interest',
    'neighborhood',
    'sublocality_level_2',
    'sublocality_level_1',
    'sublocality',
    'locality',
    'administrative_area_level_3',
    'administrative_area_level_2',
  ];

  // First, try to find an address that doesn't contain a Plus Code
  for (const priorityType of priorityTypes) {
    const result = results.find((r: any) => 
      r.types?.includes(priorityType) && !containsPlusCode(r.formatted_address)
    );
    if (result) {
      return { address: result.formatted_address, placeId: result.place_id };
    }
  }

  // If all have Plus Codes, find any result without Plus Code
  const noPlusCodeResult = results.find((r: any) => !containsPlusCode(r.formatted_address));
  if (noPlusCodeResult) {
    return { address: noPlusCodeResult.formatted_address, placeId: noPlusCodeResult.place_id };
  }

  // Last resort: use the first result but try to clean the Plus Code
  const firstResult = results[0];
  let address = firstResult.formatted_address;
  
  // Try to remove Plus Code from the beginning (e.g., "5MP3+XP5, Gundut..." -> "Gundut...")
  const plusCodeMatch = address.match(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3},?\s*/);
  if (plusCodeMatch) {
    address = address.substring(plusCodeMatch[0].length);
  }

  return { address, placeId: firstResult.place_id };
}

// Verify user authentication
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
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return { userId: data.user.id };
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Verify authentication
  const authResult = await verifyAuth(req, corsHeaders);
  if (authResult instanceof Response) {
    return authResult;
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

    const { lat, lng } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of range" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Geocoding request from user ${authResult.userId}: ${lat}, ${lng}`);

    // Request multiple result types to get better addresses
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
