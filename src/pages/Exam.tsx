import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMongoAuth } from '@/hooks/useMongoAuth';
import { mongodb } from '@/lib/mongodb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Trophy, Settings } from 'lucide-react';

interface Question {
  _id: string;
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
  const { user, refreshUser } = useMongoAuth();
  const { subjectId, subjectName } = location.state || {};
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Exam configuration
  const [showConfig, setShowConfig] = useState(true);
  const [questionCount, setQuestionCount] = useState('10');
  const [timeLimit, setTimeLimit] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');

  useEffect(() => {
    if (!user || !subjectId) {
      navigate('/auth');
      return;
    }
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

  const startExam = async () => {
    setLoading(true);
    const { data, error } = await mongodb.find<Question>('questions', {
      subject_id: subjectId,
      difficulty: difficulty
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      navigate('/subjects');
      return;
    }

    if (!data || data.length < parseInt(questionCount)) {
      toast({ 
        title: "Not enough questions", 
        description: `Only ${data?.length || 0} ${difficulty} questions available for this subject. Please select a different difficulty or reduce question count.`,
        variant: "destructive" 
      });
      setLoading(false);
      setShowConfig(true);
      return;
    }

    // Randomly select questions based on user choice
    const shuffled = data.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, parseInt(questionCount));
    setQuestions(selected);
    setTimeLeft(parseInt(timeLimit) * 60);
    setShowConfig(false);
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
    const totalTime = parseInt(timeLimit) * 60;
    const timeTaken = totalTime - timeLeft;

    // Update user XP
    await mongodb.updateOne('users', { _id: user!.id }, {
      $inc: { xp: xpEarned }
    });

    // Save attempt
    await mongodb.insertOne('attempts', {
      user_id: user!.id,
      score,
      total_questions: questions.length,
      percentage,
      type: 'exam',
      subject_id: subjectId,
      time_taken: timeTaken,
      created_at: new Date().toISOString()
    });

    refreshUser();

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

  // Configuration Screen
  if (showConfig) {
    return (
      <div className="min-h-screen gradient-dark p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/subjects')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{subjectName} Exam</h1>
            <div className="w-10" />
          </div>

          {/* Configuration Card */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Configure Your Exam</CardTitle>
                  <CardDescription>Customize your exam settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Number of Questions */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Number of Questions</Label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Limit */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Time Limit</Label>
                <Select value={timeLimit} onValueChange={setTimeLimit}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Minutes</SelectItem>
                    <SelectItem value="10">10 Minutes</SelectItem>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="20">20 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Mode */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Easy - Fundamental concepts</SelectItem>
                    <SelectItem value="medium">🟡 Medium - Intermediate level</SelectItem>
                    <SelectItem value="hard">🔴 Hard - Advanced challenges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-primary">Exam Summary:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Subject: {subjectName}</p>
                  <p>• {questionCount} questions ({difficulty} level)</p>
                  <p>• {timeLimit} minutes time limit</p>
                  <p>• Earn up to {parseInt(questionCount) * 10} XP</p>
                </div>
              </div>

              {/* Start Button */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={startExam}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Start Exam
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground">{questions.length} Questions • {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</p>
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
