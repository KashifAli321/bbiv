-- Create a function to look up user_id by wallet address (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_id_by_wallet(_wallet_address text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  SELECT user_id INTO found_user_id
  FROM public.profiles
  WHERE LOWER(wallet_address) = LOWER(_wallet_address);
  
  RETURN found_user_id;
END;
$$;