-- StudyBase Database Schema
-- Run these commands in your Supabase SQL editor

-- Create bases table
CREATE TABLE IF NOT EXISTS bases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create base_files table
CREATE TABLE IF NOT EXISTS base_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pdf_text_content table for storing extracted text
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bases_user_id ON bases(user_id);
CREATE INDEX IF NOT EXISTS idx_base_files_base_id ON base_files(base_id);
CREATE INDEX IF NOT EXISTS idx_pdf_text_content_file_id ON pdf_text_content(file_id);
CREATE INDEX IF NOT EXISTS idx_pdf_text_content_status ON pdf_text_content(status);

-- Enable Row Level Security (RLS)
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_text_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bases table
CREATE POLICY "Users can view their own bases" ON bases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bases" ON bases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bases" ON bases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bases" ON bases
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for base_files table
CREATE POLICY "Users can view files from their bases" ON base_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files to their bases" ON base_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update files in their bases" ON base_files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files from their bases" ON base_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );

-- Create RLS policies for pdf_text_content table
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

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload files to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );