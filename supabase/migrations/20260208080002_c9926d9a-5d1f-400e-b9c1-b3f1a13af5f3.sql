-- Allow users to view driver's profile when they have an active ride with that driver
-- This is needed because driver_profile_for_ride view uses security_invoker = true
CREATE POLICY "Users can view driver profile for active rides"
ON public.profiles
FOR SELECT
USING (
  -- Allow if user has an active ride with a driver whose user_id matches this profile
  EXISTS (
    SELECT 1 FROM public.rides r
    INNER JOIN public.drivers d ON d.id = r.driver_id
    WHERE r.user_id = auth.uid()
    AND d.user_id = profiles.id
    AND r.status IN ('accepted', 'in_progress')
  )
);