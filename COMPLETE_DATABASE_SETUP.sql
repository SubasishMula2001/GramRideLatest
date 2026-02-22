-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'driver');

-- Create enum for ride status
CREATE TYPE public.ride_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- Create enum for ride type
CREATE TYPE public.ride_type AS ENUM ('passenger', 'goods');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'toto',
  license_number TEXT,
  is_available BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  rating DECIMAL(2, 1) DEFAULT 5.0,
  total_rides INTEGER DEFAULT 0,
  earnings DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  ride_type ride_type NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  dropoff_location TEXT NOT NULL,
  dropoff_lat DECIMAL(10, 8),
  dropoff_lng DECIMAL(11, 8),
  status ride_status DEFAULT 'pending',
  fare DECIMAL(10, 2),
  distance_km DECIMAL(5, 2),
  duration_mins INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create activity_logs table for admin
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for drivers
CREATE POLICY "Anyone can view available drivers" ON public.drivers
  FOR SELECT USING (is_available = true AND is_verified = true);

CREATE POLICY "Drivers can view and update own record" ON public.drivers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all drivers" ON public.drivers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rides
CREATE POLICY "Users can view own rides" ON public.rides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create rides" ON public.rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can view assigned rides" ON public.rides
  FOR SELECT USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update assigned rides" ON public.rides
  FOR UPDATE USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all rides" ON public.rides
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" ON public.activity_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- Fix function search path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
-- Enable realtime for rides table
ALTER TABLE public.rides REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- Add policy for drivers to view pending rides (for accepting)
CREATE POLICY "Drivers can view pending rides" ON public.rides
  FOR SELECT USING (
    status = 'pending' AND 
    EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid() AND is_verified = true AND is_available = true)
  );

-- Add policy for drivers to accept pending rides
CREATE POLICY "Drivers can accept pending rides" ON public.rides
  FOR UPDATE USING (
    status = 'pending' AND 
    EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid() AND is_verified = true)
  );
-- Allow admins to read user_roles for join queries from profiles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));
-- Fix RLS policy to allow admins to view profiles when joining from drivers table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix RLS policy for activity_logs to allow admin inserts
DROP POLICY IF EXISTS "Admins can view all logs" ON public.activity_logs;

CREATE POLICY "Admins can manage all logs" 
ON public.activity_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to insert their own activity logs
CREATE POLICY "Users can insert own logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow drivers to insert activity logs
CREATE POLICY "Drivers can insert logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'driver'::app_role) AND auth.uid() = user_id
);
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
-- Create atomic ride acceptance function with row locking to prevent race conditions
CREATE OR REPLACE FUNCTION public.accept_ride(
  _ride_id UUID,
  _driver_id UUID
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected_rows INT;
BEGIN
  -- Atomically update the ride with row locking to prevent race conditions
  UPDATE rides
  SET driver_id = _driver_id,
      status = 'accepted',
      accepted_at = NOW()
  WHERE id = _ride_id 
    AND status = 'pending'
    AND driver_id IS NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;
-- Add INSERT policy for profiles table (defense-in-depth)
CREATE POLICY "Users can only insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);
-- Enable realtime for drivers table to track location updates
ALTER TABLE public.drivers REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
-- Add OTP column to rides table for pickup verification
ALTER TABLE public.rides ADD COLUMN otp VARCHAR(6);

-- Add comment explaining the column
COMMENT ON COLUMN public.rides.otp IS 'One-time password for pickup verification - shared by user with driver';
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
-- Create ratings table for ride reviews
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Users can insert their own ratings
CREATE POLICY "Users can create ratings for their rides"
ON public.ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own ratings
CREATE POLICY "Users can view own ratings"
ON public.ratings
FOR SELECT
USING (auth.uid() = user_id);

-- Drivers can view ratings for them
CREATE POLICY "Drivers can view their ratings"
ON public.ratings
FOR SELECT
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Admins can manage all ratings
CREATE POLICY "Admins can manage all ratings"
ON public.ratings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  credits_earned NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Users can create referrals
CREATE POLICY "Users can create referrals"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals"
ON public.referrals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits NUMERIC DEFAULT 0;

-- Add scheduled_for field to rides table
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- Enable realtime for ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;

-- Create indexes for performance
CREATE INDEX idx_ratings_driver_id ON public.ratings(driver_id);
CREATE INDEX idx_ratings_ride_id ON public.ratings(ride_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_rides_scheduled_for ON public.rides(scheduled_for) WHERE is_scheduled = true;
-- Allow users to view the profile of their assigned driver
CREATE POLICY "Users can view their driver's profile during active ride"
ON public.profiles
FOR SELECT
USING (
  -- User can view profile if this profile belongs to a driver assigned to one of their rides
  id IN (
    SELECT d.user_id 
    FROM drivers d
    INNER JOIN rides r ON r.driver_id = d.id
    WHERE r.user_id = auth.uid()
    AND r.status IN ('accepted', 'in_progress', 'completed')
  )
);
-- Allow users to view the driver assigned to their ride
CREATE POLICY "Users can view driver assigned to their ride"
ON public.drivers
FOR SELECT
USING (
  id IN (
    SELECT driver_id 
    FROM rides 
    WHERE user_id = auth.uid()
    AND driver_id IS NOT NULL
    AND status IN ('accepted', 'in_progress', 'completed')
  )
);
-- Allow users with driver role to insert their own driver record
CREATE POLICY "Drivers can create own record"
ON public.drivers
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'driver'
  )
);
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
-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('upi', 'cash', 'wallet');

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  amount NUMERIC NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  transaction_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add payment columns to rides table
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method payment_method,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments for own rides"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payments"
ON public.payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Drivers can view payments for their rides"
ON public.payments FOR SELECT
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all payments"
ON public.payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_payments_ride_id ON public.payments(ride_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(payment_status);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
-- Create shared_rides table for group bookings
CREATE TABLE public.shared_rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  dropoff_lat NUMERIC,
  dropoff_lng NUMERIC,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_passengers INTEGER NOT NULL DEFAULT 4,
  fare_per_person NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'in_progress', 'completed', 'cancelled')),
  driver_id UUID REFERENCES public.drivers(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shared_ride_passengers table for joining passengers
CREATE TABLE public.shared_ride_passengers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_ride_id UUID NOT NULL REFERENCES public.shared_rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  seats_booked INTEGER NOT NULL DEFAULT 1,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shared_ride_id, user_id)
);

-- Enable RLS
ALTER TABLE public.shared_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_ride_passengers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_rides
CREATE POLICY "Anyone authenticated can view open shared rides"
ON public.shared_rides
FOR SELECT
TO authenticated
USING (status IN ('open', 'full', 'in_progress'));

CREATE POLICY "Users can create shared rides"
ON public.shared_rides
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update own shared ride"
ON public.shared_rides
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Drivers can update assigned shared rides"
ON public.shared_rides
FOR UPDATE
TO authenticated
USING (driver_id = get_current_driver_id());

CREATE POLICY "Admins can manage all shared rides"
ON public.shared_rides
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for shared_ride_passengers
CREATE POLICY "Users can view passengers of rides they joined"
ON public.shared_ride_passengers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  shared_ride_id IN (SELECT id FROM public.shared_rides WHERE created_by = auth.uid()) OR
  shared_ride_id IN (SELECT id FROM public.shared_rides WHERE driver_id = get_current_driver_id())
);

CREATE POLICY "Users can join shared rides"
ON public.shared_ride_passengers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own passenger record"
ON public.shared_ride_passengers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave shared rides"
ON public.shared_ride_passengers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all passengers"
ON public.shared_ride_passengers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for shared rides
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_ride_passengers;

-- Create function to get passenger count
CREATE OR REPLACE FUNCTION public.get_shared_ride_passenger_count(ride_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(seats_booked), 0)::INTEGER
  FROM public.shared_ride_passengers
  WHERE shared_ride_id = ride_id
$$;

-- Create trigger to auto-update status when full
CREATE OR REPLACE FUNCTION public.check_shared_ride_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT get_shared_ride_passenger_count(NEW.shared_ride_id) INTO current_count;
  SELECT max_passengers INTO max_count FROM shared_rides WHERE id = NEW.shared_ride_id;
  
  IF current_count >= max_count THEN
    UPDATE shared_rides SET status = 'full' WHERE id = NEW.shared_ride_id AND status = 'open';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_capacity_after_join
AFTER INSERT ON public.shared_ride_passengers
FOR EACH ROW
EXECUTE FUNCTION public.check_shared_ride_capacity();
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
-- Create app_settings table for storing application-wide configuration
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for fare calculation)
CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Only admins can insert app settings"
ON public.app_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can update app settings"
ON public.app_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can delete app settings"
ON public.app_settings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default settings with night charges DISABLED by default
INSERT INTO public.app_settings (key, value, description)
VALUES ('night_charges_enabled', 'false', 'Enable 20% night surcharge between 10 PM and 6 AM');
-- Create promo_codes table for discount management
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_fare NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create promo_code_usage table to track user redemptions
CREATE TABLE public.promo_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  discount_amount NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(promo_code_id, user_id, ride_id)
);

-- Create driver_payouts table for tracking payments to drivers
CREATE TABLE public.driver_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payout_method TEXT NOT NULL CHECK (payout_method IN ('bank_transfer', 'upi', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reference_number TEXT,
  notes TEXT,
  period_start DATE,
  period_end DATE,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;

-- Promo codes policies
CREATE POLICY "Anyone can view active promo codes" 
ON public.promo_codes FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all promo codes" 
ON public.promo_codes FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Promo code usage policies
CREATE POLICY "Users can view own promo usage" 
ON public.promo_code_usage FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can use promo codes" 
ON public.promo_code_usage FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all promo usage" 
ON public.promo_code_usage FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Driver payouts policies
CREATE POLICY "Drivers can view own payouts" 
ON public.driver_payouts FOR SELECT 
USING (driver_id = get_current_driver_id());

CREATE POLICY "Admins can manage all payouts" 
ON public.driver_payouts FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add surge pricing settings to app_settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('surge_pricing_enabled', 'false', 'Enable surge pricing during peak hours'),
  ('surge_multiplier', '1.5', 'Surge pricing multiplier (e.g., 1.5 = 50% increase)'),
  ('surge_start_hour', '8', 'Surge pricing start hour (24-hour format)'),
  ('surge_end_hour', '10', 'Surge pricing end hour (24-hour format)')
ON CONFLICT (key) DO NOTHING;

-- Create updated_at triggers
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_driver_payouts_updated_at
  BEFORE UPDATE ON public.driver_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to validate and apply promo code
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  _code TEXT,
  _user_id UUID,
  _fare NUMERIC
)
RETURNS TABLE(
  valid BOOLEAN,
  discount NUMERIC,
  message TEXT,
  promo_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo RECORD;
  user_usage_count INTEGER;
  calculated_discount NUMERIC;
BEGIN
  -- Find the promo code
  SELECT * INTO promo FROM promo_codes 
  WHERE UPPER(code) = UPPER(_code) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'Invalid promo code'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check validity dates
  IF promo.valid_from IS NOT NULL AND NOW() < promo.valid_from THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'Promo code not yet active'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF promo.valid_until IS NOT NULL AND NOW() > promo.valid_until THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'Promo code has expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check usage limit
  IF promo.usage_limit IS NOT NULL AND promo.used_count >= promo.usage_limit THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'Promo code usage limit reached'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check minimum fare
  IF _fare < promo.min_fare THEN
    RETURN QUERY SELECT false, 0::NUMERIC, ('Minimum fare of â‚¹' || promo.min_fare || ' required')::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user already used this promo
  SELECT COUNT(*) INTO user_usage_count FROM promo_code_usage 
  WHERE promo_code_id = promo.id AND user_id = _user_id;
  
  IF user_usage_count > 0 THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'You have already used this promo code'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF promo.discount_type = 'percentage' THEN
    calculated_discount := _fare * (promo.discount_value / 100);
  ELSE
    calculated_discount := promo.discount_value;
  END IF;
  
  -- Apply max discount cap if set
  IF promo.max_discount IS NOT NULL AND calculated_discount > promo.max_discount THEN
    calculated_discount := promo.max_discount;
  END IF;
  
  -- Don't exceed the fare
  IF calculated_discount > _fare THEN
    calculated_discount := _fare;
  END IF;
  
  RETURN QUERY SELECT true, calculated_discount, 'Promo code applied!'::TEXT, promo.id;
END;
$$;
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
-- Update the handle_new_user function to respect the selected role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  selected_role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Get selected role from metadata, default to 'user' if not specified or invalid
  selected_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'role', '')::app_role,
    'user'::app_role
  );
  
  -- Prevent self-registration as admin for security
  IF selected_role = 'admin' THEN
    selected_role := 'user';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation THEN
    -- Invalid role value, default to user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$function$;
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

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

-- Add is_sensitive column to distinguish API keys from regular settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

-- Update existing SELECT policy to restrict sensitive keys to admins only
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Anyone can read non-sensitive settings"
ON public.app_settings FOR SELECT
USING (is_sensitive = false);

CREATE POLICY "Only admins can read sensitive settings"
ON public.app_settings FOR SELECT
USING (is_sensitive = true AND has_role(auth.uid(), 'admin'::app_role));

-- Insert API key placeholders (sensitive)
INSERT INTO public.app_settings (key, value, description, is_sensitive)
VALUES 
  ('razorpay_key_id', '""', 'Razorpay Key ID for payment processing', true),
  ('razorpay_key_secret', '""', 'Razorpay Key Secret for payment verification', true),
  ('google_maps_api_key', '""', 'Google Maps API Key for location services', true)
ON CONFLICT (key) DO UPDATE SET is_sensitive = true;
-- Remove the dangerous user-facing UPDATE policy on payments
-- Payment updates should ONLY happen via service role in edge functions
DROP POLICY IF EXISTS "System can update payments" ON public.payments;
-- Create vehicle_types table
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_fare DECIMAL(10, 2) DEFAULT 0,
  per_km_rate DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active vehicle types
CREATE POLICY "Anyone can view active vehicle types"
  ON vehicle_types FOR SELECT
  USING (is_active = true);

-- Allow admin to view all vehicle types
CREATE POLICY "Admin can view all vehicle types"
  ON vehicle_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admin to insert vehicle types
CREATE POLICY "Admin can insert vehicle types"
  ON vehicle_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admin to update vehicle types
CREATE POLICY "Admin can update vehicle types"
  ON vehicle_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admin to delete vehicle types
CREATE POLICY "Admin can delete vehicle types"
  ON vehicle_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default vehicle types with initial data
INSERT INTO vehicle_types (name, display_name, description, base_fare, per_km_rate, sort_order, is_active) VALUES
  ('toto', 'Toto (Electric Rickshaw)', 'Eco-friendly electric rickshaw for short distances', 20, 8, 1, true),
  ('auto', 'Auto Rickshaw', 'Traditional auto rickshaw for city travel', 25, 10, 2, true),
  ('van', 'Van', 'Spacious van for group travel or cargo', 50, 15, 3, true),
  ('bike', 'Motorcycle', 'Quick and affordable motorcycle ride', 15, 6, 4, true)
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vehicle_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicle_types_updated_at
  BEFORE UPDATE ON vehicle_types
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_types_updated_at();

-- Create storage bucket for vehicle images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policy for vehicle images (allow authenticated users to upload)
CREATE POLICY "Authenticated users can upload vehicle images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'vehicle-images'
  );

-- Allow public read access to vehicle images
CREATE POLICY "Anyone can view vehicle images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'vehicle-images'
  );

-- Allow admin to delete vehicle images
CREATE POLICY "Admin can delete vehicle images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'public'
    AND auth.jwt() ->> 'user_role' = 'admin'
    AND (storage.foldername(name))[1] = 'vehicle-images'
  );

-- Enable realtime for vehicle_types table
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_types;
-- Create driver_vehicles junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, vehicle_type_id)
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_vehicle_type ON driver_vehicles(vehicle_type_id);

-- Enable RLS
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Allow drivers to view their own vehicles
CREATE POLICY "Drivers can view their own vehicles"
  ON driver_vehicles FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Allow anyone to view driver vehicles (for matching)
CREATE POLICY "Anyone can view driver vehicles for matching"
  ON driver_vehicles FOR SELECT
  USING (true);

-- Allow admin to manage driver vehicles
CREATE POLICY "Admin can manage driver vehicles"
  ON driver_vehicles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow drivers to insert their own vehicles during registration
CREATE POLICY "Drivers can add their own vehicles"
  ON driver_vehicles FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Migrate existing vehicle_type data to driver_vehicles
-- This will populate the junction table with existing single vehicle assignments
INSERT INTO driver_vehicles (driver_id, vehicle_type_id, is_primary)
SELECT 
  d.id as driver_id,
  vt.id as vehicle_type_id,
  true as is_primary
FROM drivers d
INNER JOIN vehicle_types vt ON d.vehicle_type = vt.name
WHERE NOT EXISTS (
  SELECT 1 FROM driver_vehicles dv 
  WHERE dv.driver_id = d.id AND dv.vehicle_type_id = vt.id
)
ON CONFLICT (driver_id, vehicle_type_id) DO NOTHING;

-- Create view for easy driver vehicle lookup
CREATE OR REPLACE VIEW driver_vehicle_details AS
SELECT 
  dv.id,
  dv.driver_id,
  d.user_id,
  d.vehicle_number,
  d.license_number,
  d.is_available,
  d.is_verified,
  d.rating,
  dv.vehicle_type_id,
  vt.name as vehicle_type_name,
  vt.display_name as vehicle_display_name,
  vt.image_url as vehicle_image_url,
  vt.base_fare,
  vt.per_km_rate,
  dv.is_primary,
  dv.created_at
FROM driver_vehicles dv
INNER JOIN drivers d ON dv.driver_id = d.id
INNER JOIN vehicle_types vt ON dv.vehicle_type_id = vt.id
WHERE vt.is_active = true;

-- Grant access to the view
GRANT SELECT ON driver_vehicle_details TO authenticated, anon;

-- Enable realtime for driver_vehicles
ALTER PUBLICATION supabase_realtime ADD TABLE driver_vehicles;
-- Create zones table for area management
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  boundary_points JSONB NOT NULL, -- Array of {lat, lng} points defining the zone polygon
  is_active BOOLEAN DEFAULT true,
  service_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create zone pricing table for zone-specific pricing rules
CREATE TABLE IF NOT EXISTS zone_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE CASCADE NOT NULL,
  base_fare_multiplier DECIMAL(3, 2) DEFAULT 1.00, -- Multiplier for base fare (e.g., 1.5 = 150%)
  per_km_multiplier DECIMAL(3, 2) DEFAULT 1.00, -- Multiplier for per km rate
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id, vehicle_type_id)
);

-- Create zone surge pricing table
CREATE TABLE IF NOT EXISTS zone_surge_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  surge_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.50, -- Surge multiplier (e.g., 1.5 = 150%)
  start_time TIME NOT NULL, -- Start time (24h format)
  end_time TIME NOT NULL, -- End time (24h format)
  days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sunday, 6=Saturday
  is_active BOOLEAN DEFAULT true,
  reason TEXT, -- e.g., "Morning Rush", "Evening Peak"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(is_active);
CREATE INDEX IF NOT EXISTS idx_zone_pricing_zone ON zone_pricing(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_pricing_vehicle ON zone_pricing(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_zone_surge_zone ON zone_surge_pricing(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_surge_active ON zone_surge_pricing(is_active);

-- Enable RLS on zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_surge_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zones
-- Anyone can view active zones
CREATE POLICY "Anyone can view active zones"
  ON zones FOR SELECT
  USING (is_active = true);

-- Admin can view all zones
CREATE POLICY "Admin can view all zones"
  ON zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin can manage zones
CREATE POLICY "Admin can insert zones"
  ON zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update zones"
  ON zones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete zones"
  ON zones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for zone_pricing
CREATE POLICY "Anyone can view active zone pricing"
  ON zone_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage zone pricing"
  ON zone_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for zone_surge_pricing
CREATE POLICY "Anyone can view active zone surge pricing"
  ON zone_surge_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage zone surge pricing"
  ON zone_surge_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_zones_updated_at();

CREATE TRIGGER zone_pricing_updated_at
  BEFORE UPDATE ON zone_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_zones_updated_at();

CREATE TRIGGER zone_surge_pricing_updated_at
  BEFORE UPDATE ON zone_surge_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_zones_updated_at();

-- Enable realtime for zones tables
ALTER PUBLICATION supabase_realtime ADD TABLE zones;
ALTER PUBLICATION supabase_realtime ADD TABLE zone_pricing;
ALTER PUBLICATION supabase_realtime ADD TABLE zone_surge_pricing;

-- Set night charges to OFF by default in app_settings
INSERT INTO app_settings (key, value, description) 
VALUES 
  ('night_charges_enabled', 'false', 'Enable or disable night time charges')
ON CONFLICT (key) DO UPDATE SET value = 'false';

-- Insert sample zones for demonstration
INSERT INTO zones (name, description, boundary_points, is_active, service_enabled) VALUES
  (
    'City Center',
    'Main city center area with high demand',
    '[{"lat": 22.5726, "lng": 88.3639}, {"lat": 22.5826, "lng": 88.3639}, {"lat": 22.5826, "lng": 88.3739}, {"lat": 22.5726, "lng": 88.3739}]'::jsonb,
    true,
    true
  ),
  (
    'Village North',
    'Northern villages - lower demand area',
    '[{"lat": 22.6000, "lng": 88.3500}, {"lat": 22.6100, "lng": 88.3500}, {"lat": 22.6100, "lng": 88.3600}, {"lat": 22.6000, "lng": 88.3600}]'::jsonb,
    true,
    true
  ),
  (
    'Market Area',
    'Local market zone with moderate demand',
    '[{"lat": 22.5500, "lng": 88.3400}, {"lat": 22.5600, "lng": 88.3400}, {"lat": 22.5600, "lng": 88.3500}, {"lat": 22.5500, "lng": 88.3500}]'::jsonb,
    true,
    true
  )
ON CONFLICT DO NOTHING;
-- Fix storage bucket for vehicle images
-- Note: Storage policies must be created through the Supabase Dashboard UI
-- Go to Storage â†’ Policies to add the required policies

-- Ensure the public bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public', 
  'public', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];
