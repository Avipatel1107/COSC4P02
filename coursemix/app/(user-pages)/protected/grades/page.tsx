// Author: Russell
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  // Get user's program
  const program = await supabase
    .from("user_profiles")
    .select("program_id")
    .eq("user_id", user.id)
    .single();

  const has_program = program.data && program.data.program_id;
  var program_has;

  // Get all courses that are part of the user's program (provided that exists)
  if (has_program) {
    const courses_p = await supabase
      .from("program_requirements")
      .select("course_code, credit_weight, min_grade, requirement_type, year")
      .eq("program_id", program.data.program_id);
    
    program_has = courses_p.data && courses_p.data.length;
    
    if (program_has) {
      // Sort these courses by year
    }
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

        {
          // If the user does not have a program, show this notice
          has_program ? "" : (
            <div className="bg-yellow-200 rounded-lg shadow-md p-6 border border-yellow-400 text-center">
              <h2 className="text-xl font-bold text-gray-800">No Program Found</h2>
              <p className="text-gray-600 mt-2">
                For best results, please&nbsp;
                <Link href="/protected/profile/edit" className="text-blue-600">
                  select a program
                </Link>.
              </p>
            </div>
          )
        }

        {
          // If the user's program has no data, show this notice
          program_has ? "" : (
            <div className="bg-yellow-200 rounded-lg shadow-md p-6 border border-yellow-400 text-center">
              <h2 className="text-xl font-bold text-gray-800">Sorry About This</h2>
              <p className="text-gray-600 mt-2">Failed to load your program's course requirements.</p>
              <p className="text-gray-600 mt-2">
                Please&nbsp;
                <Link href="/contact" className="text-blue-600">
                  let us know
                </Link>
                &nbsp;that you saw this message and your current program, so that we can fix this issue.
              </p>
            </div>
          )
        }

      </div>
    </main>
  );
}
