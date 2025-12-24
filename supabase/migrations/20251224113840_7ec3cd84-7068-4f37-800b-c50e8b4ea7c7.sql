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