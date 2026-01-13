import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { assignmentSchema, submissionSchema, gradeSchema } from '@/lib/validationSchemas';
import { 
  ArrowLeft, 
  Plus, 
  Calendar,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  Loader2,
  Trash2,
  Eye,
  File,
  Download,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

interface Subject {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject_id: string;
  due_date: string;
  created_at: string;
  subjects?: { name: string };
}

interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string;
  file_url: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  profiles?: { name: string; email: string };
}

const Assignments = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  
  // Admin: New assignment form
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    subject_id: '',
    due_date: ''
  });
  const [addingAssignment, setAddingAssignment] = useState(false);
  
  // Student: Submission form
  const [submissionContent, setSubmissionContent] = useState('');
  const [submittingTo, setSubmittingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Admin: View submissions
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  
  // Admin: Grading
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name');
    setSubjects(subjectsData || []);
    
    // Fetch assignments with subject names
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*, subjects(name)')
      .order('due_date', { ascending: true });
    setAssignments(assignmentsData || []);
    
    // Fetch my submissions (for students)
    if (user && !isAdmin) {
      const { data: mySubsData } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('user_id', user.id);
      
      const subsMap: Record<string, Submission> = {};
      (mySubsData || []).forEach(sub => {
        subsMap[sub.assignment_id] = sub;
      });
      setMySubmissions(subsMap);
    }
    
    setLoading(false);
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input with zod schema
    const validationResult = assignmentSchema.safeParse({
      title: newAssignment.title,
      description: newAssignment.description || undefined,
      subject_id: newAssignment.subject_id,
      due_date: newAssignment.due_date
    });
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Validation failed';
      toast({ title: "Validation Error", description: errorMessage, variant: "destructive" });
      return;
    }
    
    setAddingAssignment(true);
    
    const { error } = await supabase.from('assignments').insert({
      title: validationResult.data.title,
      description: validationResult.data.description,
      subject_id: validationResult.data.subject_id,
      due_date: new Date(validationResult.data.due_date).toISOString(),
      created_by: user!.id
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Assignment created successfully" });
      setNewAssignment({ title: '', description: '', subject_id: '', due_date: '' });
      fetchData();
    }
    
    setAddingAssignment(false);
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Assignment deleted" });
      fetchData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF only)
      if (file.type !== 'application/pdf') {
        toast({ title: "Error", description: "Only PDF files are allowed", variant: "destructive" });
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 10MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (assignmentId: string): Promise<string | null> => {
    if (!selectedFile || !user) return null;
    
    setUploadingFile(true);
    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${user.id}/${assignmentId}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('assignment-files')
      .upload(fileName, selectedFile);
    
    setUploadingFile(false);
    
    if (error) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('assignment-files')
      .getPublicUrl(fileName);
    
    return fileName; // Store the path, not public URL since bucket is private
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    // Validate input with zod schema
    const validationResult = submissionSchema.safeParse({
      content: submissionContent,
      assignment_id: assignmentId
    });
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Validation failed';
      toast({ title: "Validation Error", description: errorMessage, variant: "destructive" });
      return;
    }
    
    setSubmitting(true);
    
    // Upload file if selected
    let fileUrl: string | null = null;
    if (selectedFile) {
      fileUrl = await uploadFile(assignmentId);
      if (!fileUrl && selectedFile) {
        setSubmitting(false);
        return; // Upload failed
      }
    }
    
    const { error } = await supabase.from('assignment_submissions').insert({
      assignment_id: validationResult.data.assignment_id,
      user_id: user!.id,
      content: validationResult.data.content,
      file_url: fileUrl
    });
    
    if (error) {
      if (error.code === '23505') {
        toast({ title: "Error", description: "You have already submitted this assignment", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Success", description: "Assignment submitted successfully!" });
      setSubmissionContent('');
      setSelectedFile(null);
      setSubmittingTo(null);
      fetchData();
    }
    
    setSubmitting(false);
  };

  const fetchSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    setViewingSubmissions(assignmentId);
    
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*, profiles(name, email)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });
    
    setSubmissions(data || []);
    setLoadingSubmissions(false);
  };

  const handleGradeSubmission = async () => {
    if (!gradingSubmission) return;
    
    const grade = parseInt(gradeValue);
    
    // Validate input with zod schema
    const validationResult = gradeSchema.safeParse({
      grade: isNaN(grade) ? undefined : grade,
      feedback: feedbackValue || undefined
    });
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Validation failed';
      toast({ title: "Validation Error", description: errorMessage, variant: "destructive" });
      return;
    }
    
    const { error } = await supabase
      .from('assignment_submissions')
      .update({ 
        grade: validationResult.data.grade, 
        feedback: validationResult.data.feedback 
      })
      .eq('id', gradingSubmission.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Grade saved" });
      setGradingSubmission(null);
      setGradeValue('');
      setFeedbackValue('');
      if (viewingSubmissions) {
        fetchSubmissions(viewingSubmissions);
      }
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark neural-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" />
              Assignments
            </h1>
            <p className="text-muted-foreground text-sm">
              {isAdmin ? 'Manage assignments and grade submissions' : 'View and submit your assignments'}
            </p>
          </div>
        </div>

        {/* Admin: Add Assignment Form */}
        {isAdmin && (
          <Card className="glass cyber-border mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAssignment} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="Assignment title"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="bg-card/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select
                      value={newAssignment.subject_id}
                      onValueChange={(val) => setNewAssignment({ ...newAssignment, subject_id: val })}
                    >
                      <SelectTrigger className="bg-card/50">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Assignment description and instructions..."
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    className="bg-card/50"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="datetime-local"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    className="bg-card/50"
                  />
                </div>
                <Button type="submit" disabled={addingAssignment}>
                  {addingAssignment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Assignment
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{isAdmin ? 'All Assignments' : 'Your Assignments'}</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : assignments.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                No assignments yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignments.map((assignment) => {
                const overdue = isOverdue(assignment.due_date);
                const submitted = mySubmissions[assignment.id];
                
                return (
                  <Card key={assignment.id} className={`glass cyber-border ${overdue && !submitted ? 'border-destructive/50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{assignment.title}</h3>
                            {submitted && (
                              <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Submitted
                              </span>
                            )}
                            {overdue && !submitted && (
                              <span className="flex items-center gap-1 text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Subject: {assignment.subjects?.name || 'Unknown'}
                          </p>
                          {assignment.description && (
                            <p className="text-sm text-muted-foreground mb-3">{assignment.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>Due: {format(new Date(assignment.due_date), 'PPP p')}</span>
                          </div>
                          
                          {/* Show grade if submitted and graded */}
                          {submitted?.grade !== null && submitted?.grade !== undefined && (
                            <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                              <p className="font-semibold">Grade: {submitted.grade}/100</p>
                              {submitted.feedback && (
                                <p className="text-sm text-muted-foreground mt-1">Feedback: {submitted.feedback}</p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {/* Admin actions */}
                          {isAdmin && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => fetchSubmissions(assignment.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Submissions
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          
                          {/* Student submit button */}
                          {!isAdmin && !submitted && (
                            <Dialog open={submittingTo === assignment.id} onOpenChange={(open) => setSubmittingTo(open ? assignment.id : null)}>
                              <DialogTrigger asChild>
                                <Button size="sm">
                                  <Upload className="w-4 h-4 mr-1" />
                                  Submit
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Submit: {assignment.title}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Your Answer/Notes (Optional)</Label>
                                    <Textarea
                                      placeholder="Enter any notes or text answer here..."
                                      value={submissionContent}
                                      onChange={(e) => setSubmissionContent(e.target.value)}
                                      rows={4}
                                    />
                                  </div>
                                  
                                  {/* PDF Upload Section */}
                                  <div className="space-y-2">
                                    <Label>Upload PDF (Optional)</Label>
                                    <input
                                      type="file"
                                      ref={fileInputRef}
                                      accept=".pdf"
                                      onChange={handleFileSelect}
                                      className="hidden"
                                    />
                                    {selectedFile ? (
                                      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                        <File className="w-5 h-5 text-primary" />
                                        <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => setSelectedFile(null)}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => fileInputRef.current?.click()}
                                      >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Choose PDF File
                                      </Button>
                                    )}
                                    <p className="text-xs text-muted-foreground">Max file size: 10MB</p>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    onClick={() => handleSubmitAssignment(assignment.id)}
                                    disabled={submitting || uploadingFile || (!submissionContent.trim() && !selectedFile)}
                                  >
                                    {(submitting || uploadingFile) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {uploadingFile ? 'Uploading...' : 'Submit Assignment'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin: View Submissions Dialog */}
        <Dialog open={!!viewingSubmissions} onOpenChange={(open) => !open && setViewingSubmissions(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submissions</DialogTitle>
            </DialogHeader>
            {loadingSubmissions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No submissions yet</p>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <Card key={sub.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{sub.profiles?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{sub.profiles?.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(sub.submitted_at), 'PPP p')}
                        </span>
                      </div>
                      {sub.content && (
                        <p className="text-sm bg-muted/50 p-3 rounded mb-3 whitespace-pre-wrap">{sub.content}</p>
                      )}
                      
                      {/* Show PDF download button if file was uploaded */}
                      {sub.file_url && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-primary/10 rounded">
                          <File className="w-4 h-4 text-primary" />
                          <span className="text-sm">PDF Attached</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('assignment-files')
                                .createSignedUrl(sub.file_url!, 60);
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              } else {
                                toast({ title: "Error", description: "Could not generate download link", variant: "destructive" });
                              }
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            View PDF
                          </Button>
                        </div>
                      )}
                      
                      {sub.grade !== null ? (
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-primary">Grade: {sub.grade}/100</span>
                          {sub.feedback && <span className="text-sm text-muted-foreground">"{sub.feedback}"</span>}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setGradingSubmission(sub);
                              setGradeValue(String(sub.grade));
                              setFeedbackValue(sub.feedback || '');
                            }}
                          >
                            Edit Grade
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setGradingSubmission(sub);
                            setGradeValue('');
                            setFeedbackValue('');
                          }}
                        >
                          Grade Submission
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Grading Dialog */}
        <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grade Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Grade (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  placeholder="Enter grade"
                />
              </div>
              <div className="space-y-2">
                <Label>Feedback (optional)</Label>
                <Textarea
                  value={feedbackValue}
                  onChange={(e) => setFeedbackValue(e.target.value)}
                  placeholder="Provide feedback for the student..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGradeSubmission}>
                Save Grade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Assignments;
