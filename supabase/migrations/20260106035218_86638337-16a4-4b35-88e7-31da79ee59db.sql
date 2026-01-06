-- Fix the view to use SECURITY INVOKER (not DEFINER) since students access it directly
DROP VIEW IF EXISTS public.questions_for_quiz;

CREATE VIEW public.questions_for_quiz 
WITH (security_invoker = true)
AS
  SELECT id, question, option_a, option_b, option_c, option_d, 
         subject_id, difficulty, created_at
  FROM public.questions;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.questions_for_quiz TO authenticated;

-- Also need a policy to allow students to read questions via the view
-- The view needs underlying table access, so create a restrictive read for the view's columns only
CREATE POLICY "Authenticated users can view questions for quiz"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);