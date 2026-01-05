-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  grade INTEGER,
  feedback TEXT,
  UNIQUE(assignment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Admins can insert assignments" ON public.assignments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update assignments" ON public.assignments FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete assignments" ON public.assignments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Submissions policies
CREATE POLICY "Users can view own submissions" ON public.assignment_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all submissions" ON public.assignment_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can submit assignments" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own submissions" ON public.assignment_submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update submissions" ON public.assignment_submissions FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Add admin role for nakilanc00@gmail.com (will be applied on signup via trigger)