-- Create security definer function to get current user's driver id (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1
$$;

-- Create security definer function to check if driver is verified and available
CREATE OR REPLACE FUNCTION public.is_verified_available_driver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE user_id = auth.uid() 
    AND is_verified = true 
    AND is_available = true
  )
$$;

-- Create security definer function to check if driver is verified
CREATE OR REPLACE FUNCTION public.is_verified_driver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE user_id = auth.uid() 
    AND is_verified = true
  )
$$;

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view driver assigned to their ride" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can create own record" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can accept pending rides" ON public.rides;
DROP POLICY IF EXISTS "Drivers can update assigned rides" ON public.rides;
DROP POLICY IF EXISTS "Drivers can view assigned rides" ON public.rides;
DROP POLICY IF EXISTS "Drivers can view pending rides" ON public.rides;
DROP POLICY IF EXISTS "Users can view their driver's profile during active ride" ON public.profiles;

-- Recreate drivers policies using security definer functions
CREATE POLICY "Drivers can create own record"
ON public.drivers
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND has_role(auth.uid(), 'driver')
);

CREATE POLICY "Users can view driver assigned to their ride"
ON public.drivers
FOR SELECT
USING (
  id IN (
    SELECT driver_id FROM rides 
    WHERE user_id = auth.uid()
    AND driver_id IS NOT NULL
    AND status IN ('accepted', 'in_progress', 'completed')
  )
);

-- Recreate rides policies using security definer functions (no recursion)
CREATE POLICY "Drivers can accept pending rides"
ON public.rides
FOR UPDATE
USING (
  status = 'pending' 
  AND is_verified_driver()
);

CREATE POLICY "Drivers can update assigned rides"
ON public.rides
FOR UPDATE
USING (driver_id = get_current_driver_id());

CREATE POLICY "Drivers can view assigned rides"
ON public.rides
FOR SELECT
USING (driver_id = get_current_driver_id());

CREATE POLICY "Drivers can view pending rides"
ON public.rides
FOR SELECT
USING (
  status = 'pending' 
  AND is_verified_available_driver()
);

-- Recreate profiles policy using security definer function
CREATE POLICY "Users can view their driver's profile during active ride"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT user_id FROM drivers 
    WHERE id IN (
      SELECT driver_id FROM rides 
      WHERE user_id = auth.uid() 
      AND status IN ('accepted', 'in_progress', 'completed')
    )
  )
);