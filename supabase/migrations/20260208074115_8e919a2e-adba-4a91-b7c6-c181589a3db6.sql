-- Fix the security definer view warning by recreating views with SECURITY INVOKER
-- This ensures RLS policies of the querying user are applied, not the view creator

-- Recreate driver_profile_for_ride view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.driver_profile_for_ride;
CREATE VIEW public.driver_profile_for_ride
WITH (security_invoker = true)
AS
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

-- Recreate driver_ride_info view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.driver_ride_info;
CREATE VIEW public.driver_ride_info
WITH (security_invoker = true)
AS
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

-- Ensure available_drivers_public also uses SECURITY INVOKER
DROP VIEW IF EXISTS public.available_drivers_public;
CREATE VIEW public.available_drivers_public
WITH (security_invoker = true)
AS
SELECT 
  d.id,
  d.rating,
  d.is_available,
  -- Provide approximate location only (rounded to 2 decimal places ~1km accuracy)
  ROUND(d.current_lat::numeric, 2) AS approx_lat,
  ROUND(d.current_lng::numeric, 2) AS approx_lng,
  d.vehicle_type
  -- Excluded: license_number, earnings, total_rides, user_id, vehicle_number, exact GPS
FROM public.drivers d
WHERE d.is_available = true AND d.is_verified = true;