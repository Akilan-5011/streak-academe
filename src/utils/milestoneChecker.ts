import { supabase } from '@/integrations/supabase/client';

export interface Milestone {
  type: string;
  name: string;
  description: string;
  requirement: (stats: UserStats) => boolean;
}

export interface UserStats {
  xp: number;
  current_streak: number;
  longest_streak: number;
  quizCount: number;
  badgeCount: number;
}

export const MILESTONES: Milestone[] = [
  {
    type: 'first_quiz',
    name: 'First Steps',
    description: 'Complete your first quiz',
    requirement: (stats) => stats.quizCount >= 1,
  },
  {
    type: 'xp_100',
    name: 'Rising Star',
    description: 'Earn 100 XP',
    requirement: (stats) => stats.xp >= 100,
  },
  {
    type: 'xp_300',
    name: 'Knowledge Seeker',
    description: 'Reach Intermediate level (300 XP)',
    requirement: (stats) => stats.xp >= 300,
  },
  {
    type: 'xp_500',
    name: 'Scholar',
    description: 'Earn 500 XP',
    requirement: (stats) => stats.xp >= 500,
  },
  {
    type: 'xp_1000',
    name: 'Master Learner',
    description: 'Earn 1000 XP',
    requirement: (stats) => stats.xp >= 1000,
  },
  {
    type: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    requirement: (stats) => stats.longest_streak >= 7,
  },
  {
    type: 'streak_30',
    name: 'Monthly Champion',
    description: 'Maintain a 30-day streak',
    requirement: (stats) => stats.longest_streak >= 30,
  },
  {
    type: 'quizzes_10',
    name: 'Quiz Enthusiast',
    description: 'Complete 10 quizzes',
    requirement: (stats) => stats.quizCount >= 10,
  },
  {
    type: 'quizzes_50',
    name: 'Quiz Master',
    description: 'Complete 50 quizzes',
    requirement: (stats) => stats.quizCount >= 50,
  },
  {
    type: 'badges_5',
    name: 'Badge Collector',
    description: 'Earn 5 badges',
    requirement: (stats) => stats.badgeCount >= 5,
  },
];

export async function checkAndAwardCertificates(userId: string): Promise<string[]> {
  const newCertificates: string[] = [];

  // Fetch user stats and profile name
  const [profileResult, attemptsResult, badgesResult, certificatesResult] = await Promise.all([
    supabase.from('profiles').select('name, xp, current_streak, longest_streak').eq('id', userId).single(),
    supabase.from('attempts').select('id').eq('user_id', userId),
    supabase.from('badges').select('id').eq('user_id', userId),
    supabase.from('certificates').select('milestone_type').eq('user_id', userId),
  ]);

  if (profileResult.error || !profileResult.data) return [];

  const userName = profileResult.data.name;
  const stats: UserStats = {
    xp: profileResult.data.xp,
    current_streak: profileResult.data.current_streak,
    longest_streak: profileResult.data.longest_streak,
    quizCount: attemptsResult.data?.length || 0,
    badgeCount: badgesResult.data?.length || 0,
  };

  const existingCertTypes = new Set(certificatesResult.data?.map(c => c.milestone_type) || []);

  // Check each milestone
  for (const milestone of MILESTONES) {
    if (!existingCertTypes.has(milestone.type) && milestone.requirement(stats)) {
      // Insert certificate record first
      const { data: certData, error: insertError } = await supabase.from('certificates').insert({
        user_id: userId,
        milestone_type: milestone.type,
        milestone_name: milestone.name,
      }).select('id').single();

      if (!insertError && certData) {
        newCertificates.push(milestone.name);

        // Call edge function to generate certificate image (async, don't wait)
        generateCertificateImage(userId, certData.id, userName, milestone.name, milestone.type);
      }
    }
  }

  return newCertificates;
}

async function generateCertificateImage(
  userId: string, 
  certificateId: string, 
  userName: string, 
  milestoneName: string, 
  milestoneType: string
) {
  try {
    const response = await supabase.functions.invoke('generate-certificate', {
      body: { userName, milestoneName, milestoneType }
    });

    if (response.error) {
      console.error('Certificate generation error:', response.error);
      return;
    }

    const imageUrl = response.data?.imageUrl;
    if (imageUrl) {
      // Update certificate with the generated image
      await supabase.from('certificates')
        .update({ image_url: imageUrl })
        .eq('id', certificateId);
      console.log('Certificate image saved for:', milestoneName);
    }
  } catch (error) {
    console.error('Failed to generate certificate image:', error);
  }
}
