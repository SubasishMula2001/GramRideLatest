import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CashPaymentRequest {
  ride_id: string;
  amount: number;
  confirmed_by: 'user' | 'driver';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Use service role to verify the token and get user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    
    // Create a client for database operations with user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { ride_id, amount, confirmed_by }: CashPaymentRequest = await req.json();

    // Validate input
    if (!ride_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid ride_id or amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the ride
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, user_id, driver_id, fare, status')
      .eq('id', ride_id)
      .single();

    if (rideError || !ride) {
      console.error('Ride fetch error:', rideError);
      return new Response(
        JSON.stringify({ error: 'Ride not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is the ride owner or the driver
    const isRideOwner = ride.user_id === userId;
    
    // Check if user is the driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    const isDriver = driver && ride.driver_id === driver.id;

    if (!isRideOwner && !isDriver) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing cash payment for ride:', ride_id);

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        ride_id: ride_id,
        user_id: ride.user_id,
        driver_id: ride.driver_id,
        amount: amount,
        payment_method: 'cash',
        payment_status: 'completed',
        transaction_id: `CASH_${Date.now()}`,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record error:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update ride payment status
    const { error: updateRideError } = await supabase
      .from('rides')
      .update({
        payment_status: 'completed',
        payment_method: 'cash',
        payment_id: payment.id,
      })
      .eq('id', ride_id);

    if (updateRideError) {
      console.error('Ride update error:', updateRideError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cash payment confirmed',
        payment_id: payment.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
