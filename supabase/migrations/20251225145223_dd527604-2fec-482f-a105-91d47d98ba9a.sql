-- Enable realtime for drivers table to track location updates
ALTER TABLE public.drivers REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;