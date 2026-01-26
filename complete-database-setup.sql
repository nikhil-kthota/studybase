-- Complete StudyBase Database Setup
-- Run this entire file in your Supabase SQL editor

-- ===========================================
-- PART 1: MAIN DATABASE SCHEMA
-- ===========================================

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bases" ON bases;
DROP POLICY IF EXISTS "Users can insert their own bases" ON bases;
DROP POLICY IF EXISTS "Users can update their own bases" ON bases;
DROP POLICY IF EXISTS "Users can delete their own bases" ON bases;

DROP POLICY IF EXISTS "Users can view files from their bases" ON base_files;
DROP POLICY IF EXISTS "Users can insert files to their bases" ON base_files;
DROP POLICY IF EXISTS "Users can update files in their bases" ON base_files;
DROP POLICY IF EXISTS "Users can delete files from their bases" ON base_files;

DROP POLICY IF EXISTS "Users can view text content from their files" ON pdf_text_content;
DROP POLICY IF EXISTS "Users can insert text content for their files" ON pdf_text_content;
DROP POLICY IF EXISTS "Users can update text content for their files" ON pdf_text_content;
DROP POLICY IF EXISTS "Users can delete text content from their files" ON pdf_text_content;

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

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

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

-- ===========================================
-- PART 2: CHAT DATABASE SCHEMA
-- ===========================================

-- Create chats table to store chat sessions
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  base_id UUID REFERENCES bases(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES base_files(id) ON DELETE CASCADE,
  chat_name VARCHAR(255) NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create chat_messages table to store individual messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'ai', 'error', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_base_id ON chats(base_id);
CREATE INDEX IF NOT EXISTS idx_chats_file_id ON chats(file_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing chat policies if they exist
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;

DROP POLICY IF EXISTS "Users can view messages from their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can update messages in their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete messages from their chats" ON chat_messages;

-- RLS Policies for chats table
CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for chat_messages table
CREATE POLICY "Users can view messages from their chats" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their chats" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their chats" ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their chats" ON chat_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

-- ===========================================
-- PART 3: QUIZ DATABASE SCHEMA
-- ===========================================

-- Create quizzes table to store quiz sessions
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_name VARCHAR(255) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  total_mcqs INTEGER NOT NULL DEFAULT 0,
  total_saqs INTEGER NOT NULL DEFAULT 0,
  total_laqs INTEGER NOT NULL DEFAULT 0,
  total_marks INTEGER NOT NULL DEFAULT 0, -- calculated: mcqs*1 + saqs*3 + laqs*5
  marks_obtained INTEGER DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create quiz_sources table (many-to-many for quiz-file relationship)
CREATE TABLE IF NOT EXISTS quiz_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES base_files(id) ON DELETE CASCADE NOT NULL,
  base_id UUID REFERENCES bases(id) ON DELETE CASCADE NOT NULL
);

-- Create quiz_questions table to store individual questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_type VARCHAR(10) NOT NULL CHECK (question_type IN ('mcq', 'saq', 'laq')),
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB DEFAULT NULL, -- for MCQs: {"1": "text", "2": "text", "3": "text", "4": "text"}
  correct_answer TEXT NOT NULL,
  correct_option_number INTEGER DEFAULT NULL, -- for MCQs only
  explanation TEXT NOT NULL,
  marks INTEGER NOT NULL CHECK (marks IN (1, 3, 5)) -- 1 for MCQ, 3 for SAQ, 5 for LAQ
);

-- Create quiz_answers table to store user answers
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  marks_obtained INTEGER DEFAULT 0,
  similarity_score DECIMAL(5,2) DEFAULT NULL, -- for SAQs/LAQs
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sources_quiz_id ON quiz_sources(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sources_file_id ON quiz_sources(file_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_type ON quiz_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz_id ON quiz_answers(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers(question_id);

-- Enable Row Level Security (RLS)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Drop existing quiz policies if they exist
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can insert their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;

DROP POLICY IF EXISTS "Users can view sources from their quizzes" ON quiz_sources;
DROP POLICY IF EXISTS "Users can insert sources to their quizzes" ON quiz_sources;
DROP POLICY IF EXISTS "Users can delete sources from their quizzes" ON quiz_sources;

DROP POLICY IF EXISTS "Users can view questions from their quizzes" ON quiz_questions;
DROP POLICY IF EXISTS "Users can insert questions to their quizzes" ON quiz_questions;
DROP POLICY IF EXISTS "Users can update questions in their quizzes" ON quiz_questions;
DROP POLICY IF EXISTS "Users can delete questions from their quizzes" ON quiz_questions;

DROP POLICY IF EXISTS "Users can view answers from their quizzes" ON quiz_answers;
DROP POLICY IF EXISTS "Users can insert answers to their quizzes" ON quiz_answers;
DROP POLICY IF EXISTS "Users can update answers in their quizzes" ON quiz_answers;
DROP POLICY IF EXISTS "Users can delete answers from their quizzes" ON quiz_answers;

-- RLS Policies for quizzes table
CREATE POLICY "Users can view their own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for quiz_sources table
CREATE POLICY "Users can view sources from their quizzes" ON quiz_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_sources.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sources to their quizzes" ON quiz_sources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_sources.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sources from their quizzes" ON quiz_sources
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_sources.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- RLS Policies for quiz_questions table
CREATE POLICY "Users can view questions from their quizzes" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions to their quizzes" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions in their quizzes" ON quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions from their quizzes" ON quiz_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- RLS Policies for quiz_answers table
CREATE POLICY "Users can view answers from their quizzes" ON quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_answers.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert answers to their quizzes" ON quiz_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_answers.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update answers in their quizzes" ON quiz_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_answers.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete answers from their quizzes" ON quiz_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_answers.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- ===========================================
-- PART 4: FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function to automatically calculate total marks
CREATE OR REPLACE FUNCTION calculate_quiz_total_marks()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_marks = (NEW.total_mcqs * 1) + (NEW.total_saqs * 3) + (NEW.total_laqs * 5);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically calculate total marks
CREATE TRIGGER calculate_quiz_marks 
  BEFORE INSERT OR UPDATE ON quizzes 
  FOR EACH ROW 
  EXECUTE FUNCTION calculate_quiz_total_marks();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on chats table
CREATE TRIGGER update_chats_updated_at 
  BEFORE UPDATE ON chats 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get quiz statistics for a user
-- Drop existing function first if it exists
DROP FUNCTION IF EXISTS get_user_quiz_stats(UUID);

CREATE OR REPLACE FUNCTION get_user_quiz_stats(user_uuid UUID)
RETURNS TABLE (
  total_quizzes BIGINT,
  total_questions_attempted BIGINT,
  average_percentage DECIMAL,
  total_marks_obtained BIGINT,
  total_possible_marks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Count all quizzes (including in-progress, ready, etc.)
    (SELECT COUNT(*) FROM quizzes WHERE user_id = user_uuid) as total_quizzes,
    -- Count all questions attempted
    COUNT(qa.id) as total_questions_attempted,
    -- Average percentage only from completed quizzes
    AVG(CASE WHEN q.status = 'completed' THEN q.percentage ELSE NULL END) as average_percentage,
    -- Sum marks only from completed quizzes
    SUM(CASE WHEN q.status = 'completed' THEN q.marks_obtained ELSE 0 END) as total_marks_obtained,
    -- Sum total marks only from completed quizzes
    SUM(CASE WHEN q.status = 'completed' THEN q.total_marks ELSE 0 END) as total_possible_marks
  FROM quizzes q
  LEFT JOIN quiz_answers qa ON q.id = qa.quiz_id
  WHERE q.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent quiz performance (last 3 quizzes)
-- Drop existing function first if it exists
DROP FUNCTION IF EXISTS get_recent_quiz_performance(UUID);

CREATE OR REPLACE FUNCTION get_recent_quiz_performance(user_uuid UUID)
RETURNS TABLE (
  quiz_id UUID,
  quiz_name VARCHAR,
  percentage DECIMAL,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as quiz_id,
    q.quiz_name,
    q.percentage,
    q.completed_at
  FROM quizzes q
  WHERE q.user_id = user_uuid 
    AND q.status = 'completed'
  ORDER BY q.completed_at DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store PDF text content (bypasses RLS issues)
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

-- ===========================================
-- PART 5: GRANT PERMISSIONS
-- ===========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON bases TO authenticated;
GRANT ALL ON base_files TO authenticated;
GRANT ALL ON pdf_text_content TO authenticated;
GRANT ALL ON chats TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON quizzes TO authenticated;
GRANT ALL ON quiz_sources TO authenticated;
GRANT ALL ON quiz_questions TO authenticated;
GRANT ALL ON quiz_answers TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quiz_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_quiz_performance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION store_pdf_text_content(UUID, TEXT, INTEGER, VARCHAR) TO authenticated;

-- ===========================================
-- COMPLETION MESSAGE
-- ===========================================

-- Success message
SELECT 'StudyBase database setup completed successfully!' as message;
