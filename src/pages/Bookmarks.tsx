import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface BookmarkedQuestion {
  id: string;
  question_id: string;
  created_at: string;
  questions: {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    difficulty: string;
    subjects: {
      name: string;
    };
  };
}

const Bookmarks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchBookmarks();
  }, [user, navigate]);

  const fetchBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select(`
          *,
          questions(
            *,
            subjects(name)
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId);

      if (error) throw error;

      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
      toast({
        title: "Bookmark removed",
        description: "Question removed from your saved questions",
      });
    } catch (error) {
      console.error("Error removing bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === "easy") return "text-green-500";
    if (difficulty === "hard") return "text-red-500";
    return "text-yellow-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              <Bookmark className="inline h-8 w-8 mr-2" />
              Saved Questions
            </h1>
            <p className="text-muted-foreground">
              {bookmarks.length} question{bookmarks.length !== 1 ? "s" : ""} bookmarked
            </p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading bookmarks...</div>
            </CardContent>
          </Card>
        ) : bookmarks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No saved questions yet</h3>
              <p className="text-muted-foreground mb-4">
                Bookmark difficult questions during quizzes to review them later
              </p>
              <Button onClick={() => navigate("/subjects")}>
                Take a Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {bookmark.questions.subjects.name}
                        <span className={`ml-3 text-sm font-normal ${getDifficultyColor(bookmark.questions.difficulty)}`}>
                          {bookmark.questions.difficulty}
                        </span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Saved on {new Date(bookmark.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBookmark(bookmark.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-base mt-4">{bookmark.questions.question}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["A", "B", "C", "D"].map((option) => {
                    const optionKey = `option_${option.toLowerCase()}` as "option_a" | "option_b" | "option_c" | "option_d";
                    const isCorrect = bookmark.questions.correct_answer === option;
                    return (
                      <div
                        key={option}
                        className={`p-3 rounded-lg border ${
                          isCorrect
                            ? "border-green-500 bg-green-50 dark:bg-green-950"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-bold">{option}.</span>
                          <span className="flex-1">{bookmark.questions[optionKey]}</span>
                          {isCorrect && (
                            <span className="text-green-500 text-sm font-semibold">
                              Correct
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookmarks;
