import { z } from 'zod';

// Question validation schema
export const questionSchema = z.object({
  question: z.string()
    .trim()
    .min(10, 'Question must be at least 10 characters')
    .max(500, 'Question must be less than 500 characters'),
  option_a: z.string()
    .trim()
    .min(1, 'Option A is required')
    .max(200, 'Option A must be less than 200 characters'),
  option_b: z.string()
    .trim()
    .min(1, 'Option B is required')
    .max(200, 'Option B must be less than 200 characters'),
  option_c: z.string()
    .trim()
    .min(1, 'Option C is required')
    .max(200, 'Option C must be less than 200 characters'),
  option_d: z.string()
    .trim()
    .min(1, 'Option D is required')
    .max(200, 'Option D must be less than 200 characters'),
  correct_answer: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Correct answer must be A, B, C, or D' })
  }),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' })
  }),
  subject_id: z.string().uuid('Invalid subject ID')
});

// Subject validation schema
export const subjectSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Subject name must be at least 2 characters')
    .max(100, 'Subject name must be less than 100 characters'),
  youtube_link: z.string()
    .trim()
    .url('Invalid YouTube URL')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? null : val)
});

// Assignment validation schema
export const assignmentSchema = z.object({
  title: z.string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .transform(val => val === '' ? null : val),
  subject_id: z.string().uuid('Invalid subject ID'),
  due_date: z.string()
    .min(1, 'Due date is required')
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date format')
});

// Assignment submission validation schema
export const submissionSchema = z.object({
  content: z.string()
    .trim()
    .max(10000, 'Submission must be less than 10000 characters')
    .optional()
    .default(''),
  assignment_id: z.string().uuid('Invalid assignment ID')
});

// Grade validation schema
export const gradeSchema = z.object({
  grade: z.number()
    .int('Grade must be a whole number')
    .min(0, 'Grade must be at least 0')
    .max(100, 'Grade must be at most 100'),
  feedback: z.string()
    .trim()
    .max(1000, 'Feedback must be less than 1000 characters')
    .optional()
    .transform(val => val === '' ? null : val)
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
