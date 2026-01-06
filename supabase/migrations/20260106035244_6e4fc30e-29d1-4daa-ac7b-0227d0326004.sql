-- Remove the overly permissive policy that was just added (it exposes answers)
DROP POLICY IF EXISTS "Authenticated users can view questions for quiz" ON public.questions;

-- The SECURITY DEFINER functions (validate_quiz_answer and get_quiz_questions) 
-- will handle all student access to questions without exposing the correct_answer column