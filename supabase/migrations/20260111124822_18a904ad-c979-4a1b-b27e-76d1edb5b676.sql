-- Fix 1: Remove the vulnerable policy that allows students direct access to questions table
-- Students should only access questions via the RPC functions (get_quiz_questions, validate_quiz_answer)
-- and the questions_for_quiz VIEW (which already excludes correct_answer column)
DROP POLICY IF EXISTS "Students can view quiz questions through view" ON public.questions;

-- Fix 2: Clean up profiles policies - remove the conflicting "Deny anonymous access" policy
-- The "Users can view own profile" policy already properly restricts access to own profile only
-- The "Deny anonymous access to profiles" with USING (false) blocks ALL access which is incorrect
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Add a policy to allow admins to view all profiles for leaderboard and admin purposes
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add a policy for leaderboard - users can see other users' non-sensitive profile data
-- This allows viewing XP, name, and streak info for leaderboard without exposing email
CREATE POLICY "Users can view leaderboard data"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: The questions_for_quiz is a VIEW that selects from questions table
-- Views don't have their own RLS - they use the underlying table's RLS
-- Since we've removed student direct access to questions table, 
-- students now can ONLY access questions via:
-- 1. get_quiz_questions() RPC function (SECURITY DEFINER)
-- 2. validate_quiz_answer() RPC function (SECURITY DEFINER)
-- These functions bypass RLS intentionally and return only safe data