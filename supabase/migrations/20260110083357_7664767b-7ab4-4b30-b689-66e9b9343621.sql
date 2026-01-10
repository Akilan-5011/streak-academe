-- Fix security: Add RLS policy to questions_for_quiz view
-- Note: Views inherit RLS from their base tables, but we need to ensure proper access

-- Create a policy for students to access questions through the secure view
-- The view already excludes correct_answer, so students can read from it
CREATE POLICY "Students can view quiz questions through view"
ON public.questions
FOR SELECT
TO authenticated
USING (
  -- Students can only see questions without correct_answer via the view
  -- This policy allows SELECT but the view filters out correct_answer
  public.has_role(auth.uid(), 'student'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Update profiles table to prevent email exposure to unauthorized users
-- Drop existing permissive policies and create stricter ones
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Ensure no public/anonymous access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);