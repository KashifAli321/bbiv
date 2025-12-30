-- Add 200ms delay to face_hash_exists to slow enumeration attempts
CREATE OR REPLACE FUNCTION public.face_hash_exists(_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Add artificial delay to slow down enumeration attacks
  PERFORM pg_sleep(0.2);
  
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE face_descriptor_hash = _hash
  );
END;
$function$;

-- Add 200ms delay to credential_face_hash_exists to slow enumeration attempts
CREATE OR REPLACE FUNCTION public.credential_face_hash_exists(_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Add artificial delay to slow down enumeration attacks
  PERFORM pg_sleep(0.2);
  
  RETURN EXISTS (
    SELECT 1
    FROM public.credentials
    WHERE face_descriptor_hash = _hash
  );
END;
$function$;