import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  BookOpen, 
  HelpCircle, 
  Youtube,
  Shield,
  Loader2,
  ShieldX
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Subject {
  id: string;
  name: string;
  youtube_link: string | null;
}

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: string;
  subject_id: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  
  // New subject form
  const [newSubject, setNewSubject] = useState({ name: '', youtube_link: '' });
  const [addingSubject, setAddingSubject] = useState(false);
  
  // New question form
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    difficulty: 'medium',
    subject_id: ''
  });
  const [addingQuestion, setAddingQuestion] = useState(false);
  
  // Edit dialogs
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSubjects();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchQuestions(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: "Error", description: "Failed to fetch subjects", variant: "destructive" });
    } else {
      setSubjects(data || []);
      if (data && data.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(data[0].id);
      }
    }
    setLoadingData(false);
  };

  const fetchQuestions = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId)
      .order('difficulty');
    
    if (error) {
      toast({ title: "Error", description: "Failed to fetch questions", variant: "destructive" });
    } else {
      setQuestions(data || []);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name.trim()) {
      toast({ title: "Error", description: "Subject name is required", variant: "destructive" });
      return;
    }
    
    setAddingSubject(true);
    const { error } = await supabase.from('subjects').insert({
      name: newSubject.name.trim(),
      youtube_link: newSubject.youtube_link.trim() || null
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Subject added successfully" });
      setNewSubject({ name: '', youtube_link: '' });
      fetchSubjects();
    }
    setAddingSubject(false);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    
    const { error } = await supabase
      .from('subjects')
      .update({
        name: editingSubject.name,
        youtube_link: editingSubject.youtube_link
      })
      .eq('id', editingSubject.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Subject updated successfully" });
      setEditingSubject(null);
      fetchSubjects();
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure? This will delete all questions in this subject.')) return;
    
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Subject deleted successfully" });
      fetchSubjects();
      if (selectedSubjectId === id) {
        setSelectedSubjectId('');
        setQuestions([]);
      }
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.subject_id || !newQuestion.question.trim()) {
      toast({ title: "Error", description: "Subject and question are required", variant: "destructive" });
      return;
    }
    
    setAddingQuestion(true);
    const { error } = await supabase.from('questions').insert({
      subject_id: newQuestion.subject_id,
      question: newQuestion.question.trim(),
      option_a: newQuestion.option_a.trim(),
      option_b: newQuestion.option_b.trim(),
      option_c: newQuestion.option_c.trim(),
      option_d: newQuestion.option_d.trim(),
      correct_answer: newQuestion.correct_answer,
      difficulty: newQuestion.difficulty
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Question added successfully" });
      setNewQuestion({
        question: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        difficulty: 'medium',
        subject_id: newQuestion.subject_id
      });
      if (selectedSubjectId === newQuestion.subject_id) {
        fetchQuestions(selectedSubjectId);
      }
    }
    setAddingQuestion(false);
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    
    const { error } = await supabase
      .from('questions')
      .update({
        question: editingQuestion.question,
        option_a: editingQuestion.option_a,
        option_b: editingQuestion.option_b,
        option_c: editingQuestion.option_c,
        option_d: editingQuestion.option_d,
        correct_answer: editingQuestion.correct_answer,
        difficulty: editingQuestion.difficulty
      })
      .eq('id', editingQuestion.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Question updated successfully" });
      setEditingQuestion(null);
      if (selectedSubjectId) {
        fetchQuestions(selectedSubjectId);
      }
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Question deleted successfully" });
      if (selectedSubjectId) {
        fetchQuestions(selectedSubjectId);
      }
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen gradient-dark neural-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass cyber-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to access this panel.
              <br />
              Contact your administrator if you need access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark neural-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground text-sm">Manage subjects, questions, and content</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="subjects" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Subjects
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              YouTube Links
            </TabsTrigger>
          </TabsList>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Add Subject Form */}
              <Card className="glass cyber-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Subject
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddSubject} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject-name">Subject Name</Label>
                      <Input
                        id="subject-name"
                        placeholder="e.g., Data Structures"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        className="bg-card/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="youtube-link">YouTube Link (Optional)</Label>
                      <Input
                        id="youtube-link"
                        placeholder="https://youtube.com/..."
                        value={newSubject.youtube_link}
                        onChange={(e) => setNewSubject({ ...newSubject, youtube_link: e.target.value })}
                        className="bg-card/50"
                      />
                    </div>
                    <Button type="submit" disabled={addingSubject} className="w-full">
                      {addingSubject ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Subject
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Subjects List */}
              <Card className="glass cyber-border">
                <CardHeader>
                  <CardTitle>All Subjects ({subjects.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                          <span className="font-medium">{subject.name}</span>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setEditingSubject(subject)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Subject</DialogTitle>
                                </DialogHeader>
                                {editingSubject && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Subject Name</Label>
                                      <Input
                                        value={editingSubject.name}
                                        onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>YouTube Link</Label>
                                      <Input
                                        value={editingSubject.youtube_link || ''}
                                        onChange={(e) => setEditingSubject({ ...editingSubject, youtube_link: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button onClick={handleUpdateSubject}>Save Changes</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions">
            <div className="space-y-6">
              {/* Add Question Form */}
              <Card className="glass cyber-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddQuestion} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select
                          value={newQuestion.subject_id}
                          onValueChange={(val) => setNewQuestion({ ...newQuestion, subject_id: val })}
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
                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select
                          value={newQuestion.difficulty}
                          onValueChange={(val) => setNewQuestion({ ...newQuestion, difficulty: val })}
                        >
                          <SelectTrigger className="bg-card/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Textarea
                        placeholder="Enter the question"
                        value={newQuestion.question}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                        className="bg-card/50"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Option A</Label>
                        <Input
                          value={newQuestion.option_a}
                          onChange={(e) => setNewQuestion({ ...newQuestion, option_a: e.target.value })}
                          className="bg-card/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Option B</Label>
                        <Input
                          value={newQuestion.option_b}
                          onChange={(e) => setNewQuestion({ ...newQuestion, option_b: e.target.value })}
                          className="bg-card/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Option C</Label>
                        <Input
                          value={newQuestion.option_c}
                          onChange={(e) => setNewQuestion({ ...newQuestion, option_c: e.target.value })}
                          className="bg-card/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Option D</Label>
                        <Input
                          value={newQuestion.option_d}
                          onChange={(e) => setNewQuestion({ ...newQuestion, option_d: e.target.value })}
                          className="bg-card/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <Select
                        value={newQuestion.correct_answer}
                        onValueChange={(val) => setNewQuestion({ ...newQuestion, correct_answer: val })}
                      >
                        <SelectTrigger className="bg-card/50 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" disabled={addingQuestion}>
                      {addingQuestion ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Question
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Questions List */}
              <Card className="glass cyber-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Questions</CardTitle>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {questions.map((q, index) => (
                      <div key={q.id} className="p-4 bg-card/50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">Q{index + 1}: {q.question}</span>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setEditingQuestion(q)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Edit Question</DialogTitle>
                                </DialogHeader>
                                {editingQuestion && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Question</Label>
                                      <Textarea
                                        value={editingQuestion.question}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                                      />
                                    </div>
                                    <div className="grid gap-4 grid-cols-2">
                                      <div className="space-y-2">
                                        <Label>Option A</Label>
                                        <Input
                                          value={editingQuestion.option_a}
                                          onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Option B</Label>
                                        <Input
                                          value={editingQuestion.option_b}
                                          onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Option C</Label>
                                        <Input
                                          value={editingQuestion.option_c}
                                          onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Option D</Label>
                                        <Input
                                          value={editingQuestion.option_d}
                                          onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid gap-4 grid-cols-2">
                                      <div className="space-y-2">
                                        <Label>Correct Answer</Label>
                                        <Select
                                          value={editingQuestion.correct_answer}
                                          onValueChange={(val) => setEditingQuestion({ ...editingQuestion, correct_answer: val })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="A">A</SelectItem>
                                            <SelectItem value="B">B</SelectItem>
                                            <SelectItem value="C">C</SelectItem>
                                            <SelectItem value="D">D</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Difficulty</Label>
                                        <Select
                                          value={editingQuestion.difficulty}
                                          onValueChange={(val) => setEditingQuestion({ ...editingQuestion, difficulty: val })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button onClick={handleUpdateQuestion}>Save Changes</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                          <span>A: {q.option_a}</span>
                          <span>B: {q.option_b}</span>
                          <span>C: {q.option_c}</span>
                          <span>D: {q.option_d}</span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-primary">Answer: {q.correct_answer}</span>
                          <span className="text-muted-foreground capitalize">{q.difficulty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* YouTube Links Tab */}
          <TabsContent value="youtube">
            <Card className="glass cyber-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-destructive" />
                  YouTube Links for Subjects
                </CardTitle>
                <CardDescription>
                  Add YouTube tutorial links for each subject. Students can access these from the Subjects page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center gap-4 p-4 bg-card/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {subject.youtube_link || 'No link added'}
                        </p>
                      </div>
                      {subject.youtube_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(subject.youtube_link!, '_blank')}
                        >
                          <Youtube className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingSubject(subject)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit YouTube Link</DialogTitle>
                          </DialogHeader>
                          {editingSubject && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Subject: {editingSubject.name}</Label>
                              </div>
                              <div className="space-y-2">
                                <Label>YouTube Link</Label>
                                <Input
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  value={editingSubject.youtube_link || ''}
                                  onChange={(e) => setEditingSubject({ ...editingSubject, youtube_link: e.target.value })}
                                />
                              </div>
                            </div>
                          )}
                          <DialogFooter>
                            <Button onClick={handleUpdateSubject}>Save Link</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
