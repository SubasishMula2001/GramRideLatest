-- Remove the dangerous user-facing UPDATE policy on payments
-- Payment updates should ONLY happen via service role in edge functions
DROP POLICY IF EXISTS "System can update payments" ON public.payments;