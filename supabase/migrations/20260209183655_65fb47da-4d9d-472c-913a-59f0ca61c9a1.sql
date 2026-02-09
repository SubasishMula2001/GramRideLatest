
-- Fix 1: Tighten profiles SELECT policies
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view allowed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Replace with: users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can view all profiles (separate policy)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep the existing policy for drivers visible during active rides
-- "Users can view driver profile for active rides" already exists and is fine

-- Fix 2: Ensure drivers table has no unintended access
-- The existing policies are actually correct (own record + admin only),
-- but let's add an explicit authenticated check to be safe
-- No changes needed for drivers - existing RESTRICTIVE policies already limit to:
-- 1. "Drivers can view and update own record" (user_id = auth.uid())
-- 2. "Admins can manage all drivers" (has_role admin)
-- 3. "Drivers can create own record" (INSERT only)
-- These are all RESTRICTIVE, so no other authenticated user can access driver data.
