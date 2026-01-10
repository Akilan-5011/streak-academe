import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Brain, Sparkles, Send, Loader2, User, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SubjectPerformance {
  subject_name: string;
  avg_percentage: number;
  total_attempts: number;
  easy_success: number;
  medium_success: number;
  hard_success: number;
  recent_trend: 'improving' | 'declining' | 'stable';
  time_spent_avg: number;
}

interface LearningProfile {
  total_xp: number;
  current_streak: number;
  daily_xp: number;
  recommended_difficulty: 'easy' | 'medium' | 'hard';
}

const AIStudyChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [performances, setPerformances] = useState<SubjectPerformance[]>([]);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchPerformanceData();
      fetchLearningProfile();
    }
  }, [user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchLearningProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, current_streak, daily_xp')
        .eq('id', user?.id)
        .single();

      if (profile) {
        // Determine recommended difficulty based on XP and streak
        let recommended: 'easy' | 'medium' | 'hard' = 'medium';
        if (profile.xp < 50) recommended = 'easy';
        else if (profile.xp > 300 && profile.current_streak >= 7) recommended = 'hard';

        setLearningProfile({
          total_xp: profile.xp,
          current_streak: profile.current_streak,
          daily_xp: profile.daily_xp || 0,
          recommended_difficulty: recommended
        });
      }
    } catch (error) {
      console.error('Error fetching learning profile:', error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name');

      const { data: attempts } = await supabase
        .from('attempts')
        .select('subject_id, percentage, time_taken, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      const { data: attemptDetails } = await supabase
        .from('attempt_details')
        .select(`
          is_correct,
          attempt_id,
          attempts!inner(subject_id, user_id)
        `)
        .eq('attempts.user_id', user?.id);

      if (subjects && attempts) {
        const performanceMap = new Map<string, { 
          percentages: number[]; 
          name: string; 
          times: number[];
          recentAttempts: number[];
        }>();

        subjects.forEach(subject => {
          performanceMap.set(subject.id, { 
            percentages: [], 
            name: subject.name, 
            times: [],
            recentAttempts: []
          });
        });

        attempts.forEach((attempt, idx) => {
          const existing = performanceMap.get(attempt.subject_id);
          if (existing) {
            existing.percentages.push(attempt.percentage);
            existing.times.push(attempt.time_taken);
            if (idx < 5) existing.recentAttempts.push(attempt.percentage);
          }
        });

        const perf: SubjectPerformance[] = [];
        performanceMap.forEach((data) => {
          const avgPercentage = data.percentages.length > 0
            ? data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length
            : 0;
          const avgTime = data.times.length > 0
            ? data.times.reduce((a, b) => a + b, 0) / data.times.length
            : 0;
          
          // Calculate trend from recent attempts
          let trend: 'improving' | 'declining' | 'stable' = 'stable';
          if (data.recentAttempts.length >= 3) {
            const recent = data.recentAttempts.slice(0, 3);
            const older = data.recentAttempts.slice(-3);
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
            if (recentAvg > olderAvg + 5) trend = 'improving';
            else if (recentAvg < olderAvg - 5) trend = 'declining';
          }

          perf.push({
            subject_name: data.name,
            avg_percentage: Math.round(avgPercentage),
            total_attempts: data.percentages.length,
            easy_success: 0, // Will be calculated if we have difficulty data
            medium_success: 0,
            hard_success: 0,
            recent_trend: trend,
            time_spent_avg: Math.round(avgTime)
          });
        });

        setPerformances(perf);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const sendMessage = async (userMessage?: string) => {
    const messageToSend = userMessage || input.trim();
    if (!messageToSend && messages.length > 0) return;

    const newUserMessage: Message = { role: 'user', content: messageToSend || 'Give me study recommendations' };
    
    // If first message, add context automatically
    const isFirstMessage = messages.length === 0;
    
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-study-chat', {
        body: { 
          messages: [...messages, newUserMessage],
          performances,
          learningProfile,
          isFirstMessage
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response || 'Sorry, I couldn\'t generate a response.' 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again!' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Adaptive Learning
          <Sparkles className="h-4 w-4 text-accent" />
        </CardTitle>
        {learningProfile && (
          <p className="text-xs text-muted-foreground">
            Recommended difficulty: <span className="font-semibold text-primary capitalize">{learningProfile.recommended_difficulty}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <Bot className="h-12 w-12 text-primary mx-auto mb-3 opacity-70" />
            <p className="text-sm text-muted-foreground mb-4">
              Hi! I'm your AI adaptive learning assistant. I'll personalize recommendations based on your performance!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendMessage('What subjects should I focus on based on my performance?')}
              >
                📚 Focus areas
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendMessage('Create a personalized study plan for me based on my weak areas')}
              >
                📅 Study plan
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendMessage('Analyze my learning trends and suggest difficulty adjustments')}
              >
                📈 Difficulty advice
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendMessage('What topics am I improving in and where am I struggling?')}
              >
                💡 Progress analysis
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-card/80 border border-border/50 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card/80 border border-border/50 rounded-2xl rounded-bl-sm px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Ask about your studies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1"
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={loading || (!input.trim() && messages.length > 0)}
            size="icon"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIStudyChat;
