import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMongoAuth, useMongoAdmin } from '@/hooks/useMongoAuth';
import { mongodb } from '@/lib/mongodb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Flame, Star, Calendar, BookOpen, User, LogOut, Trophy, Award, ScrollText, BarChart3, Target, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading, refreshUser } = useMongoAuth();
  const { isAdmin } = useMongoAdmin();
  const [canTakeQuiz, setCanTakeQuiz] = useState(true);
  const [nextQuizTime, setNextQuizTime] = useState<string>('');
  const [badgeCount, setBadgeCount] = useState(0);
  const [certCount, setCertCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBadgeCount();
      fetchCertCount();
      checkQuizAvailability(user.last_quiz_date);
      checkStreakAndUpdate();
    }
  }, [user]);

  const fetchBadgeCount = async () => {
    if (!user) return;
    const { data } = await mongodb.find('badges', { user_id: user.id });
    setBadgeCount(data?.length || 0);
  };

  const fetchCertCount = async () => {
    if (!user) return;
    const { data } = await mongodb.find('certificates', { user_id: user.id });
    setCertCount(data?.length || 0);
  };

  const checkQuizAvailability = (lastQuizDate: string | null) => {
    if (!lastQuizDate) {
      setCanTakeQuiz(true);
      return;
    }

    const lastQuiz = new Date(lastQuizDate);
    const now = new Date();
    const timeDiff = now.getTime() - lastQuiz.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff >= 24) {
      setCanTakeQuiz(true);
    } else {
      setCanTakeQuiz(false);
      const nextQuiz = new Date(lastQuiz.getTime() + 24 * 60 * 60 * 1000);
      updateCountdown(nextQuiz);
    }
  };

  const updateCountdown = (nextQuiz: Date) => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = nextQuiz.getTime() - now.getTime();

      if (diff <= 0) {
        setCanTakeQuiz(true);
        setNextQuizTime('');
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setNextQuizTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  };

  const checkStreakAndUpdate = async () => {
    if (!user) return;

    const streakCheckedKey = `streak_checked_${user.id}`;
    if (sessionStorage.getItem(streakCheckedKey)) {
      return;
    }

    const lastLoginStr = user.last_login_date;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (lastLoginStr === todayStr) {
      sessionStorage.setItem(streakCheckedKey, 'true');
      return;
    }

    const lastLogin = new Date(lastLoginStr + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const daysDiff = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      const newStreak = user.current_streak + 1;
      const newLongest = Math.max(newStreak, user.longest_streak);
      
      await mongodb.updateOne('users', { _id: user.id }, {
        $set: {
          current_streak: newStreak,
          longest_streak: newLongest,
          last_login_date: todayStr
        }
      });
      
      toast({ 
        title: "🔥 Streak continued!", 
        description: `You're on a ${newStreak}-day streak!` 
      });
      refreshUser();
    } else if (daysDiff > 1) {
      await mongodb.updateOne('users', { _id: user.id }, {
        $set: {
          current_streak: 1,
          last_login_date: todayStr
        }
      });
      
      toast({ 
        title: "Streak reset", 
        description: "Start a new streak today!",
        variant: "destructive"
      });
      refreshUser();
    }

    sessionStorage.setItem(streakCheckedKey, 'true');
  };

  const getLevel = (xp: number) => {
    if (xp <= 100) return { name: 'Beginner', color: 'text-info' };
    if (xp <= 300) return { name: 'Intermediate', color: 'text-accent' };
    return { name: 'Advanced', color: 'text-primary' };
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const level = getLevel(user.xp);

  return (
    <div className="min-h-screen gradient-dark p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome back,</h1>
            <p className="text-2xl font-bold text-primary">{user.name}!</p>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Daily XP Goal */}
        <Card className="border-accent/30 bg-gradient-to-br from-card to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                Daily XP Goal
              </span>
              <span className="text-lg">
                {user.daily_xp}/{user.daily_xp_goal}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(user.daily_xp / user.daily_xp_goal) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {user.daily_xp >= user.daily_xp_goal 
                ? "🎉 Goal completed! Great work!" 
                : `${user.daily_xp_goal - user.daily_xp} XP to go!`}
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flame className="h-4 w-4 text-destructive" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{user.current_streak}</div>
              <p className="text-xs text-muted-foreground">Best: {user.longest_streak} days</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-accent" />
                Total XP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{user.xp}</div>
              <p className={`text-xs font-semibold ${level.color}`}>{level.name}</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Quiz Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Quiz
            </CardTitle>
            <CardDescription>
              {canTakeQuiz 
                ? "Take your daily quiz and earn XP!" 
                : `Next quiz available in: ${nextQuizTime}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              size="lg"
              disabled={!canTakeQuiz}
              onClick={() => navigate('/daily-quiz')}
            >
              {canTakeQuiz ? 'Start Daily Quiz' : 'Quiz Locked'}
            </Button>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-20"
              onClick={() => navigate('/badges')}
            >
              <div className="text-center">
                <Award className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold text-sm">Badges</div>
                <div className="text-xs text-muted-foreground">{badgeCount} earned</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-20"
              onClick={() => navigate('/leaderboard')}
            >
              <div className="text-center">
                <Trophy className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold text-sm">Leaderboard</div>
                <div className="text-xs text-muted-foreground">Top players</div>
              </div>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-20"
              onClick={() => navigate('/certificates')}
            >
              <div className="text-center">
                <ScrollText className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold text-sm">Certificates</div>
                <div className="text-xs text-muted-foreground">{certCount} earned</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-20"
              onClick={() => navigate('/subjects')}
            >
              <div className="text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold text-sm">Take Exam</div>
                <div className="text-xs text-muted-foreground">Subject quizzes</div>
              </div>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-20"
              onClick={() => navigate('/progress')}
            >
              <div className="text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold text-sm">Analytics</div>
                <div className="text-xs text-muted-foreground">Your progress</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-20"
              onClick={() => navigate('/study-planner')}
            >
              <div className="text-center">
                <Target className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold text-sm">Study Planner</div>
                <div className="text-xs text-muted-foreground">Focus areas</div>
              </div>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-20"
              onClick={() => navigate('/profile')}
            >
              <div className="text-center">
                <User className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold text-sm">Profile</div>
                <div className="text-xs text-muted-foreground">Edit info</div>
              </div>
            </Button>

            {isAdmin && (
              <Button 
                variant="outline" 
                className="h-20 border-primary/50 bg-primary/5"
                onClick={() => navigate('/admin')}
              >
                <div className="text-center">
                  <Shield className="h-6 w-6 mx-auto mb-1 text-primary" />
                  <div className="font-semibold text-sm text-primary">Admin Panel</div>
                  <div className="text-xs text-muted-foreground">Manage content</div>
                </div>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
