-- Update the handle_new_user function to respect the selected role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  selected_role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Get selected role from metadata, default to 'user' if not specified or invalid
  selected_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'role', '')::app_role,
    'user'::app_role
  );
  
  -- Prevent self-registration as admin for security
  IF selected_role = 'admin' THEN
    selected_role := 'user';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation THEN
    -- Invalid role value, default to user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$function$;