import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, TrendingUp, Target, Zap, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

interface Attempt {
  id: string;
  score: number;
  total_questions: number;
  percentage: number;
  type: string;
  created_at: string;
  subjects: {
    name: string;
  };
}

interface DailyStats {
  date: string;
  xpEarned: number;
  quizzesTaken: number;
  avgScore: number;
}

interface SubjectStats {
  name: string;
  attempts: number;
  avgScore: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--info))', '#8884d8', '#82ca9d', '#ffc658', '#ff7c43'];

const Progress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch attempts with subject info
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('attempts')
      .select(`
        *,
        subjects (
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (attemptsError) {
      toast({ title: "Error", description: attemptsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch profile for total XP
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .maybeSingle();

    setTotalXP(profileData?.xp || 0);
    setAttempts(attemptsData as Attempt[] || []);
    setTotalQuizzes(attemptsData?.length || 0);

    if (attemptsData && attemptsData.length > 0) {
      // Calculate average score
      const avg = attemptsData.reduce((sum, a) => sum + a.percentage, 0) / attemptsData.length;
      setAvgScore(Math.round(avg));

      // Calculate daily stats for the last 14 days
      const last14Days = eachDayOfInterval({
        start: subDays(new Date(), 13),
        end: new Date()
      });

      const dailyData: DailyStats[] = last14Days.map(day => {
        const dayStart = startOfDay(day);
        const dayAttempts = attemptsData.filter(a => {
          const attemptDate = startOfDay(new Date(a.created_at));
          return attemptDate.getTime() === dayStart.getTime();
        });

        const xpEarned = dayAttempts.reduce((sum, a) => sum + (a.score * 10), 0);
        const avgScoreDay = dayAttempts.length > 0 
          ? dayAttempts.reduce((sum, a) => sum + a.percentage, 0) / dayAttempts.length 
          : 0;

        return {
          date: format(day, 'MMM dd'),
          xpEarned,
          quizzesTaken: dayAttempts.length,
          avgScore: Math.round(avgScoreDay)
        };
      });

      setDailyStats(dailyData);

      // Calculate subject stats
      const subjectMap = new Map<string, { attempts: number; totalScore: number }>();
      attemptsData.forEach(attempt => {
        const subjectName = attempt.subjects?.name || 'Unknown';
        const existing = subjectMap.get(subjectName) || { attempts: 0, totalScore: 0 };
        subjectMap.set(subjectName, {
          attempts: existing.attempts + 1,
          totalScore: existing.totalScore + attempt.percentage
        });
      });

      const subjectData: SubjectStats[] = Array.from(subjectMap.entries())
        .map(([name, stats]) => ({
          name,
          attempts: stats.attempts,
          avgScore: Math.round(stats.totalScore / stats.attempts)
        }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 8);

      setSubjectStats(subjectData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-orbitron">Progress Analytics</h1>
            <p className="text-muted-foreground">Track your learning journey</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalXP}</p>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-info/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/20">
                  <Calendar className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalQuizzes}</p>
                  <p className="text-xs text-muted-foreground">Quizzes Taken</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subjectStats.length}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {totalQuizzes === 0 ? (
          <Card className="border-border/50">
            <CardContent className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
              <p className="text-muted-foreground mb-4">
                Take some quizzes to see your progress analytics!
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Start Learning
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* XP Over Time Chart */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  XP Earned (Last 14 Days)
                </CardTitle>
                <CardDescription>Daily XP accumulation from quizzes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Bar 
                        dataKey="xpEarned" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        name="XP Earned"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Trend Chart */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Quiz Performance Trend
                </CardTitle>
                <CardDescription>Average score percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyStats.filter(d => d.avgScore > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        formatter={(value: number) => [`${value}%`, 'Avg Score']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
                        name="Avg Score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Subject Distribution */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-info" />
                    Subject Distribution
                  </CardTitle>
                  <CardDescription>Quizzes taken per subject</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subjectStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="attempts"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {subjectStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Subject Performance */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                    Subject Performance
                  </CardTitle>
                  <CardDescription>Average score by subject</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          type="number" 
                          domain={[0, 100]}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          width={80}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          formatter={(value: number) => [`${value}%`, 'Avg Score']}
                        />
                        <Bar 
                          dataKey="avgScore" 
                          fill="hsl(var(--success))" 
                          radius={[0, 4, 4, 0]}
                          name="Avg Score"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Progress;
