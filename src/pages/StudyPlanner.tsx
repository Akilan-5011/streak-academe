import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Target, TrendingUp, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';

interface SubjectPerformance {
  subject_id: string;
  subject_name: string;
  total_attempts: number;
  avg_percentage: number;
  last_attempt: string;
  recommendation: 'focus' | 'maintain' | 'mastered';
}

const StudyPlanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjectPerformances, setSubjectPerformances] = useState<SubjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPerformanceData();
    }
  }, [user]);

  const fetchPerformanceData = async () => {
    try {
      // Fetch all subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name');

      // Fetch user's attempts with subject info
      const { data: attempts } = await supabase
        .from('attempts')
        .select('subject_id, percentage, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (subjects && attempts) {
        const performanceMap = new Map<string, { 
          percentages: number[]; 
          lastAttempt: string;
          name: string;
        }>();

        // Initialize all subjects
        subjects.forEach(subject => {
          performanceMap.set(subject.id, {
            percentages: [],
            lastAttempt: '',
            name: subject.name
          });
        });

        // Aggregate attempts by subject
        attempts.forEach(attempt => {
          const existing = performanceMap.get(attempt.subject_id);
          if (existing) {
            existing.percentages.push(attempt.percentage);
            if (!existing.lastAttempt) {
              existing.lastAttempt = attempt.created_at;
            }
          }
        });

        // Calculate performance metrics
        const performances: SubjectPerformance[] = [];
        performanceMap.forEach((data, subjectId) => {
          const avgPercentage = data.percentages.length > 0
            ? data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length
            : 0;

          let recommendation: 'focus' | 'maintain' | 'mastered';
          if (data.percentages.length === 0 || avgPercentage < 50) {
            recommendation = 'focus';
          } else if (avgPercentage < 80) {
            recommendation = 'maintain';
          } else {
            recommendation = 'mastered';
          }

          performances.push({
            subject_id: subjectId,
            subject_name: data.name,
            total_attempts: data.percentages.length,
            avg_percentage: Math.round(avgPercentage),
            last_attempt: data.lastAttempt,
            recommendation
          });
        });

        // Sort: focus first, then maintain, then mastered
        performances.sort((a, b) => {
          const order = { focus: 0, maintain: 1, mastered: 2 };
          return order[a.recommendation] - order[b.recommendation];
        });

        setSubjectPerformances(performances);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'focus':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'maintain':
        return <TrendingUp className="w-5 h-5 text-warning" />;
      case 'mastered':
        return <CheckCircle className="w-5 h-5 text-accent" />;
      default:
        return null;
    }
  };

  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case 'focus':
        return 'Needs Focus';
      case 'maintain':
        return 'Keep Practicing';
      case 'mastered':
        return 'Well Done!';
      default:
        return '';
    }
  };

  const getRecommendationClass = (rec: string) => {
    switch (rec) {
      case 'focus':
        return 'border-destructive/50 bg-destructive/10';
      case 'maintain':
        return 'border-warning/50 bg-warning/10';
      case 'mastered':
        return 'border-accent/50 bg-accent/10';
      default:
        return '';
    }
  };

  const focusSubjects = subjectPerformances.filter(s => s.recommendation === 'focus');
  const maintainSubjects = subjectPerformances.filter(s => s.recommendation === 'maintain');
  const masteredSubjects = subjectPerformances.filter(s => s.recommendation === 'mastered');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl animate-pulse">Analyzing your performance...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-foreground mb-2">
            📚 Study Planner
          </h1>
          <p className="text-muted-foreground">
            Personalized recommendations based on your performance
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="cyber-border bg-card/50 backdrop-blur-sm border-destructive/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{focusSubjects.length}</div>
              <div className="text-xs text-muted-foreground">Need Focus</div>
            </CardContent>
          </Card>
          <Card className="cyber-border bg-card/50 backdrop-blur-sm border-warning/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-warning mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{maintainSubjects.length}</div>
              <div className="text-xs text-muted-foreground">Keep Practicing</div>
            </CardContent>
          </Card>
          <Card className="cyber-border bg-card/50 backdrop-blur-sm border-accent/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{masteredSubjects.length}</div>
              <div className="text-xs text-muted-foreground">Mastered</div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Focus Section */}
        {focusSubjects.length > 0 && (
          <Card className="cyber-border bg-card/50 backdrop-blur-sm mb-6 border-destructive/30">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-destructive" />
                Priority Focus Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {focusSubjects.slice(0, 5).map((subject) => (
                <div
                  key={subject.subject_id}
                  className={`p-4 rounded-lg border ${getRecommendationClass(subject.recommendation)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{subject.subject_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(subject.recommendation)}
                      <span className="text-sm text-muted-foreground">
                        {getRecommendationText(subject.recommendation)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={subject.avg_percentage} className="h-2" />
                    </div>
                    <span className="text-sm font-medium text-foreground w-12 text-right">
                      {subject.avg_percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {subject.total_attempts === 0
                      ? 'No attempts yet - start practicing!'
                      : `${subject.total_attempts} attempt${subject.total_attempts > 1 ? 's' : ''}`}
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 bg-primary hover:bg-primary/80"
                    onClick={() => navigate('/subjects')}
                  >
                    Practice Now
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Subjects Performance */}
        <Card className="cyber-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground">All Subjects Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjectPerformances.map((subject) => (
              <div
                key={subject.subject_id}
                className={`p-3 rounded-lg border ${getRecommendationClass(subject.recommendation)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground text-sm">{subject.subject_name}</span>
                  <div className="flex items-center gap-2">
                    {getRecommendationIcon(subject.recommendation)}
                    <span className="text-xs text-muted-foreground">
                      {subject.avg_percentage}%
                    </span>
                  </div>
                </div>
                <Progress value={subject.avg_percentage} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudyPlanner;
