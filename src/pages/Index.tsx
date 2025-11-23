import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, Trophy, Zap, Target } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen gradient-dark">
      {/* Hero Section */}
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Brain className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Learning Platform
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Master any subject with adaptive quizzes, daily challenges, and intelligent progress tracking
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={() => navigate('/auth')}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Get Started Free
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-border/50 hover:border-primary/50 transition-all hover:shadow-glow">
            <CardHeader>
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Daily Challenges</CardTitle>
              <CardDescription>
                Take daily quizzes to maintain your streak and earn bonus XP rewards
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-accent/50 transition-all hover:shadow-glow">
            <CardHeader>
              <div className="p-3 rounded-lg bg-accent/10 w-fit mb-2">
                <Zap className="h-8 w-8 text-accent" />
              </div>
              <CardTitle>Adaptive Learning</CardTitle>
              <CardDescription>
                Smart question selection adapts to your skill level for optimal learning
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-info/50 transition-all hover:shadow-glow">
            <CardHeader>
              <div className="p-3 rounded-lg bg-info/10 w-fit mb-2">
                <Target className="h-8 w-8 text-info" />
              </div>
              <CardTitle>Track Progress</CardTitle>
              <CardDescription>
                Monitor your improvement with detailed analytics and achievement badges
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Section */}
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="py-12">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">60+</div>
                <div className="text-sm text-muted-foreground">Practice Questions</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-accent mb-2">3</div>
                <div className="text-sm text-muted-foreground">Subjects Available</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-success mb-2">∞</div>
                <div className="text-sm text-muted-foreground">XP to Earn</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to level up your learning?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join now and start your learning journey today
          </p>
          <Button 
            size="lg" 
            className="text-lg px-12"
            onClick={() => navigate('/auth')}
          >
            Start Learning Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;