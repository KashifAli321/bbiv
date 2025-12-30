-- Add column to store face descriptor array for similarity comparison
-- The hash is still kept for quick lookups, but descriptors enable distance-based matching

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS face_descriptor float8[] DEFAULT NULL;

-- Add column to credentials table as well for face similarity checks during issuance
ALTER TABLE public.credentials 
ADD COLUMN IF NOT EXISTS face_descriptor float8[] DEFAULT NULL;

-- Create a function to check face similarity using Euclidean distance
-- Returns true if a similar face exists (distance < threshold)
CREATE OR REPLACE FUNCTION public.check_face_similarity(
  _descriptor float8[],
  _threshold float8 DEFAULT 0.6
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_descriptor float8[];
  distance float8;
BEGIN
  -- Add artificial delay to slow down enumeration attacks
  PERFORM pg_sleep(0.1);
  
  -- Check profiles table for similar faces
  FOR existing_descriptor IN SELECT face_descriptor FROM public.profiles WHERE face_descriptor IS NOT NULL
  LOOP
    -- Calculate Euclidean distance between descriptors
    SELECT SQRT(SUM(POWER(a.val - b.val, 2)))
    INTO distance
    FROM (SELECT unnest(_descriptor) as val, generate_subscripts(_descriptor, 1) as idx) a
    JOIN (SELECT unnest(existing_descriptor) as val, generate_subscripts(existing_descriptor, 1) as idx) b
    ON a.idx = b.idx;
    
    IF distance < _threshold THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;

-- Create function to check face similarity for credentials
CREATE OR REPLACE FUNCTION public.check_credential_face_similarity(
  _descriptor float8[],
  _threshold float8 DEFAULT 0.6
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_descriptor float8[];
  distance float8;
BEGIN
  -- Add artificial delay to slow down enumeration attacks
  PERFORM pg_sleep(0.1);
  
  -- Check credentials table for similar faces
  FOR existing_descriptor IN SELECT face_descriptor FROM public.credentials WHERE face_descriptor IS NOT NULL
  LOOP
    -- Calculate Euclidean distance between descriptors
    SELECT SQRT(SUM(POWER(a.val - b.val, 2)))
    INTO distance
    FROM (SELECT unnest(_descriptor) as val, generate_subscripts(_descriptor, 1) as idx) a
    JOIN (SELECT unnest(existing_descriptor) as val, generate_subscripts(existing_descriptor, 1) as idx) b
    ON a.idx = b.idx;
    
    IF distance < _threshold THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;