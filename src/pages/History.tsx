import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Trophy, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Attempt {
  id: string;
  score: number;
  total_questions: number;
  percentage: number;
  type: string;
  time_taken: number;
  created_at: string;
  subjects: {
    name: string;
  };
}

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAttempts();
  }, [user]);

  const fetchAttempts = async () => {
    const { data, error } = await supabase
      .from('attempts')
      .select(`
        *,
        subjects (
          name
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setAttempts(data as Attempt[]);
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-primary';
    if (percentage >= 40) return 'text-accent';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading history...</p>
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
            <h1 className="text-3xl font-bold">Attempt History</h1>
            <p className="text-muted-foreground">{attempts.length} total attempts</p>
          </div>
        </div>

        {/* Attempts List */}
        {attempts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No quiz attempts yet</p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/dashboard')}
              >
                Take Your First Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <Card key={attempt.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{attempt.subjects.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(attempt.created_at), 'MMM dd, yyyy • h:mm a')}
                      </CardDescription>
                    </div>
                    <div className={`text-2xl font-bold ${getGradeColor(attempt.percentage)}`}>
                      {attempt.percentage.toFixed(0)}%
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center mb-3">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Score</div>
                      <div className="font-bold">
                        {attempt.score}/{attempt.total_questions}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div className="font-bold text-xs">
                        {attempt.type === 'daily_quiz' ? 'Daily Quiz' : 'Exam'}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        Time
                      </div>
                      <div className="font-bold text-xs">
                        {formatTime(attempt.time_taken)}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    size="sm"
                    onClick={() => navigate('/review', { state: { attemptId: attempt.id } })}
                  >
                    📝 Review Answers
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;