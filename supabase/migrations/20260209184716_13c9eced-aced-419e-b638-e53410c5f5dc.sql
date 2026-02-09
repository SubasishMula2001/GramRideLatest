
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
