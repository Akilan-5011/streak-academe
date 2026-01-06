-- Fix 1: Restrict questions table access to admins only, create a view for students

-- Drop the permissive policy that exposes answers
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

-- Create admin-only policy for full question access
CREATE POLICY "Admins can view all questions"
  ON public.questions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create a view that excludes correct_answer for students
CREATE OR REPLACE VIEW public.questions_for_quiz AS
  SELECT id, question, option_a, option_b, option_c, option_d, 
         subject_id, difficulty, created_at
  FROM public.questions;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.questions_for_quiz TO authenticated;

-- Create a SECURITY DEFINER function to validate answers server-side
CREATE OR REPLACE FUNCTION public.validate_quiz_answer(
  p_question_id UUID,
  p_user_answer TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_answer TEXT;
BEGIN
  SELECT correct_answer INTO v_correct_answer
  FROM public.questions
  WHERE id = p_question_id;
  
  IF v_correct_answer IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_correct_answer = p_user_answer;
END;
$$;

-- Create a function to get questions for quiz (without answers)
CREATE OR REPLACE FUNCTION public.get_quiz_questions(
  p_difficulty TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  subject_id UUID,
  difficulty TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d,
         q.subject_id, q.difficulty, q.created_at
  FROM public.questions q
  WHERE (p_difficulty IS NULL OR q.difficulty = p_difficulty)
  ORDER BY random()
  LIMIT p_limit;
END;
$$;