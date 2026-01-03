-- Add revocation tracking to credentials table
ALTER TABLE public.credentials 
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS revoked_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS revocation_tx_hash TEXT DEFAULT NULL;

-- Create index for efficient revocation queries
CREATE INDEX IF NOT EXISTS idx_credentials_revoked ON public.credentials(revoked_at) WHERE revoked_at IS NOT NULL;