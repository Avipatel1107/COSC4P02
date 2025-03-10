import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DiscussionsProps {
  courseId: string;
  courseName: string;
}

interface Post {
  id: string;
  user_id: string;
  course_id: string;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

export default function Discussions({ courseId, courseName }: DiscussionsProps) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function fetchPosts() {
    const { data: discussionsData, error: discussionsError } = await supabase
      .from("discussions")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    if (discussionsError) {
      toast.error("Failed to fetch discussions");
      return;
    }

    // Fetch user profiles for all posts
    const { data: profilesData, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id, first_name, last_name");

    if (profilesError) {
      toast.error("Failed to fetch user profiles");
      return;
    }

    // Combine the discussions with user profiles
    const combinedPosts = discussionsData.map((post: any) => {
      const userProfile = profilesData.find(
        (profile) => profile.user_id === post.user_id
      );
      return {
        ...post,
        first_name: userProfile?.first_name || "Unknown",
        last_name: userProfile?.last_name || "User",
      };
    });

    setPosts(combinedPosts);
  }

  useEffect(() => {
    async function getCurrentUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    }

    getCurrentUser();
    fetchPosts();
  }, [courseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      toast.error("User not authenticated");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("discussions")
      .insert({
        user_id: data.user.id,
        course_id: courseId,
        content: newPost,
      });

    if (error) {
      toast.error("Failed to post discussion");
    } else {
      toast.success("Discussion posted successfully");
      setNewPost("");
      // Fetch updated posts after submission
      fetchPosts(); // Refetch the posts after submitting
    }

    setIsSubmitting(false);
  }

  return (
    <div className="rounded-lg shadow-sm p-4 bg-white dark:bg-gray-800 transition-all hover:shadow-md group mx-4 my-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Discussions for {courseName}</h3>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className={`p-3 rounded-lg flex flex-col space-y-2 ${post.user_id === currentUserId ? "items-end bg-teal-50 dark:bg-teal-800" : "items-start bg-gray-50 dark:bg-gray-800"}`}
          >
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {post.first_name} {post.last_name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300">{post.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <Input
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Write a discussion post..."
          className="mt-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white mt-6 font-medium py-2 px-4 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Post
        </Button>
      </form>
    </div>
  );
}
