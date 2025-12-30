-- Fix handle_new_user trigger to support Google OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_username TEXT;
BEGIN
  -- Get username from metadata, or generate from email for OAuth users
  new_username := NEW.raw_user_meta_data ->> 'username';
  
  -- If no username provided (e.g., Google OAuth), generate from email
  IF new_username IS NULL OR new_username = '' THEN
    -- Extract part before @ from email and add random suffix
    new_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 8);
  END IF;
  
  -- Ensure username is unique by checking and appending if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
    new_username := new_username || '_' || SUBSTRING(gen_random_uuid()::TEXT, 1, 4);
  END LOOP;

  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, new_username);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;