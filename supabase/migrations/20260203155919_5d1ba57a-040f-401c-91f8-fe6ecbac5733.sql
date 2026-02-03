-- Fix the INSERT policy for analysis_records to be PERMISSIVE
-- so that guest users can insert records

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Guests can insert analysis records" ON public.analysis_records;

-- Create a new PERMISSIVE policy for inserts
CREATE POLICY "Allow public insert for analysis records"
ON public.analysis_records
FOR INSERT
TO public
WITH CHECK (true);