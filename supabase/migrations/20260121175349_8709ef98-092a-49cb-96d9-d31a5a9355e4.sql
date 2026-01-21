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