-- Drop the security definer view and recreate it properly
DROP VIEW IF EXISTS public.available_drivers_public;

-- Create the view with SECURITY INVOKER (default) which uses the querying user's permissions
CREATE VIEW public.available_drivers_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  vehicle_type,
  rating,
  is_available,
  ROUND(current_lat::numeric, 2) as approx_lat,
  ROUND(current_lng::numeric, 2) as approx_lng
FROM public.drivers
WHERE is_available = true AND is_verified = true;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.available_drivers_public TO authenticated;