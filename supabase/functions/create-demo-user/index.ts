import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDemoUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'user' | 'driver';
  vehicleNumber?: string;
  licenseNumber?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, fullName, role, vehicleNumber, licenseNumber }: CreateDemoUserRequest = await req.json();

    console.log(`Creating demo user: ${email} with role: ${role}`);

    // Create user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      // If user already exists, just return success
      if (authError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ message: "User already exists", email }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;
    console.log(`User created with ID: ${userId}`);

    // Update user role if not 'user' (default)
    if (role !== 'user') {
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (roleError) {
        console.error("Role update error:", roleError);
      }
    }

    // If driver, create driver record
    if (role === 'driver' && vehicleNumber) {
      const { error: driverError } = await supabase
        .from('drivers')
        .insert({
          user_id: userId,
          vehicle_number: vehicleNumber,
          license_number: licenseNumber || null,
          is_verified: true,
          is_available: true,
        });

      if (driverError) {
        console.error("Driver creation error:", driverError);
      }
    }

    console.log(`Demo user created successfully: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Demo ${role} created successfully`,
        email,
        userId 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in create-demo-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
