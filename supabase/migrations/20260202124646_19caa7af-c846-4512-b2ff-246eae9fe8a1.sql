-- 1. Create set_config RPC function for token-based session access
CREATE OR REPLACE FUNCTION public.set_config(
  setting_name text,
  setting_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_config(text, text) TO authenticated, anon;

-- 2. Fix RLS policy for analysis_records - replace overly permissive policy with token-based access
DROP POLICY IF EXISTS "Allow token validation queries" ON public.analysis_records;

CREATE POLICY "Users can view records with valid token"
ON public.analysis_records
FOR SELECT
USING (
  -- Admins can view all
  has_role(auth.uid(), 'admin'::app_role)
  -- Or anyone with valid token in session
  OR (
    access_token::text = COALESCE(current_setting('app.access_token', true), '')
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- 3. Fix storage policy - use server-side upload via edge function instead
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated resume uploads" ON storage.objects;

-- Create a restrictive policy that only allows service role uploads
-- Guests will upload via edge function that uses service role
CREATE POLICY "Only service role can upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' 
  AND auth.role() = 'service_role'
);

-- 4. Create rate_limits table for edge function rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(identifier, action, timestamp);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate_limits
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. Create cleanup function for old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE timestamp < now() - interval '24 hours';
END;
$$;