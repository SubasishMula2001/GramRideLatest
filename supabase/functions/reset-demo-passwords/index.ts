import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  { email: "user@gramride.com", password: "Demo@Pass123!", role: "user" },
  { email: "driver@gramride.com", password: "Demo@Pass123!", role: "driver" },
  { email: "admin@gramride.com", password: "Demo@Pass123!", role: "admin" },
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user client to verify the caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.log("Authentication failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Create admin client to check role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller has admin role
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.log("Admin role check failed:", roleError?.message);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Admin verified, proceeding with password reset");

    const results = [];

    for (const demoUser of DEMO_USERS) {
      // Find user by email
      const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
      
      if (listError) {
        console.error("Error listing users:", listError);
        results.push({ email: demoUser.email, status: "error", message: listError.message });
        continue;
      }

      const existingUser = users.users.find(u => u.email === demoUser.email);

      if (existingUser) {
        // Update password
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          existingUser.id,
          { password: demoUser.password }
        );

        if (updateError) {
          console.error(`Error updating password for ${demoUser.email}:`, updateError);
          results.push({ email: demoUser.email, status: "error", message: updateError.message });
        } else {
          console.log(`Password updated for ${demoUser.email}`);
          results.push({ email: demoUser.email, status: "updated" });
        }
      } else {
        // Create user if not exists
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: demoUser.email,
          password: demoUser.password,
          email_confirm: true,
          user_metadata: { full_name: `Demo ${demoUser.role}` },
        });

        if (createError) {
          console.error(`Error creating ${demoUser.email}:`, createError);
          results.push({ email: demoUser.email, status: "error", message: createError.message });
        } else {
          // Set role
          await adminClient.from('user_roles').upsert({
            user_id: newUser.user.id,
            role: demoUser.role,
          }, { onConflict: 'user_id' });

          console.log(`Created ${demoUser.email}`);
          results.push({ email: demoUser.email, status: "created" });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
