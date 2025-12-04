-- Create certificates table to store earned certificates
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  image_url TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_type)
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates"
ON public.certificates
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own certificates
CREATE POLICY "Users can insert own certificates"
ON public.certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own certificates (for storing generated image)
CREATE POLICY "Users can update own certificates"
ON public.certificates
FOR UPDATE
USING (auth.uid() = user_id);