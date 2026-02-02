-- Drop the restrictive policy
DROP POLICY IF EXISTS "Guests can insert analysis records" ON public.analysis_records;

-- Create a PERMISSIVE policy for guest inserts
CREATE POLICY "Guests can insert analysis records"
ON public.analysis_records
FOR INSERT
TO anon, authenticated
WITH CHECK (true);