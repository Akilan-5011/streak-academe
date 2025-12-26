import { supabase } from "@/integrations/supabase/client";

export const checkAndAwardBadges = async (userId: string) => {
  try {
    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, current_streak")
      .eq("id", userId)
      .single();

    if (!profile) return;

    // Fetch attempts
    const { data: attempts } = await supabase
      .from("attempts")
      .select("*")
      .eq("user_id", userId);

    if (!attempts) return;

    // Check streak badges
    if (profile.current_streak >= 3) {
      await awardBadge(userId, "streak_3", "3-Day Streak");
    }
    if (profile.current_streak >= 7) {
      await awardBadge(userId, "streak_7", "7-Day Streak");
    }
    if (profile.current_streak >= 30) {
      await awardBadge(userId, "streak_30", "30-Day Streak");
    }
    if (profile.current_streak >= 50) {
      await awardBadge(userId, "streak_50", "50-Day Streak");
    }
    if (profile.current_streak >= 100) {
      await awardBadge(userId, "streak_100", "100-Day Streak");
    }
    if (profile.current_streak >= 300) {
      await awardBadge(userId, "streak_300", "300-Day Streak");
    }
    if (profile.current_streak >= 550) {
      await awardBadge(userId, "streak_550", "550-Day Streak");
    }

    // Check XP badge
    if (profile.xp >= 1000) {
      await awardBadge(userId, "xp_legend", "XP Legend");
    }

    // Check quiz count badge
    if (attempts.length >= 50) {
      await awardBadge(userId, "quiz_master", "Quiz Master");
    }

    // Check perfect score badge
    const hasPerfectScore = attempts.some(a => a.percentage === 100);
    if (hasPerfectScore) {
      await awardBadge(userId, "perfect_score", "Perfect Score");
    }

    // Check fast thinker badge (under 2 minutes = 120 seconds)
    const hasFastCompletion = attempts.some(a => a.time_taken < 120);
    if (hasFastCompletion) {
      await awardBadge(userId, "fast_thinker", "Fast Thinker");
    }

    // Check subject master badge (10 quizzes in one subject)
    const subjectCounts = new Map<string, number>();
    attempts.forEach(a => {
      subjectCounts.set(a.subject_id, (subjectCounts.get(a.subject_id) || 0) + 1);
    });
    const hasSubjectMaster = Array.from(subjectCounts.values()).some(count => count >= 10);
    if (hasSubjectMaster) {
      await awardBadge(userId, "subject_master", "Subject Master");
    }

  } catch (error) {
    console.error("Error checking badges:", error);
  }
};

const awardBadge = async (userId: string, badgeType: string, badgeName: string) => {
  try {
    // Check if badge already exists
    const { data: existing } = await supabase
      .from("badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_type", badgeType)
      .single();

    if (existing) return; // Badge already awarded

    // Insert new badge
    await supabase.from("badges").insert({
      user_id: userId,
      badge_type: badgeType,
      badge_name: badgeName,
    });
  } catch (error) {
    // Ignore duplicate key errors
    if (!error.message?.includes("duplicate")) {
      console.error("Error awarding badge:", error);
    }
  }
};
