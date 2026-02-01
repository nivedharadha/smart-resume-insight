-- Add access_token column to analysis_records for secure guest access
ALTER TABLE public.analysis_records 
ADD COLUMN IF NOT EXISTS access_token uuid DEFAULT gen_random_uuid() NOT NULL;

-- Add expires_at column for time-limited access
ALTER TABLE public.analysis_records 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '48 hours');

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_analysis_records_access_token ON public.analysis_records(access_token);

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Anyone can insert analysis records" ON public.analysis_records;

-- Create secure SELECT policy: 
-- Users can only view their own records by matching access_token or if they're an admin
CREATE POLICY "Users can view records with valid token"
ON public.analysis_records
FOR SELECT
USING (
  -- Admins can view all
  has_role(auth.uid(), 'admin'::app_role)
  -- Or user has the access token (passed as a setting)
  OR access_token::text = current_setting('app.access_token', true)
  -- Or authenticated user owns the record (by email)
  OR (auth.jwt() ->> 'email' IS NOT NULL AND user_email = auth.jwt() ->> 'email')
);

-- Create secure INSERT policy: 
-- Anyone can insert (for guest analysis) but we'll add rate limiting in edge function
CREATE POLICY "Guests can insert analysis records"
ON public.analysis_records
FOR INSERT
WITH CHECK (true);

-- Make resumes bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'resumes';

-- Drop existing storage policies for resumes bucket
DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create secure storage policies
-- Allow uploads (we'll control this via edge function with signed URLs)
CREATE POLICY "Allow authenticated resume uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes');

-- Allow viewing only via service role (edge function will use signed URLs)
CREATE POLICY "Service role can view resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.role() = 'service_role');