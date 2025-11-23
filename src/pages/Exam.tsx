import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Trophy } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  subject_id: string;
}

const Exam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { subjectId, subjectName } = location.state || {};
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !subjectId) {
      navigate('/auth');
      return;
    }
    fetchQuestions();
  }, [user, subjectId]);

  useEffect(() => {
    if (questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions]);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate('/subjects');
      return;
    }

    // Randomly select 10 questions
    const shuffled = data.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    setQuestions(selected);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const score = questions.reduce((acc, question, index) => {
      return acc + (answers[index] === question.correct_answer ? 1 : 0);
    }, 0);

    const percentage = (score / questions.length) * 100;
    const xpEarned = score * 10;
    const timeTaken = 600 - timeLeft;

    // Update profile XP
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user!.id)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          xp: profile.xp + xpEarned
        })
        .eq('id', user!.id);
    }

    // Save attempt
    await supabase
      .from('attempts')
      .insert({
        user_id: user!.id,
        score,
        total_questions: questions.length,
        percentage,
        type: 'exam',
        subject_id: subjectId,
        time_taken: timeTaken
      });

    navigate('/results', { 
      state: { 
        score, 
        total: questions.length, 
        percentage, 
        xpEarned, 
        timeTaken,
        type: 'exam',
        subjectName
      } 
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/subjects')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="font-bold">{subjectName} Exam</h2>
              <p className="text-sm text-muted-foreground">10 Questions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-accent font-mono text-lg">
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestionIndex]}
              onValueChange={(value) => setAnswers({ ...answers, [currentQuestionIndex]: value })}
            >
              {['A', 'B', 'C', 'D'].map((option) => (
                <div key={option} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={option} id={`option-${option}`} />
                  <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer">
                    <span className="font-semibold mr-2">{option}.</span>
                    {currentQuestion[`option_${option.toLowerCase()}` as keyof Question] as string}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          >
            Previous
          </Button>
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              className="flex-1"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < questions.length}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Submit Exam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Exam;