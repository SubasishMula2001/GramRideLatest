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