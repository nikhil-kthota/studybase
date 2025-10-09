-- Fix for PDF Text Content RLS Policy Error
-- Run these commands in your Supabase SQL editor

-- First, check if the table exists and drop existing policies
DROP POLICY IF EXISTS "Users can view text content from their files" ON pdf_text_content;
DROP POLICY IF EXISTS "Users can insert text content for their files" ON pdf_text_content;
DROP POLICY IF EXISTS "Users can update text content for their files" ON pdf_text_content;
DROP POLICY IF EXISTS "Users can delete text content from their files" ON pdf_text_content;

-- Ensure the table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS pdf_text_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES base_files(id) ON DELETE CASCADE,
  extracted_text TEXT,
  text_length INTEGER DEFAULT 0,
  extraction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure RLS is enabled
ALTER TABLE pdf_text_content ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pdf_text_content_file_id ON pdf_text_content(file_id);
CREATE INDEX IF NOT EXISTS idx_pdf_text_content_status ON pdf_text_content(status);

-- Recreate the RLS policies with proper syntax
CREATE POLICY "Users can view text content from their files" ON pdf_text_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM base_files 
      JOIN bases ON bases.id = base_files.base_id
      WHERE base_files.id = pdf_text_content.file_id 
      AND bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert text content for their files" ON pdf_text_content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM base_files 
      JOIN bases ON bases.id = base_files.base_id
      WHERE base_files.id = pdf_text_content.file_id 
      AND bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update text content for their files" ON pdf_text_content
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM base_files 
      JOIN bases ON bases.id = base_files.base_id
      WHERE base_files.id = pdf_text_content.file_id 
      AND bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete text content from their files" ON pdf_text_content
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM base_files 
      JOIN bases ON bases.id = base_files.base_id
      WHERE base_files.id = pdf_text_content.file_id 
      AND bases.user_id = auth.uid()
    )
  );

-- Test the policies by checking if they exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'pdf_text_content';

-- Optional: Create a function to test RLS policies
CREATE OR REPLACE FUNCTION test_pdf_text_content_access(file_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM base_files 
    JOIN bases ON bases.id = base_files.base_id
    WHERE base_files.id = file_uuid 
    AND bases.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to store PDF text content (bypasses RLS issues)
CREATE OR REPLACE FUNCTION store_pdf_text_content(
  p_file_id UUID,
  p_extracted_text TEXT,
  p_text_length INTEGER,
  p_status VARCHAR(20)
)
RETURNS VOID AS $$
BEGIN
  -- Verify the file belongs to the current user
  IF NOT EXISTS (
    SELECT 1 FROM base_files 
    JOIN bases ON bases.id = base_files.base_id
    WHERE base_files.id = p_file_id 
    AND bases.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: File does not belong to current user';
  END IF;

  -- Insert or update the text content
  INSERT INTO pdf_text_content (
    file_id,
    extracted_text,
    text_length,
    extraction_date,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_file_id,
    p_extracted_text,
    p_text_length,
    NOW(),
    p_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (file_id) 
  DO UPDATE SET
    extracted_text = EXCLUDED.extracted_text,
    text_length = EXCLUDED.text_length,
    extraction_date = EXCLUDED.extraction_date,
    status = EXCLUDED.status,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
