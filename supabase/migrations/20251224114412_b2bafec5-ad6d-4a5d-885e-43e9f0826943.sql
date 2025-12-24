-- Add INSERT policy for profiles table (defense-in-depth)
CREATE POLICY "Users can only insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);