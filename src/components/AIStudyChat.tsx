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
}

const AIStudyChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [performances, setPerformances] = useState<SubjectPerformance[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchPerformanceData();
    }
  }, [user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
          AI Study Assistant
          <Sparkles className="h-4 w-4 text-accent" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <Bot className="h-12 w-12 text-primary mx-auto mb-3 opacity-70" />
            <p className="text-sm text-muted-foreground mb-4">
              Hi! I'm your AI study assistant. Ask me anything about your learning journey!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendMessage('What subjects should I focus on?')}
              >
                📚 Focus areas
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendMessage('Create a study plan for me')}
              >
                📅 Study plan
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendMessage('How can I improve my weak subjects?')}
              >
                💡 Improvement tips
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
