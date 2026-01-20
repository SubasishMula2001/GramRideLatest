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