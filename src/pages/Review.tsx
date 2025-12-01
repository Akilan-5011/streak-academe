import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface QuestionDetail {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
}

const Review = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const attemptId = location.state?.attemptId;
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!attemptId) {
      navigate("/history");
      return;
    }
    fetchReview();
  }, [user, attemptId, navigate]);

  const fetchReview = async () => {
    try {
      const { data, error } = await supabase
        .from("attempt_details")
        .select(`
          *,
          questions(*)
        `)
        .eq("attempt_id", attemptId);

      if (error) throw error;

      const reviewData = data.map((detail: any) => ({
        id: detail.questions.id,
        question: detail.questions.question,
        option_a: detail.questions.option_a,
        option_b: detail.questions.option_b,
        option_c: detail.questions.option_c,
        option_d: detail.questions.option_d,
        correct_answer: detail.questions.correct_answer,
        user_answer: detail.user_answer,
        is_correct: detail.is_correct,
      }));

      setQuestions(reviewData);
    } catch (error) {
      console.error("Error fetching review:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOptionClass = (option: string, question: QuestionDetail) => {
    const isUserAnswer = question.user_answer === option;
    const isCorrectAnswer = question.correct_answer === option;

    if (isCorrectAnswer) {
      return "border-green-500 bg-green-50 dark:bg-green-950";
    }
    if (isUserAnswer && !isCorrectAnswer) {
      return "border-red-500 bg-red-50 dark:bg-red-950";
    }
    return "border-border";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/history")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">📝 Quiz Review</h1>
            <p className="text-muted-foreground">Review your answers</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading review...</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {questions.map((q, index) => (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-lg">
                      Question {index + 1}
                      {q.is_correct ? (
                        <CheckCircle className="inline ml-2 h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="inline ml-2 h-5 w-5 text-red-500" />
                      )}
                    </CardTitle>
                  </div>
                  <p className="text-base mt-2">{q.question}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["A", "B", "C", "D"].map((option) => {
                    const optionKey = `option_${option.toLowerCase()}` as keyof QuestionDetail;
                    return (
                      <div
                        key={option}
                        className={`p-4 rounded-lg border-2 transition-all ${getOptionClass(
                          option,
                          q
                        )}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-bold">{option}.</span>
                          <span className="flex-1">{q[optionKey]}</span>
                          {q.user_answer === option && !q.is_correct && (
                            <span className="text-red-500 text-sm font-semibold">
                              Your answer
                            </span>
                          )}
                          {q.correct_answer === option && (
                            <span className="text-green-500 text-sm font-semibold">
                              Correct answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4">
              <Button onClick={() => navigate("/history")} className="flex-1">
                Back to History
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="flex-1"
              >
                Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Review;
