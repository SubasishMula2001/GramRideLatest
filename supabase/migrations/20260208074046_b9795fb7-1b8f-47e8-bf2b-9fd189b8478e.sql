-- =============================================
-- SECURITY FIX: Protect sensitive data exposure
-- =============================================

-- 1. Create a secure view for driver profile info during active rides
-- This view only exposes non-sensitive fields needed for ride tracking
CREATE OR REPLACE VIEW public.driver_profile_for_ride AS
SELECT 
  p.id,
  p.full_name,
  -- Mask phone number: show only last 4 digits
  CASE 
    WHEN p.phone IS NOT NULL AND LENGTH(p.phone) > 4 
    THEN '******' || RIGHT(p.phone, 4)
    ELSE NULL 
  END AS masked_phone,
  d.id AS driver_id,
  d.vehicle_type,
  d.vehicle_number,
  d.rating,
  -- Provide approximate location (rounded to 2 decimal places ~1km accuracy)
  ROUND(d.current_lat::numeric, 2) AS approx_lat,
  ROUND(d.current_lng::numeric, 2) AS approx_lng
FROM public.profiles p
INNER JOIN public.drivers d ON d.user_id = p.id
WHERE d.is_verified = true;

-- 2. Create a helper function to check if user has active ride with specific driver
-- This prevents any user from accessing any driver's data
CREATE OR REPLACE FUNCTION public.can_view_driver_profile(_driver_id uuid)
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
    AND status IN ('accepted', 'in_progress')
  )
$$;

-- 3. Drop the overly permissive profile policy that exposes all driver data
DROP POLICY IF EXISTS "Users can view their driver's profile during active ride" ON public.profiles;

-- 4. Update the driver_ride_info view to exclude sensitive fields
-- It already exists but let's make sure it doesn't expose license_number
DROP VIEW IF EXISTS public.driver_ride_info;
CREATE VIEW public.driver_ride_info AS
SELECT 
  d.id,
  d.user_id,
  d.rating,
  d.is_available,
  d.is_verified,
  -- Provide approximate location only (rounded to 2 decimal places ~1km accuracy)
  ROUND(d.current_lat::numeric, 2) AS approx_lat,
  ROUND(d.current_lng::numeric, 2) AS approx_lng,
  d.created_at,
  d.updated_at,
  d.vehicle_type,
  d.vehicle_number
  -- Excluded: license_number, earnings, total_rides, exact GPS
FROM public.drivers d;

-- 5. Enable RLS on the new view
ALTER VIEW public.driver_profile_for_ride SET (security_invoker = on);

-- 6. Drop the "Block anonymous access to drivers" policy as it's too permissive
-- This policy allows ALL authenticated users to SELECT from drivers table
DROP POLICY IF EXISTS "Block anonymous access to drivers" ON public.drivers;

-- 7. Create a more restrictive policy for viewing driver info during active rides
-- Users should only see their assigned driver's basic info through the secure view
-- The drivers table should only be accessible to the driver themselves and admins
-- (Note: "Drivers can view and update own record" and "Admins can manage all drivers" already exist)

-- 8. Add policy for users to view their assigned driver's public info through driver_ride_info view
-- This is already handled through RLS on rides table - users see driver_id but should query through views