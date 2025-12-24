-- Fix RLS policy to allow admins to view profiles when joining from drivers table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix RLS policy for activity_logs to allow admin inserts
DROP POLICY IF EXISTS "Admins can view all logs" ON public.activity_logs;

CREATE POLICY "Admins can manage all logs" 
ON public.activity_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to insert their own activity logs
CREATE POLICY "Users can insert own logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow drivers to insert activity logs
CREATE POLICY "Drivers can insert logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'driver'::app_role) AND auth.uid() = user_id
);