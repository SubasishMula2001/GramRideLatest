import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

// Check Razorpay order status and update DB if payment was captured
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { payment_id } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing payment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already completed, return immediately
    if (payment.payment_status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'completed',
          razorpay_payment_id: payment.razorpay_payment_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query Razorpay for order payments
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret || !payment.razorpay_order_id) {
      return new Response(
        JSON.stringify({ success: false, status: payment.payment_status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/orders/${payment.razorpay_order_id}/payments`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        },
      }
    );

    if (!razorpayResponse.ok) {
      console.error('Razorpay API error:', await razorpayResponse.text());
      return new Response(
        JSON.stringify({ success: false, status: 'pending' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentsData = await razorpayResponse.json();
    console.log('Razorpay payments for order:', JSON.stringify(paymentsData));

    // Find a captured payment
    const capturedPayment = paymentsData.items?.find(
      (p: any) => p.status === 'captured'
    );

    if (capturedPayment) {
      console.log('Found captured payment:', capturedPayment.id);

      // Update payment record
      await supabaseAdmin
        .from('payments')
        .update({
          payment_status: 'completed',
          razorpay_payment_id: capturedPayment.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment_id);

      // Update ride payment status
      await supabaseAdmin
        .from('rides')
        .update({
          payment_status: 'completed',
          payment_method: 'upi',
          payment_id: payment_id,
        })
        .eq('id', payment.ride_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'completed',
          razorpay_payment_id: capturedPayment.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, status: 'pending' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
