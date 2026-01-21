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