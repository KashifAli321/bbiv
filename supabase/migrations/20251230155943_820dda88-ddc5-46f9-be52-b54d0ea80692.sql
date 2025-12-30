-- Add function to check if wallet address is already linked
CREATE OR REPLACE FUNCTION public.wallet_address_exists(_address TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE wallet_address = _address
  )
$$;

-- Add index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address);