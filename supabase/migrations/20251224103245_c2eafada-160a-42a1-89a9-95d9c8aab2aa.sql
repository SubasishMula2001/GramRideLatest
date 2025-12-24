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