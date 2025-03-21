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
  created_at: string;
}

export default function ReviewForm({ courseId, courseName }: ReviewFormProps) {
  const [review, setReview] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  const [filterSort, setFilterSort] = useState<string>(""); // "latest", "oldest", or ""
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");

  useEffect(() => {
    async function fetchReviews() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("course_id", courseId);

      if (data) setReviews(data);
    }
    fetchReviews();
  }, [courseId]);

  // Filter logic
  const filteredReviews = reviews
    .filter((review) => {
      const matchesKeyword = review.review
        .toLowerCase()
        .includes(filterKeyword.toLowerCase());
      const matchesDifficulty =
        !filterDifficulty || review.difficulty === filterDifficulty;
      return matchesKeyword && matchesDifficulty;
    })
    .sort((a, b) => {
      if (filterSort === "latest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (filterSort === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

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

  // Clear filters
  const clearFilters = () => {
    setFilterKeyword("");
    setFilterSort("");
    setFilterDifficulty("");
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Reviews for {courseName}
        </h3>

        {/* Filtered Reviews */}
        {filteredReviews.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No reviews match the filters.</p>
        ) : (
          <ul className="space-y-2">
            {filteredReviews.map((r) => (
              <li key={r.id} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <span className="text-gray-600 dark:text-gray-300">{r.review}</span>
                <br />
                <span
                  className={`text-sm px-2 py-1 rounded-full ${getDifficultyColor(
                    r.difficulty
                  )}`}
                >
                  Difficulty: {r.difficulty}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Review Form */}
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
                className={`${
                  difficulty === level
                    ? getDifficultyColor(level)
                    : "bg-gray-300 dark:bg-gray-600"
                } text-white`}
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

      {/* Filter Sidebar */}
      <div className="w-full md:w-64 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Filters
        </h4>

        {/* Keyword Filter */}
        <div className="mb-4">
          <label
            htmlFor="keyword-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Keyword
          </label>
          <Input
            id="keyword-filter"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="Search by keyword..."
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Difficulty Filter */}
        <div className="mb-4">
          <label
            htmlFor="difficulty-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Difficulty
          </label>
          <select
            id="difficulty-filter"
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">All</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div className="mb-4">
          <label
            htmlFor="sort-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Sort By
          </label>
          <select
            id="sort-filter"
            value={filterSort}
            onChange={(e) => setFilterSort(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">None</option>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <Button
          onClick={clearFilters}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 shadow-sm hover:shadow-md w-full"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
