import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
}

const Subjects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setSubjects(data);
    setLoading(false);
  };

  const getSubjectIcon = (name: string) => {
    const icons: Record<string, string> = {
      'Mathematics': '🔢',
      'Physics': '⚛️',
      'English': '📚'
    };
    return icons[name] || '📖';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Select Subject</h1>
            <p className="text-muted-foreground">Choose a subject for your exam</p>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid gap-4">
          {subjects.map((subject) => (
            <Card 
              key={subject.id} 
              className="border-border/50 hover:border-primary/50 transition-all cursor-pointer hover:shadow-glow"
              onClick={() => navigate('/exam', { state: { subjectId: subject.id, subjectName: subject.name } })}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-3xl">{getSubjectIcon(subject.name)}</span>
                  <span>{subject.name}</span>
                </CardTitle>
                <CardDescription>
                  10 questions • Earn up to 100 XP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Start Exam
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subjects;