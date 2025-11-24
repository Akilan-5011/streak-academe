-- Add difficulty column to questions table
ALTER TABLE public.questions 
ADD COLUMN difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Update existing questions with random difficulties for demo
UPDATE public.questions 
SET difficulty = (
  CASE 
    WHEN random() < 0.33 THEN 'easy'
    WHEN random() < 0.66 THEN 'medium'
    ELSE 'hard'
  END
);