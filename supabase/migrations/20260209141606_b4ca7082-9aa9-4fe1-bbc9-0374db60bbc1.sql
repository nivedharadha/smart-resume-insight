
-- Drop all existing policies on analysis_records
DROP POLICY IF EXISTS "Admins can delete analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Admins can view all analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Allow public insert for analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Users can view records with valid token" ON public.analysis_records;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Allow public insert for analysis records"
ON public.analysis_records
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view records with valid token"
ON public.analysis_records
FOR SELECT
TO public
USING (
  (access_token = COALESCE(current_setting('app.access_token', true), ''))
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Admins can view all analysis records"
ON public.analysis_records
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete analysis records"
ON public.analysis_records
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
