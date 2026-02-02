-- Drop existing restrictive policy and create permissive one for guest inserts
DROP POLICY IF EXISTS "Guests can insert analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Anyone can create analysis records" ON public.analysis_records;

CREATE POLICY "Guests can insert analysis records"
ON public.analysis_records
FOR INSERT
TO public
WITH CHECK (true);