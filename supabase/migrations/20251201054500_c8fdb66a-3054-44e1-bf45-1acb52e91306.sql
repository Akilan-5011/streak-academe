-- Create badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Create attempt_details table for review mode
CREATE TABLE public.attempt_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add daily_xp_goal to profiles
ALTER TABLE public.profiles ADD COLUMN daily_xp_goal INTEGER DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN daily_xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN last_xp_reset_date DATE DEFAULT CURRENT_DATE;

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
CREATE POLICY "Users can view own badges"
  ON public.badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON public.badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for attempt_details
CREATE POLICY "Users can view own attempt details"
  ON public.attempt_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE attempts.id = attempt_details.attempt_id
      AND attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own attempt details"
  ON public.attempt_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE attempts.id = attempt_details.attempt_id
      AND attempts.user_id = auth.uid()
    )
  );