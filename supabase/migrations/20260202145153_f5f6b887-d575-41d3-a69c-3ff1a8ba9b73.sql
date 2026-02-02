-- Allow unauthenticated users to create analysis records (results still protected by token-based SELECT policy)

ALTER TABLE public.analysis_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'analysis_records'
      AND policyname = 'Anyone can create analysis records'
  ) THEN
    CREATE POLICY "Anyone can create analysis records"
    ON public.analysis_records
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;