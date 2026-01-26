-- Fix Dashboard Statistics Function
-- Run this in your Supabase SQL editor to fix the hardcoded statistics issue

-- Drop and recreate the function with proper logic
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_quiz_stats(UUID) TO authenticated;

-- Test the function (optional - you can run this to verify it works)
-- SELECT * FROM get_user_quiz_stats('your-user-id-here');
