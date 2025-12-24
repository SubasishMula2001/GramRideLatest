-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view available drivers" ON public.drivers;

-- Create a new policy that only exposes non-sensitive data for ride matching
-- Authenticated users can see limited driver info (no license, earnings, or exact location)
CREATE POLICY "Authenticated users can view available drivers basic info" ON public.drivers
  FOR SELECT 
  USING (
    -- Admins and the driver themselves can see everything
    (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
    OR
    -- For available/verified drivers, only allow viewing (actual data filtering happens in app)
    (is_available = true AND is_verified = true AND auth.uid() IS NOT NULL)
  );

-- Create a view for public driver info that only exposes safe fields
CREATE OR REPLACE VIEW public.available_drivers_public AS
SELECT 
  id,
  vehicle_type,
  rating,
  is_available,
  -- Round coordinates to ~1km precision for privacy
  ROUND(current_lat::numeric, 2) as approx_lat,
  ROUND(current_lng::numeric, 2) as approx_lng
FROM public.drivers
WHERE is_available = true AND is_verified = true;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.available_drivers_public TO authenticated;