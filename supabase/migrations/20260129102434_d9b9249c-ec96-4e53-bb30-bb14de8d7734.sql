-- Block anonymous (unauthenticated) users from accessing profiles table
-- This adds an explicit check that auth.uid() is not null to prevent anonymous SELECT
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Block anonymous (unauthenticated) users from accessing drivers table
-- This adds an explicit check that auth.uid() is not null to prevent anonymous SELECT
CREATE POLICY "Block anonymous access to drivers"
ON public.drivers
FOR SELECT
USING (auth.uid() IS NOT NULL);