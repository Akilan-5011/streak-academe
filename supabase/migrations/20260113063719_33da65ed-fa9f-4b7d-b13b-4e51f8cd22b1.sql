-- Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignment-files', 'assignment-files', false);

-- Policy: Students can upload files to their own folder
CREATE POLICY "Students can upload their assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Students can view their own files
CREATE POLICY "Students can view their own assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Admins can view all assignment files
CREATE POLICY "Admins can view all assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Policy: Students can update their own files
CREATE POLICY "Students can update their own assignment files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Students can delete their own files
CREATE POLICY "Students can delete their own assignment files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);