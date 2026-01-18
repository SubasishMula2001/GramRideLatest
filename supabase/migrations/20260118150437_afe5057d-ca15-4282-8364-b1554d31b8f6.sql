-- Add OTP column to rides table for pickup verification
ALTER TABLE public.rides ADD COLUMN otp VARCHAR(6);

-- Add comment explaining the column
COMMENT ON COLUMN public.rides.otp IS 'One-time password for pickup verification - shared by user with driver';