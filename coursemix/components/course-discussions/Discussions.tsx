import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter } from "bad-words"; // Import the bad-words package

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
  const supabase = createClient(); // Initialize Supabase client
  const [posts, setPosts] = useState<Post[]>([]); // State to store discussion posts
  const [newPost, setNewPost] = useState(""); // State to store new post content
  const [isSubmitting, setIsSubmitting] = useState(false); // State to manage form submission
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // State to store current user ID
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State to manage error messages
  const [filterKeyword, setFilterKeyword] = useState<string>(""); // State to manage keyword filter
  const [filterStartDate, setFilterStartDate] = useState<string>(""); // State to manage start date filter
  const [filterTime, setFilterTime] = useState<string>(""); // State to manage time filter


  const profFilter = new Filter(); // Initialize the bad-words filter

  // Function to fetch discussion posts and user profiles
  async function fetchPosts() {
    // Fetch discussion posts for the selected course
    const { data: discussionsData, error: discussionsError } = await supabase
      .from("discussions")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    if (discussionsError) {
      setErrorMessage("Failed to fetch discussions. Please try again later.");
      return;
    }

    // Fetch user profiles for all posts
    const { data: profilesData, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id, first_name, last_name");

    if (profilesError) {
      setErrorMessage("Failed to fetch user profiles. Please try again later.");
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

    setPosts(combinedPosts); // Update the posts state with combined data
  }

  // useEffect to fetch current user and posts when the component mounts or courseId changes
  useEffect(() => {
    async function getCurrentUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id); // Set the current user ID
      }
    }

    getCurrentUser(); // Fetch current user
    fetchPosts(); // Fetch posts
  }, [courseId]);

  // Filter posts based on the filter state
  const filteredPosts = posts.filter((post) => {
    const postDate = new Date(post.created_at).toISOString().split("T")[0]; // Extract the date in YYYY-MM-DD format
    const matchesKeyword = post.content
      .toLowerCase()
      .includes(filterKeyword.toLowerCase());
    const matchesDate = !filterStartDate || postDate === filterStartDate; // Compare the extracted date with the filterStartDate
    const matchesTime =
      !filterTime || new Date(post.created_at).toTimeString().startsWith(filterTime);
    return matchesKeyword && matchesDate && matchesTime;
  });

  // Function to clear all filters
  const clearFilters = () => {
    setFilterKeyword("");
    setFilterStartDate("");
    setFilterTime("");
  };


  //console.log(profFilter.list)

  // Function to handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // Prevent default form submission
    setIsSubmitting(true); // Set submitting state to true
    setErrorMessage(null); // Clear any previous error messages
  
    // Check if the post is empty
    if (!newPost.trim()) {
      setErrorMessage("Your post cannot be empty. Please write something.");
      setIsSubmitting(false);
      return; // Stop submission
    }
  
    // Check for inappropriate content
    if (profFilter.isProfane(newPost)) {
      setErrorMessage("Your post contains inappropriate content. Please revise it.");
      setIsSubmitting(false);
      return; // Stop submission
    }
  
    // Get the current user
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      setErrorMessage("User not authenticated. Please log in.");
      setIsSubmitting(false);
      return;
    }
  
    // Insert new post into the discussions table
    const { error } = await supabase
      .from("discussions")
      .insert({
        user_id: data.user.id,
        course_id: courseId,
        content: newPost,
      });
  
    if (error) {
      setErrorMessage("Failed to post discussion. Please try again later.");
    } else {
      setNewPost(""); // Clear the new post input
      fetchPosts(); // Refetch the posts after submitting
    }
  
    setIsSubmitting(false); // Set submitting state to false
  }
  

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 rounded-lg shadow-sm p-4 bg-gray-100 dark:bg-gray-800 transition-all hover:shadow-md group">
        {/* Title for the discussions section */}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Discussions for {courseName}
        </h3>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md dark:bg-red-800 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Container for displaying discussion posts */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="flex flex-col items-start">
              {/* Display user name and post timestamp */}
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-black dark:text-gray-100">
                  {post.first_name} {post.last_name}
                </span>
                <span className="text-sm text-black dark:text-gray-400">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </div>
              {/* Display post content */}
              <div
                className={`p-2 rounded-lg ${
                  post.user_id === currentUserId
                    ? "bg-teal-700 dark:bg-teal-800"
                    : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <p className="text-black dark:text-gray-300">{post.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form for submitting a new discussion post */}
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
            className="bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white mt-6 font-medium py-2 px-4 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Post
          </Button>
        </form>
      </div>

      {/* Filter Sidebar */}
      <div className="w-full md:w-64 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Filters
        </h3>

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

        {/* Date Filter */}
        <div className="mb-4">
          <label
            htmlFor="start-date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Date
          </label>
          <Input
            id="start-date"
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Time Filter */}
        <div className="mb-4">
          <label
            htmlFor="time-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Time
          </label>
          <Input
            id="time-filter"
            type="time"
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Clear Filters Button */}
        <Button
          onClick={clearFilters}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 shadow-sm hover:shadow-md w-full"
        >
          Clear Filters
        </Button>

        <p className="text-gray-600 dark:text-gray-300 mt-4">
          Use the filters to narrow down the posts by keywords, date, or time.
        </p>
      </div>
    </div>
  );
}
