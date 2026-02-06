-- Drop the overly permissive policy that exposes all driver columns
DROP POLICY IF EXISTS "Users can view driver assigned to their ride" ON public.drivers;

-- Create a security definer function to safely check if user has an active ride with a driver
CREATE OR REPLACE FUNCTION public.user_has_active_ride_with_driver(_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rides 
    WHERE user_id = auth.uid() 
    AND driver_id = _driver_id 
    AND status IN ('accepted', 'in_progress', 'completed')
  )
$$;

-- Create a secure view for passengers that only exposes non-sensitive driver info
-- This view rounds GPS coordinates to ~1km precision and excludes license_number and earnings
CREATE OR REPLACE VIEW public.driver_ride_info 
WITH (security_invoker = true) AS
SELECT 
  d.id,
  d.user_id,
  d.vehicle_type,
  d.vehicle_number,
  d.rating,
  d.is_available,
  d.is_verified,
  ROUND(d.current_lat::numeric, 2) as approx_lat,
  ROUND(d.current_lng::numeric, 2) as approx_lng,
  d.created_at,
  d.updated_at
FROM public.drivers d
WHERE public.user_has_active_ride_with_driver(d.id);

-- Grant select on the view to authenticated users
GRANT SELECT ON public.driver_ride_info TO authenticated;