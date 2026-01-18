import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const DEMO_USERS = [
  { email: "user@gramride.com", role: "user", fullName: "Demo User" },
  { email: "driver@gramride.com", role: "driver", fullName: "Demo Driver" },
  { email: "admin@gramride.com", role: "admin", fullName: "Demo Admin" },
];

const handler = async (req: Request): Promise<Response> => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const demoPassword = Deno.env.get("DEMO_USER_PASSWORD");

    if (!demoPassword) {
      console.error("DEMO_USER_PASSWORD not configured");
      return new Response(
        JSON.stringify({ error: "Demo password not configured" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results = [];

    for (const demoUser of DEMO_USERS) {
      try {
        // List all users and find by email
        const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
        
        if (listError) {
          console.error(`Error listing users:`, listError);
          results.push({ email: demoUser.email, status: "error", message: listError.message });
          continue;
        }

        const existingUser = users.users.find(u => u.email === demoUser.email);

        if (existingUser) {
          // Update password for existing user
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            existingUser.id,
            { password: demoPassword }
          );

          if (updateError) {
            console.error(`Error updating ${demoUser.email}:`, updateError);
            results.push({ email: demoUser.email, status: "error", message: updateError.message });
          } else {
            console.log(`Password updated for ${demoUser.email}`);
            results.push({ email: demoUser.email, status: "updated" });
          }
        } else {
          // Create new user
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: demoUser.email,
            password: demoPassword,
            email_confirm: true,
            user_metadata: { full_name: demoUser.fullName },
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

            // Create driver record if driver role
            if (demoUser.role === 'driver') {
              await adminClient.from('drivers').upsert({
                user_id: newUser.user.id,
                vehicle_number: 'DEMO-001',
                is_verified: true,
                is_available: true,
              }, { onConflict: 'user_id' });
            }

            console.log(`Created ${demoUser.email}`);
            results.push({ email: demoUser.email, status: "created" });
          }
        }
      } catch (err: any) {
        console.error(`Error processing ${demoUser.email}:`, err);
        results.push({ email: demoUser.email, status: "error", message: err.message });
      }
    }

    // Return the password so the frontend knows what to use
    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        password: demoPassword 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Setup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
