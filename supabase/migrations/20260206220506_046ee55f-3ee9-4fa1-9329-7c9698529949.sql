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
    RETURN QUERY SELECT false, 0::NUMERIC, ('Minimum fare of ₹' || promo.min_fare || ' required')::TEXT, NULL::UUID;
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