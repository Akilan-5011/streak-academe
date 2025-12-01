import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Flame, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardUser {
  id: string;
  name: string;
  xp: number;
  current_streak: number;
  quiz_count?: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [xpLeaders, setXpLeaders] = useState<LeaderboardUser[]>([]);
  const [streakLeaders, setStreakLeaders] = useState<LeaderboardUser[]>([]);
  const [quizLeaders, setQuizLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchLeaderboards();
  }, [user, navigate]);

  const fetchLeaderboards = async () => {
    try {
      // XP Leaderboard
      const { data: xpData } = await supabase
        .from("profiles")
        .select("id, name, xp, current_streak")
        .order("xp", { ascending: false })
        .limit(10);

      // Streak Leaderboard
      const { data: streakData } = await supabase
        .from("profiles")
        .select("id, name, xp, current_streak")
        .order("current_streak", { ascending: false })
        .limit(10);

      // Quiz Count Leaderboard
      const { data: attemptsData } = await supabase
        .from("attempts")
        .select("user_id, profiles(id, name, xp, current_streak)")
        .order("created_at", { ascending: false });

      // Count quizzes per user
      const quizCounts = new Map<string, LeaderboardUser>();
      attemptsData?.forEach(attempt => {
        const profile = attempt.profiles as any;
        if (profile) {
          const userId = profile.id;
          if (quizCounts.has(userId)) {
            quizCounts.get(userId)!.quiz_count!++;
          } else {
            quizCounts.set(userId, {
              id: userId,
              name: profile.name,
              xp: profile.xp,
              current_streak: profile.current_streak,
              quiz_count: 1,
            });
          }
        }
      });

      const quizData = Array.from(quizCounts.values())
        .sort((a, b) => (b.quiz_count || 0) - (a.quiz_count || 0))
        .slice(0, 10);

      setXpLeaders(xpData || []);
      setStreakLeaders(streakData || []);
      setQuizLeaders(quizData);
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboard = (users: LeaderboardUser[], metric: "xp" | "streak" | "quiz") => {
    const getMedalEmoji = (index: number) => {
      if (index === 0) return "🥇";
      if (index === 1) return "🥈";
      if (index === 2) return "🥉";
      return `#${index + 1}`;
    };

    return (
      <div className="space-y-3">
        {users.map((u, index) => (
          <Card
            key={u.id}
            className={`${
              u.id === user?.id ? "border-primary bg-primary/5" : ""
            }`}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold w-12 text-center">
                  {getMedalEmoji(index)}
                </span>
                <div>
                  <p className="font-semibold">
                    {u.name}
                    {u.id === user?.id && (
                      <span className="ml-2 text-xs text-primary">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {metric === "xp" && `${u.xp} XP`}
                    {metric === "streak" && `${u.current_streak} day streak`}
                    {metric === "quiz" && `${u.quiz_count} quizzes`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">🏆 Leaderboard</h1>
            <p className="text-muted-foreground">Top performers in the learning community</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading leaderboard...</div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="xp" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="xp">
                <Star className="h-4 w-4 mr-2" />
                XP
              </TabsTrigger>
              <TabsTrigger value="streak">
                <Flame className="h-4 w-4 mr-2" />
                Streak
              </TabsTrigger>
              <TabsTrigger value="quizzes">
                <Trophy className="h-4 w-4 mr-2" />
                Quizzes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="xp" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top by Experience Points</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderLeaderboard(xpLeaders, "xp")}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="streak" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top by Current Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderLeaderboard(streakLeaders, "streak")}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quizzes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top by Quiz Count</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderLeaderboard(quizLeaders, "quiz")}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
