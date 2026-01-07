import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Brain, Sparkles, Target, BookOpen, Loader2 } from 'lucide-react';

interface SubjectPerformance {
  subject_name: string;
  avg_percentage: number;
  total_attempts: number;
}

const AIRecommendations = () => {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [performances, setPerformances] = useState<SubjectPerformance[]>([]);

  useEffect(() => {
    if (user) {
      fetchPerformanceData();
    }
  }, [user]);

  const fetchPerformanceData = async () => {
    try {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name');

      const { data: attempts } = await supabase
        .from('attempts')
        .select('subject_id, percentage')
        .eq('user_id', user?.id);

      if (subjects && attempts) {
        const performanceMap = new Map<string, { percentages: number[]; name: string }>();

        subjects.forEach(subject => {
          performanceMap.set(subject.id, { percentages: [], name: subject.name });
        });

        attempts.forEach(attempt => {
          const existing = performanceMap.get(attempt.subject_id);
          if (existing) {
            existing.percentages.push(attempt.percentage);
          }
        });

        const perf: SubjectPerformance[] = [];
        performanceMap.forEach((data) => {
          const avgPercentage = data.percentages.length > 0
            ? data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length
            : 0;
          perf.push({
            subject_name: data.name,
            avg_percentage: Math.round(avgPercentage),
            total_attempts: data.percentages.length
          });
        });

        setPerformances(perf);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const generateRecommendation = async () => {
    setLoading(true);
    try {
      const weakSubjects = performances.filter(p => p.avg_percentage < 60 || p.total_attempts === 0);
      const strongSubjects = performances.filter(p => p.avg_percentage >= 80 && p.total_attempts > 0);
      const mediumSubjects = performances.filter(p => p.avg_percentage >= 60 && p.avg_percentage < 80 && p.total_attempts > 0);

      const prompt = `You are an AI study advisor. Based on the student's performance data, provide a personalized, encouraging study recommendation in 3-4 sentences.

Performance Summary:
- Weak subjects (need focus, <60% or no attempts): ${weakSubjects.map(s => `${s.subject_name} (${s.total_attempts === 0 ? 'no attempts' : s.avg_percentage + '%'})`).join(', ') || 'None'}
- Medium subjects (60-80%): ${mediumSubjects.map(s => `${s.subject_name} (${s.avg_percentage}%)`).join(', ') || 'None'}
- Strong subjects (>80%): ${strongSubjects.map(s => `${s.subject_name} (${s.avg_percentage}%)`).join(', ') || 'None'}

Give specific, actionable advice focusing on the weakest areas first. Be encouraging and mention specific subjects by name.`;

      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { prompt }
      });

      if (error) throw error;
      setRecommendation(data.recommendation || 'Unable to generate recommendation at this time.');
    } catch (error) {
      console.error('Error generating recommendation:', error);
      // Fallback to local recommendation
      const weakSubjects = performances.filter(p => p.avg_percentage < 60 || p.total_attempts === 0);
      if (weakSubjects.length > 0) {
        setRecommendation(`Focus on ${weakSubjects[0].subject_name} - ${weakSubjects[0].total_attempts === 0 ? 'you haven\'t attempted any quizzes yet!' : `your average is ${weakSubjects[0].avg_percentage}%.`} Start with the easy difficulty to build confidence, then gradually increase the challenge. Consistency is key - try to practice daily!`);
      } else {
        setRecommendation('Great job! You\'re performing well across all subjects. Keep up the consistent practice and consider challenging yourself with harder difficulty levels to master the content even further!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Study Recommendations
          <Sparkles className="h-4 w-4 text-accent" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendation ? (
          <div className="p-4 rounded-lg bg-card/50 border border-border/50">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">{recommendation}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Get personalized study recommendations based on your performance
            </p>
          </div>
        )}
        
        <Button 
          onClick={generateRecommendation} 
          disabled={loading}
          className="w-full"
          variant={recommendation ? "outline" : "default"}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {recommendation ? 'Get New Recommendation' : 'Get AI Recommendation'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIRecommendations;
