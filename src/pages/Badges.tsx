import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Flame, Target, Zap, BookOpen, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  earned_at: string;
}

const BADGE_INFO = {
  streak_3: { icon: Flame, color: "text-orange-400", description: "Maintained a 3-day streak" },
  streak_7: { icon: Flame, color: "text-orange-500", description: "Maintained a 7-day streak" },
  streak_30: { icon: Flame, color: "text-red-500", description: "Maintained a 30-day streak" },
  streak_50: { icon: Flame, color: "text-pink-500", description: "Maintained a 50-day streak" },
  streak_100: { icon: Flame, color: "text-purple-500", description: "Maintained a 100-day streak" },
  streak_300: { icon: Flame, color: "text-violet-500", description: "Maintained a 300-day streak" },
  streak_550: { icon: Flame, color: "text-fuchsia-500", description: "Maintained a 550-day streak" },
  perfect_score: { icon: Target, color: "text-green-500", description: "Scored 100% on a quiz" },
  fast_thinker: { icon: Zap, color: "text-yellow-500", description: "Completed quiz in under 2 minutes" },
  subject_master: { icon: BookOpen, color: "text-blue-500", description: "Completed 10 quizzes in one subject" },
  quiz_master: { icon: Trophy, color: "text-amber-500", description: "Completed 50 total quizzes" },
  xp_legend: { icon: Award, color: "text-indigo-500", description: "Reached 1000 XP" },
};

const Badges = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchBadges();
  }, [user, navigate]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("user_id", user?.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadgeTypes = new Set(badges.map(b => b.badge_type));
  const allBadgeTypes = Object.keys(BADGE_INFO);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">🏆 Achievements</h1>
            <p className="text-muted-foreground">
              Earned {badges.length} of {allBadgeTypes.length} badges
            </p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading badges...</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {allBadgeTypes.map((badgeType) => {
              const earned = earnedBadgeTypes.has(badgeType);
              const badge = badges.find(b => b.badge_type === badgeType);
              const info = BADGE_INFO[badgeType as keyof typeof BADGE_INFO];
              const Icon = info.icon;

              return (
                <Card
                  key={badgeType}
                  className={`transition-all ${
                    earned
                      ? "border-primary shadow-lg"
                      : "opacity-50 grayscale"
                  }`}
                >
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div
                      className={`p-3 rounded-full bg-primary/10 ${
                        earned ? info.color : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {badge?.badge_name || badgeType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </CardHeader>
                  {earned && badge && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Earned on {new Date(badge.earned_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Badges;
