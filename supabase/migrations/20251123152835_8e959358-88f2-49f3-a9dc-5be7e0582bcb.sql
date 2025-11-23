-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 1,
  last_login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_quiz_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on subjects (public read)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subjects"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on questions (public read)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

-- Create attempts table
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_quiz', 'exam')),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  time_taken INTEGER NOT NULL, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on attempts
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
  ON public.attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON public.attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Student'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample subjects
INSERT INTO public.subjects (name) VALUES
  ('Mathematics'),
  ('Physics'),
  ('English');

-- Insert sample questions for Mathematics
INSERT INTO public.questions (question, option_a, option_b, option_c, option_d, correct_answer, subject_id)
SELECT 
  q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer,
  (SELECT id FROM public.subjects WHERE name = 'Mathematics')
FROM (VALUES
  ('What is 15 + 27?', '40', '42', '41', '43', 'B'),
  ('What is the square root of 144?', '10', '11', '12', '13', 'C'),
  ('What is 8 × 9?', '72', '81', '63', '54', 'A'),
  ('What is 100 ÷ 4?', '20', '25', '30', '15', 'B'),
  ('What is 2³?', '6', '8', '9', '4', 'B'),
  ('What is 50% of 200?', '50', '75', '100', '150', 'C'),
  ('What is the value of π (pi) approximately?', '2.14', '3.14', '4.14', '5.14', 'B'),
  ('What is 15²?', '200', '215', '225', '235', 'C'),
  ('What is 7 × 6?', '36', '42', '48', '54', 'B'),
  ('What is 144 ÷ 12?', '10', '11', '12', '13', 'C'),
  ('What is 25 + 38?', '63', '62', '61', '64', 'A'),
  ('What is 9³?', '729', '81', '243', '512', 'A'),
  ('What is 1000 - 347?', '653', '663', '643', '633', 'A'),
  ('What is 18 × 5?', '80', '85', '90', '95', 'C'),
  ('What is 75% of 80?', '50', '55', '60', '65', 'C'),
  ('What is √81?', '7', '8', '9', '10', 'C'),
  ('What is 3 + 4 × 2?', '14', '11', '10', '12', 'B'),
  ('What is 48 ÷ 6?', '6', '7', '8', '9', 'C'),
  ('What is 11 × 11?', '111', '121', '131', '141', 'B'),
  ('What is 200 ÷ 5?', '30', '35', '40', '45', 'C')
) AS q(question, option_a, option_b, option_c, option_d, correct_answer);

-- Insert sample questions for Physics
INSERT INTO public.questions (question, option_a, option_b, option_c, option_d, correct_answer, subject_id)
SELECT 
  q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer,
  (SELECT id FROM public.subjects WHERE name = 'Physics')
FROM (VALUES
  ('What is the speed of light in vacuum?', '3 × 10⁸ m/s', '2 × 10⁸ m/s', '4 × 10⁸ m/s', '5 × 10⁸ m/s', 'A'),
  ('What is the unit of force?', 'Joule', 'Newton', 'Watt', 'Pascal', 'B'),
  ('What is the formula for kinetic energy?', 'mgh', '½mv²', 'mv', 'ma', 'B'),
  ('What is the acceleration due to gravity on Earth?', '8.8 m/s²', '9.8 m/s²', '10.8 m/s²', '11.8 m/s²', 'B'),
  ('What is the SI unit of electric current?', 'Volt', 'Ohm', 'Ampere', 'Watt', 'C'),
  ('What type of energy does a moving object have?', 'Potential', 'Kinetic', 'Thermal', 'Chemical', 'B'),
  ('What is the law of inertia also known as?', 'Newton''s First Law', 'Newton''s Second Law', 'Newton''s Third Law', 'Law of Gravity', 'A'),
  ('What is the unit of electric resistance?', 'Ampere', 'Volt', 'Ohm', 'Watt', 'C'),
  ('What happens to the wavelength when frequency increases?', 'Increases', 'Decreases', 'Stays same', 'Doubles', 'B'),
  ('What is the unit of power?', 'Joule', 'Newton', 'Watt', 'Pascal', 'C'),
  ('What is the formula for potential energy?', '½mv²', 'mgh', 'mv', 'ma', 'B'),
  ('What is the SI unit of pressure?', 'Newton', 'Pascal', 'Joule', 'Watt', 'B'),
  ('What is the speed of sound in air approximately?', '340 m/s', '440 m/s', '540 m/s', '640 m/s', 'A'),
  ('What force opposes motion?', 'Gravity', 'Friction', 'Tension', 'Normal', 'B'),
  ('What is Ohm''s Law?', 'V = IR', 'F = ma', 'E = mc²', 'P = VI', 'A'),
  ('What type of lens converges light rays?', 'Concave', 'Convex', 'Plano', 'Diverging', 'B'),
  ('What is the unit of frequency?', 'Hertz', 'Joule', 'Newton', 'Watt', 'A'),
  ('What is the charge of a proton?', 'Negative', 'Neutral', 'Positive', 'Variable', 'C'),
  ('What is the acceleration formula?', 'a = v/t', 'a = Δv/Δt', 'a = d/t', 'a = F/v', 'B'),
  ('What energy is stored in a battery?', 'Kinetic', 'Potential', 'Chemical', 'Thermal', 'C')
) AS q(question, option_a, option_b, option_c, option_d, correct_answer);

-- Insert sample questions for English
INSERT INTO public.questions (question, option_a, option_b, option_c, option_d, correct_answer, subject_id)
SELECT 
  q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer,
  (SELECT id FROM public.subjects WHERE name = 'English')
FROM (VALUES
  ('Which word is a noun?', 'Run', 'Quickly', 'Beautiful', 'Happiness', 'D'),
  ('What is the plural of "child"?', 'Childs', 'Children', 'Childes', 'Childrens', 'B'),
  ('Which sentence is correct?', 'She don''t like it', 'She doesn''t like it', 'She not like it', 'She no like it', 'B'),
  ('What is a synonym for "happy"?', 'Sad', 'Angry', 'Joyful', 'Tired', 'C'),
  ('What is an antonym for "hot"?', 'Warm', 'Cold', 'Cool', 'Freezing', 'B'),
  ('Which is a verb?', 'Book', 'Run', 'Blue', 'Quickly', 'B'),
  ('What is the past tense of "go"?', 'Goed', 'Gone', 'Went', 'Going', 'C'),
  ('Which word is an adjective?', 'Quickly', 'Beautiful', 'Run', 'Happiness', 'B'),
  ('What is a compound word?', 'Beautiful', 'Sunshine', 'Running', 'Quickly', 'B'),
  ('Which sentence uses correct punctuation?', 'Hello how are you', 'Hello, how are you?', 'Hello how are you.', 'Hello how, are you', 'B'),
  ('What is the plural of "mouse"?', 'Mouses', 'Mice', 'Mices', 'Mousies', 'B'),
  ('Which is a pronoun?', 'Book', 'She', 'Run', 'Happy', 'B'),
  ('What is the superlative form of "good"?', 'Gooder', 'Goodest', 'Better', 'Best', 'D'),
  ('Which word is an adverb?', 'Quick', 'Quickly', 'Quickness', 'Quicked', 'B'),
  ('What is a metaphor?', 'Like or as comparison', 'Direct comparison', 'Sound words', 'Exaggeration', 'B'),
  ('Which sentence is in passive voice?', 'I ate the cake', 'The cake was eaten', 'I am eating', 'I will eat', 'B'),
  ('What is the past participle of "eat"?', 'Ate', 'Eaten', 'Eating', 'Eated', 'B'),
  ('Which is a conjunction?', 'The', 'And', 'Run', 'Beautiful', 'B'),
  ('What is alliteration?', 'Repeated consonant sounds', 'Rhyming words', 'Comparison', 'Exaggeration', 'A'),
  ('Which sentence is imperative?', 'He is running', 'Close the door', 'Is it raining?', 'What a day!', 'B')
) AS q(question, option_a, option_b, option_c, option_d, correct_answer);