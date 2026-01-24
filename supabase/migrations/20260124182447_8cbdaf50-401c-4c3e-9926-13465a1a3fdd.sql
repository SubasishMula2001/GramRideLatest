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