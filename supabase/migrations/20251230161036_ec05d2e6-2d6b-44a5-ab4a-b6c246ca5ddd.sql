-- Create credentials table for secure server-side storage (replacing localStorage)
CREATE TABLE public.credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_user_id UUID NOT NULL,
  citizen_address TEXT NOT NULL,
  issuer_user_id UUID NOT NULL,
  issuer_address TEXT NOT NULL,
  credential_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth TEXT,
  national_id TEXT NOT NULL,
  expiry_date TEXT,
  face_descriptor_hash TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT credentials_citizen_address_key UNIQUE (citizen_address)
);

-- Enable RLS
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Citizens can view their own credentials
CREATE POLICY "Citizens can view their own credential"
ON public.credentials
FOR SELECT
USING (auth.uid() = citizen_user_id);

-- Policy: Authorized issuers (admins) can insert credentials
CREATE POLICY "Admins can issue credentials"
ON public.credentials
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND 
  auth.uid() = issuer_user_id
);

-- Policy: Admins can view all credentials for verification
CREATE POLICY "Admins can view all credentials"
ON public.credentials
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Anyone can verify a credential by address (read-only, minimal data exposure via RPC)
-- We'll use an RPC function for public verification instead of direct table access

-- Create RPC function for public credential verification (returns only verification result)
CREATE OR REPLACE FUNCTION public.verify_credential(_citizen_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cred RECORD;
  result JSONB;
BEGIN
  SELECT * INTO cred
  FROM public.credentials
  WHERE citizen_address = _citizen_address;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'isValid', false,
      'error', 'No credential found for this address'
    );
  END IF;
  
  -- Check expiry
  IF cred.expiry_date IS NOT NULL AND cred.expiry_date::date < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'isValid', false,
      'error', 'Credential has expired',
      'credential', jsonb_build_object(
        'fullName', cred.full_name,
        'nationalId', cred.national_id,
        'dateOfBirth', cred.date_of_birth,
        'expiryDate', cred.expiry_date,
        'issuerAddress', cred.issuer_address,
        'issuedAt', cred.issued_at,
        'credentialHash', cred.credential_hash
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'isValid', true,
    'credential', jsonb_build_object(
      'fullName', cred.full_name,
      'nationalId', cred.national_id,
      'dateOfBirth', cred.date_of_birth,
      'expiryDate', cred.expiry_date,
      'issuerAddress', cred.issuer_address,
      'issuedAt', cred.issued_at,
      'credentialHash', cred.credential_hash
    )
  );
END;
$$;

-- Create RPC function to check if user is authorized issuer (admin)
CREATE OR REPLACE FUNCTION public.is_authorized_issuer(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(COALESCE(_user_id, auth.uid()), 'admin'::app_role)
$$;

-- Create RPC function to check if credential exists for address (for duplicate prevention)
CREATE OR REPLACE FUNCTION public.credential_exists_for_address(_address TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.credentials
    WHERE citizen_address = _address
  )
$$;

-- Create RPC function to check if face hash already exists (for duplicate prevention)
CREATE OR REPLACE FUNCTION public.credential_face_hash_exists(_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.credentials
    WHERE face_descriptor_hash = _hash
  )
$$;

-- Add timestamp trigger
CREATE TRIGGER update_credentials_updated_at
BEFORE UPDATE ON public.credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_credentials_citizen_address ON public.credentials(citizen_address);
CREATE INDEX idx_credentials_citizen_user_id ON public.credentials(citizen_user_id);
CREATE INDEX idx_credentials_face_hash ON public.credentials(face_descriptor_hash) WHERE face_descriptor_hash IS NOT NULL;