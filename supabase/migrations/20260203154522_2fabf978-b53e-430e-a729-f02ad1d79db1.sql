-- Fix security issue: Replace UUID access_token with cryptographically secure random token
-- Step 1: Drop policies that depend on the access_token column first
DROP POLICY IF EXISTS "Users can view records with valid token" ON public.analysis_records;

-- Step 2: Drop the old validate_access_token function (takes uuid parameter)
DROP FUNCTION IF EXISTS public.validate_access_token(uuid, uuid);

-- Step 3: Change access_token column type from uuid to text
ALTER TABLE public.analysis_records 
  ALTER COLUMN access_token TYPE text USING access_token::text;

-- Step 4: Update default to use cryptographically secure random bytes (32 bytes = 256 bits of entropy)
-- This is much more secure than UUID v4 (122 bits) and not predictable
ALTER TABLE public.analysis_records 
  ALTER COLUMN access_token SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- Step 5: Shorten expiration from 48 hours to 24 hours for better security
ALTER TABLE public.analysis_records 
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- Step 6: Remove unused user_email column to eliminate PII exposure risk
ALTER TABLE public.analysis_records 
  DROP COLUMN IF EXISTS user_email;

-- Step 7: Create updated validate_access_token function that works with text tokens
CREATE OR REPLACE FUNCTION public.validate_access_token(record_id uuid, token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.analysis_records
    WHERE id = record_id
      AND access_token = token
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Step 8: Recreate the RLS policy for token-based access
CREATE POLICY "Users can view records with valid token"
ON public.analysis_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    access_token = COALESCE(current_setting('app.access_token', true), '')
    AND (expires_at IS NULL OR expires_at > now())
  )
);