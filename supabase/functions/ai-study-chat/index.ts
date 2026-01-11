import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const authenticateRequest = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization');
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error('Unauthorized');
  }

  return data.user;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request first
    const user = await authenticateRequest(req);
    console.log('Authenticated user:', user.id);

    const { messages, performances, learningProfile, isFirstMessage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing adaptive learning chat request, isFirstMessage:', isFirstMessage);

    // Enhanced performance analysis with trends
    const weakSubjects = performances?.filter((p: any) => 
      p.avg_percentage < 60 || p.total_attempts === 0
    ) || [];
    const strongSubjects = performances?.filter((p: any) => 
      p.avg_percentage >= 80 && p.total_attempts > 0
    ) || [];
    const mediumSubjects = performances?.filter((p: any) => 
      p.avg_percentage >= 60 && p.avg_percentage < 80 && p.total_attempts > 0
    ) || [];
    const improvingSubjects = performances?.filter((p: any) => p.recent_trend === 'improving') || [];
    const decliningSubjects = performances?.filter((p: any) => p.recent_trend === 'declining') || [];

    const performanceContext = `
STUDENT ADAPTIVE LEARNING PROFILE:

📊 Current Stats:
- Total XP: ${learningProfile?.total_xp || 0}
- Current Streak: ${learningProfile?.current_streak || 0} days
- Daily XP earned: ${learningProfile?.daily_xp || 0}
- Recommended Difficulty: ${learningProfile?.recommended_difficulty || 'medium'}

📚 Subject Performance Analysis:
- Weak subjects (need focus, <60% or no attempts): ${weakSubjects.map((s: any) => 
  `${s.subject_name} (${s.total_attempts === 0 ? 'no attempts' : s.avg_percentage + '%, avg ' + s.time_spent_avg + 's/question'})`
).join(', ') || 'None'}

- Medium subjects (60-80%): ${mediumSubjects.map((s: any) => 
  `${s.subject_name} (${s.avg_percentage}%, trend: ${s.recent_trend})`
).join(', ') || 'None'}

- Strong subjects (>80%): ${strongSubjects.map((s: any) => 
  `${s.subject_name} (${s.avg_percentage}%)`
).join(', ') || 'None'}

📈 Learning Trends:
- Improving: ${improvingSubjects.map((s: any) => s.subject_name).join(', ') || 'None identified'}
- Declining: ${decliningSubjects.map((s: any) => s.subject_name).join(', ') || 'None identified'}

🎯 Adaptive Recommendations:
${weakSubjects.length > 0 ? `- Priority focus on: ${weakSubjects[0].subject_name}` : '- All subjects performing well!'}
${decliningSubjects.length > 0 ? `- Review declining: ${decliningSubjects.map((s: any) => s.subject_name).join(', ')}` : ''}
`;

    const systemPrompt = `You are an advanced AI Adaptive Learning Assistant for an educational platform. You analyze student performance data and provide personalized, data-driven recommendations.

${performanceContext}

ADAPTIVE LEARNING GUIDELINES:
1. **Personalized Recommendations**: Base all advice on the specific performance data provided
2. **Difficulty Adjustment**: If student struggles (<60%), suggest starting with easier questions; if excelling (>80%), encourage harder challenges
3. **Trend Analysis**: Highlight improving trends to encourage, address declining trends with specific strategies
4. **Time Management**: If average time per question is high, suggest time management tips
5. **Spaced Repetition**: For weak subjects, recommend frequent short sessions
6. **Learning Path**: Create clear, actionable study paths based on current level

RESPONSE STYLE:
- Be encouraging and supportive, but data-driven
- Use specific numbers and percentages from their data
- Give 2-4 actionable recommendations per response
- Use emojis sparingly for engagement
- Keep responses concise but impactful
- If they're improving, celebrate it specifically
- If they're struggling, provide concrete strategies

Example phrases: "Your Data Structures performance improved from X to Y!", "Based on your 65% in OS, I recommend starting with easy-mode questions to build confidence."`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: apiMessages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || 'I couldn\'t generate a response.';

    console.log('Chat response generated successfully');

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-study-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage === 'Missing authorization' || errorMessage === 'Unauthorized' ? 401 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
