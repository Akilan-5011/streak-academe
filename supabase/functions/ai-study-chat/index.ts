import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, performances, isFirstMessage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing chat request, isFirstMessage:', isFirstMessage);

    // Build performance context
    const weakSubjects = performances?.filter((p: any) => p.avg_percentage < 60 || p.total_attempts === 0) || [];
    const strongSubjects = performances?.filter((p: any) => p.avg_percentage >= 80 && p.total_attempts > 0) || [];
    const mediumSubjects = performances?.filter((p: any) => p.avg_percentage >= 60 && p.avg_percentage < 80 && p.total_attempts > 0) || [];

    const performanceContext = `
Student Performance Data:
- Weak subjects (need focus, <60% or no attempts): ${weakSubjects.map((s: any) => `${s.subject_name} (${s.total_attempts === 0 ? 'no attempts' : s.avg_percentage + '%'})`).join(', ') || 'None'}
- Medium subjects (60-80%): ${mediumSubjects.map((s: any) => `${s.subject_name} (${s.avg_percentage}%)`).join(', ') || 'None'}
- Strong subjects (>80%): ${strongSubjects.map((s: any) => `${s.subject_name} (${s.avg_percentage}%)`).join(', ') || 'None'}
`;

    const systemPrompt = `You are an encouraging and helpful AI study assistant for a learning platform. You have access to the student's quiz performance data.

${performanceContext}

Guidelines:
- Be friendly, encouraging, and supportive
- Give specific, actionable advice based on their performance data
- Mention specific subjects by name when relevant
- Keep responses concise but helpful (2-4 sentences usually)
- Use emojis occasionally to be more engaging
- If they ask about a specific subject, reference their performance in it
- Suggest practical study strategies and time management tips
- Celebrate their strengths while gently guiding improvement in weak areas`;

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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
