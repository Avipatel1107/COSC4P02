// Author: Russell
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Grades () {
  // This line has been borrowed from other pages "^w^
  const supabase = await createClient();
  
  // User must be signed in to proceed
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    // Means user isn't signed in
    return redirect("/sign-in");
  }

  return (
    <main className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Input Grades</h1>
          <p className="text-gray-600 mt-2">
            Input the grades of your previously completed courses for further guidance
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-center">This page is under construction!</h2>
          <p className="text-center">Please check back later.</p>
        </div>
      </div>
    </main>
  );
}
