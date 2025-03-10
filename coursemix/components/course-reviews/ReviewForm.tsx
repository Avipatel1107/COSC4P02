import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ReviewFormProps {
  courseId: string;
  courseName: string;
}

interface Review {
  id: string;
  user_id: string;
  course_id: string;
  review: string;
  difficulty: string;
}

export default function ReviewForm({ courseId, courseName }: ReviewFormProps) {
  const [review, setReview] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchReviews() {
      const supabase = createClient();
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("course_id", courseId);
      if (data) setReviews(data);
    }
    fetchReviews();
  }, [courseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("User not authenticated");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        course_id: courseId,
        review,
        difficulty,
      });

    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success("Review submitted successfully");
      setReview("");
      setDifficulty("");
      // Fetch the updated reviews
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("course_id", courseId);
      if (data) setReviews(data);
    }

    setIsSubmitting(false);
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-500 hover:bg-green-600";
      case "Medium":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "Hard":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Reviews for {courseName}</h3>
      {reviews.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">No reviews yet.</p>
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">{r.review}</span>
              <br />
              <span className={`text-sm px-2 py-1 rounded-full ${getDifficultyColor(r.difficulty)}`}>
                Difficulty: {r.difficulty}
              </span>
            </li>
          ))}
        </ul>
      )}
      
      <form onSubmit={handleSubmit}>
        <Input 
          value={review} 
          onChange={(e) => setReview(e.target.value)} 
          placeholder="Write a review..." 
          className="mt-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />

        <div className="mt-4 space-x-2">
          {["Easy", "Medium", "Hard"].map((level) => (
            <Button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              className={`${difficulty === level ? getDifficultyColor(level) : "bg-gray-300 dark:bg-gray-600"} text-white`}
            >
              {level}
            </Button>
          ))}
        </div>
        
        <Button 
          type="submit"
          disabled={isSubmitting || !difficulty}
          className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white mt-6 font-medium py-2 px-4 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Submit Review
        </Button>
      </form>
    </div>
  );
}