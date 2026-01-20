-- Fix 1: Secure profiles table - ensure only authenticated users can view profiles
-- Drop existing overlapping policies first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a single consolidated policy that requires authentication
CREATE POLICY "Authenticated users can view allowed profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = id OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix 2: Remove overpermissive driver policy that exposes sensitive data
-- The available_drivers_public view provides safe access for ride matching
DROP POLICY IF EXISTS "Authenticated users can view available drivers basic info" ON public.drivers;

-- Fix 3: Prevent OTP leakage through realtime - use DEFAULT replica identity
-- This sends only primary key in realtime notifications, not full row data
ALTER TABLE public.rides REPLICA IDENTITY DEFAULT;