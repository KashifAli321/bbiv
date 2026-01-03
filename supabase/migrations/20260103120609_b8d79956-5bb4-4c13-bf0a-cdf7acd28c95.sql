-- Create a new function that returns wallet address if similar face exists
CREATE OR REPLACE FUNCTION public.check_face_similarity_with_wallet(_descriptor double precision[], _threshold double precision DEFAULT 0.6)
RETURNS TABLE(similar_exists boolean, wallet_address text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_record RECORD;
  distance float8;
BEGIN
  -- Add artificial delay to slow down enumeration attacks
  PERFORM pg_sleep(0.1);
  
  -- Check profiles table for similar faces
  FOR existing_record IN SELECT p.face_descriptor, p.wallet_address FROM public.profiles p WHERE p.face_descriptor IS NOT NULL
  LOOP
    -- Calculate Euclidean distance between descriptors
    SELECT SQRT(SUM(POWER(a.val - b.val, 2)))
    INTO distance
    FROM (SELECT unnest(_descriptor) as val, generate_subscripts(_descriptor, 1) as idx) a
    JOIN (SELECT unnest(existing_record.face_descriptor) as val, generate_subscripts(existing_record.face_descriptor, 1) as idx) b
    ON a.idx = b.idx;
    
    IF distance < _threshold THEN
      RETURN QUERY SELECT true, existing_record.wallet_address;
      RETURN;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT false, NULL::text;
END;
$function$;