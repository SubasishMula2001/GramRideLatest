import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 
        }
      );
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid or expired token" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 
        }
      );
    }

    console.log("Authenticated user requesting API key:", user.id);

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      throw new Error("Google Maps API key not configured");
    }

    return new Response(
      JSON.stringify({ apiKey }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in get-google-maps-key:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
