-- Create analysis_records table to store resume analyses
CREATE TABLE public.analysis_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- User/Identify Information (optional for guest uploads)
  user_email TEXT,
  resume_file_name TEXT NOT NULL,
  resume_file_url TEXT NOT NULL,
  
  -- Input Data
  job_description TEXT NOT NULL,
  
  -- Analysis Results
  match_percentage FLOAT NOT NULL DEFAULT 0,
  extracted_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  improvement_tips TEXT[] DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE public.analysis_records ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert records (guest uploads allowed)
CREATE POLICY "Anyone can insert analysis records"
ON public.analysis_records
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view their own records by ID
CREATE POLICY "Anyone can view analysis records"
ON public.analysis_records
FOR SELECT
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_analysis_records_created_at ON public.analysis_records(created_at DESC);
CREATE INDEX idx_analysis_records_match_percentage ON public.analysis_records(match_percentage);

-- Create storage bucket for resume PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);

-- Storage policies for resume uploads
CREATE POLICY "Anyone can upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Anyone can view resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes');