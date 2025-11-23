import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Clock, TrendingUp, Home } from 'lucide-react';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score, total, percentage, xpEarned, timeTaken, type, subjectName } = location.state || {};

  if (!score && score !== 0) {
    navigate('/dashboard');
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGrade = (percent: number) => {
    if (percent >= 90) return { grade: 'A+', color: 'text-success', message: 'Outstanding!' };
    if (percent >= 80) return { grade: 'A', color: 'text-success', message: 'Excellent!' };
    if (percent >= 70) return { grade: 'B', color: 'text-primary', message: 'Great job!' };
    if (percent >= 60) return { grade: 'C', color: 'text-accent', message: 'Good effort!' };
    if (percent >= 50) return { grade: 'D', color: 'text-warning', message: 'Keep practicing!' };
    return { grade: 'F', color: 'text-destructive', message: 'Try again!' };
  };

  const gradeInfo = getGrade(percentage);

  return (
    <div className="min-h-screen gradient-dark p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Quiz Complete!</h1>
          <p className="text-muted-foreground">
            {type === 'daily_quiz' ? 'Daily Quiz' : `${subjectName} Exam`}
          </p>
        </div>

        {/* Score Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="text-center pb-3">
            <CardTitle className={`text-6xl font-bold ${gradeInfo.color}`}>
              {gradeInfo.grade}
            </CardTitle>
            <CardDescription className="text-xl">{gradeInfo.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold">{score}/{total}</div>
                <div className="text-sm text-muted-foreground">Correct Answers</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold">{percentage.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4">
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Star className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">XP Earned</div>
                <div className="text-sm text-muted-foreground">+{xpEarned} experience points</div>
              </div>
              <div className="text-2xl font-bold text-accent">+{xpEarned}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-lg bg-info/10">
                <Clock className="h-6 w-6 text-info" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Time Taken</div>
                <div className="text-sm text-muted-foreground">Completion time</div>
              </div>
              <div className="text-2xl font-bold text-info">{formatTime(timeTaken)}</div>
            </CardContent>
          </Card>

          {type === 'daily_quiz' && (
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Streak Status</div>
                  <div className="text-sm text-muted-foreground">Keep it going tomorrow!</div>
                </div>
                <div className="text-2xl font-bold text-destructive">🔥</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="grid gap-4">
          <Button 
            size="lg" 
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            <Home className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full"
            onClick={() => navigate('/history')}
          >
            View History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;