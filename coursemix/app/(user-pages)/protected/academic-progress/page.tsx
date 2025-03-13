import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import GradesList from "@/components/academic-progress/GradesList";
import CourseList from "@/components/academic-progress/CourseList";
import { decryptGrade } from "@/utils/grade-utils";
import Link from "next/link";
import { Toaster } from "sonner";
import { getCurrentDateET, formatDate } from "@/utils/date-utils";

export default async function GradesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!userProfile) {
    return redirect("/protected/profile-setup");
  }
  
  // Fetch the user's grades
  const { data: grades, error } = await supabase
    .from("student_grades")
    .select("*")
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .order("term", { ascending: true });
  
  if (error) {
    // console.error("Error fetching grades:", error);
  }
  
  // Decrypt grades for display
  const decryptedGrades: { [id: string]: string } = {};
  
  if (grades) {
    // Keep track of any grades that need to be updated
    const gradesToUpdate: string[] = [];
    
    for (const grade of grades) {
      try {
        // Only attempt to decrypt if the grade field exists and appears to be encrypted
        if (grade.grade && typeof grade.grade === 'string') {
          if (grade.grade.includes(':')) {
            try {
              // Properly handle and log any potential decryption errors
              const decrypted = decryptGrade(grade.grade, user.id);
              decryptedGrades[grade.id] = decrypted;
              // console.log(`Successfully decrypted grade for ${grade.course_code}: ${decrypted}`);
              
              // If the grade has a value but is still marked as "in-progress", mark for status update
              if (grade.status === "in-progress" && decrypted && decrypted.trim() !== '') {
                // console.log(`Marking ${grade.course_code} for status update: in-progress -> completed`);
                gradesToUpdate.push(grade.id);
              }
            } catch (decryptError) {
              // console.error(`Decryption error for ${grade.course_code}:`, decryptError);
              // Store a placeholder value to indicate error
              decryptedGrades[grade.id] = 'Decryption Error';
            }
          } else {
            // For any unencrypted grades
            decryptedGrades[grade.id] = grade.grade;
            // console.log(`Using unencrypted grade for ${grade.course_code}: ${grade.grade}`);
            
            // If the grade has a value but is still marked as "in-progress", mark for status update
            if (grade.status === "in-progress" && grade.grade && grade.grade.trim() !== '') {
              // console.log(`Marking ${grade.course_code} for status update: in-progress -> completed`);
              gradesToUpdate.push(grade.id);
            }
          }
        } else {
          // If grade is missing or null
          decryptedGrades[grade.id] = 'N/A';
          // console.log(`No grade data for ${grade.course_code}`);
        }
      } catch (e) {
        // console.error(`General error processing grade ${grade.id} for ${grade.course_code}:`, e);
        decryptedGrades[grade.id] = 'Error';
      }
    }
    
    // Update any grades that need to be changed from "in-progress" to "completed"
    if (gradesToUpdate.length > 0) {
      // console.log(`Updating ${gradesToUpdate.length} grades from "in-progress" to "completed"`);
      
      // Update grades in bulk
      const { error: updateError } = await supabase
        .from("student_grades")
        .update({ status: "completed" })
        .in("id", gradesToUpdate);
      
      if (updateError) {
        // console.error("Error updating grade statuses:", updateError);
      } else {
        // console.log(`Successfully updated ${gradesToUpdate.length} grades to "completed" status`);
        
        // Update the local grades array to reflect the changes
        grades.forEach(grade => {
          if (gradesToUpdate.includes(grade.id)) {
            grade.status = "completed";
          }
        });
      }
    }
  }
  
  // Debug output all grades and their decrypted values
  // console.log('All grades with decrypted values:');
  // grades?.forEach(grade => {
  //   console.log(`${grade.course_code}: DB value = ${grade.grade}, Decrypted = ${decryptedGrades[grade.id]}, Status = ${grade.status}`);
  // });
  
  // Get user's program
  const { data: programData } = await supabase
    .from("user_profiles")
    .select("program_id")
    .eq("user_id", user.id)
    .single();

  const hasProgram = programData && programData.program_id;
  let programCourses = [];
  let isCoopProgram = false;
  let programInfo = null;

  // Get program information and requirements
  if (hasProgram) {
    // Get program information
    const { data: program, error: programError } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programData.program_id)
      .single();
    
    if (programError) {
      console.error("Error fetching program info:", programError);
    } else {
      programInfo = program;
      // Check if this is a co-op program
      isCoopProgram = program?.coop_program || false;
    }

    // Get program requirements
    const { data: courses, error: coursesError } = await supabase
      .from("program_requirements")
      .select("*")
      .eq("program_id", programData.program_id);
    
    if (coursesError) {
      console.error("Error fetching program courses:", coursesError);
    } else {
      programCourses = courses || [];
    }
  }

  // Fetch work terms if this is a co-op program
  let workTerms = [];
  if (isCoopProgram) {
    const { data: workTermsData, error: workTermsError } = await supabase
      .from("work_terms")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    
    if (workTermsError) {
      console.error("Error fetching work terms:", workTermsError);
    } else {
      workTerms = workTermsData || [];
    }
  }

  // Implement graduation tracking algorithm
  const calculateGraduationProjection = () => {
    // Default values
    const coursesPerTerm = 5; // Standard course load per term
    const totalRequiredCourses = programInfo?.total_credits || 40;
    
    // Count completed and in-progress courses
    const completedCourses = grades?.filter(g => g.status === "completed").length || 0;
    const inProgressCourses = grades?.filter(g => g.status === "in-progress").length || 0;
    
    // Calculate remaining courses after current term
    const currentProgress = completedCourses + inProgressCourses;
    const remainingCoursesAfterCurrentTerm = Math.max(0, totalRequiredCourses - currentProgress);
    const remainingCourses = Math.max(0, totalRequiredCourses - completedCourses);
    
    // Get current date (Ontario timezone)
    const currentDate = getCurrentDateET();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Determine current term based on month
    let currentTerm = "";
    if (currentMonth >= 9 && currentMonth <= 12) {
      currentTerm = "Fall"; // Sept-Dec
    } else if (currentMonth >= 1 && currentMonth <= 4) {
      currentTerm = "Winter"; // Jan-Apr
    } else {
      currentTerm = "Spring/Summer"; // May-Aug
    }
    
    // Find the highest year in program requirements
    let maxYear = 0;
    let finalYearCourseCount = 0;
    let finalYearFallCourseCount = 0;
    let finalYearWinterCourseCount = 0;
    
    // Count courses in each term of the final year
    if (programCourses && programCourses.length > 0) {
      // Find highest year in program
      maxYear = Math.max(...programCourses.map(course => course.year || 0));
      
      // Count courses in final year
      finalYearCourseCount = programCourses.filter(course => course.year === maxYear).length;
      
      // Count courses in final year by term
      finalYearFallCourseCount = programCourses.filter(
        course => course.year === maxYear && course.term === "Fall"
      ).length;
      
      finalYearWinterCourseCount = programCourses.filter(
        course => course.year === maxYear && course.term === "Winter"
      ).length;
    }
    
    // Check if full year is needed for final year
    const needsFinalWinterTerm = finalYearCourseCount > 5 || finalYearWinterCourseCount > 0;
    
    // Calculate terms needed to complete degree
    const termsNeeded = Math.ceil(remainingCoursesAfterCurrentTerm / coursesPerTerm);
    
    // Calculate graduation date
    let graduationYear = currentYear;
    let graduationTerm = currentTerm;
    let graduationMonth = 0;
    
    // Function to advance term
    const advanceTerm = (term: string, year: number) => {
      if (term === "Fall") {
        return { term: "Winter", year: year + 1 };
      } else if (term === "Winter") {
        return { term: "Fall", year: year };
      } else { // Spring/Summer
        return { term: "Fall", year: year };
      }
    };
    
    // If we have in-progress courses, we're in the current term
    if (inProgressCourses > 0) {
      // Start from current term
    } else {
      // Start from next term
      const next = advanceTerm(currentTerm, graduationYear);
      graduationTerm = next.term;
      graduationYear = next.year;
    }
    
    // Advance terms based on number of terms needed
    for (let i = 0; i < termsNeeded; i++) {
      const next = advanceTerm(graduationTerm, graduationYear);
      graduationTerm = next.term;
      graduationYear = next.year;
    }
    
    // Adjust for final year structure if needed
    if (graduationTerm === "Fall" && needsFinalWinterTerm) {
      graduationTerm = "Winter";
      graduationYear = graduationYear + 1;
    }
    
    // Set graduation month based on term
    if (graduationTerm === "Fall") {
      graduationMonth = 12; // December
    } else if (graduationTerm === "Winter") {
      graduationMonth = 4; // April
    }
    
    // Calculate convocation ceremony date
    // Spring convocation is in June, Fall convocation is in October
    let convocationTerm: string;
    let convocationYear = graduationYear;
    
    if (graduationMonth === 12) { // December graduation
      convocationTerm = "Spring";
      convocationYear = graduationYear + 1;
    } else if (graduationMonth === 4) { // April graduation
      convocationTerm = "Spring";
    } else {
      convocationTerm = "Fall";
    }
    
    const graduationDate = new Date(graduationYear, graduationMonth - 1, 15);
    const formattedGraduationDate = formatDate(graduationDate);
    
    // Format display strings
    let studiesCompletionDisplay = "";
    if (graduationTerm === "Fall") {
      studiesCompletionDisplay = `December ${graduationYear}`;
    } else if (graduationTerm === "Winter") {
      studiesCompletionDisplay = `April ${graduationYear}`;
    }
    
    let convocationDisplay = "";
    if (convocationTerm === "Spring") {
      convocationDisplay = `June ${convocationYear}`;
    } else {
      convocationDisplay = `October ${convocationYear}`;
    }
    
    return {
      projectedDate: formattedGraduationDate,
      termDisplay: convocationDisplay, // Keep for backward compatibility - this will be the convocation date
      studiesEndDate: studiesCompletionDisplay, // When studies will finish (April/December)
      convocationDate: convocationDisplay, // When convocation will occur (June/October)
      coursesPerTerm: coursesPerTerm,
      remainingCourses: remainingCourses,
      totalRequiredCourses: totalRequiredCourses,
      isCeremony: true
    };
  };

  // Calculate graduation projection
  const graduationProjection = calculateGraduationProjection();

  return (
    <main className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 min-h-screen py-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Academic Progress</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            View your degree progression and manage your course grades.
          </p>
        </div>

        {/* Grades Overview Section */}
        <div className="mb-8">
          <GradesList 
            grades={grades || []} 
            decryptedGrades={decryptedGrades}
            graduationProjection={graduationProjection}
          />
        </div>

        {/* Program Course Display Section */}
        {hasProgram ? (
          programCourses.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Program Requirements</h2>
              
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center text-sm">
                <div className="text-blue-500 dark:text-blue-400 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </div>
                <div className="text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Pro Tip:</span> Click the <span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full h-4 w-4 text-xs mx-0.5">+</span> icon on any course to mark it as "in progress". This helps you track courses you're currently taking before entering final grades.
                </div>
              </div>
              
              <CourseList 
                courses={programCourses}
                grades={grades || []}
                decryptedGrades={decryptedGrades}
                userId={user.id}
                isCoopProgram={isCoopProgram}
                workTerms={workTerms}
              />
            </div>
          ) : (
            <div className="my-5 bg-blue-100 dark:bg-blue-900/20 rounded-lg shadow-md p-6 border border-blue-200 dark:border-blue-800 text-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Program Selected</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Your program has been selected, but no course requirements were found. 
                Please contact support if you believe this is an error.
              </p>
            </div>
          )
        ) : (
          <div className="my-5 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg shadow-md p-6 border border-yellow-200 dark:border-yellow-800 text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">No Program Selected</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Please <Link href="/protected/profile/edit" className="text-blue-600 dark:text-blue-400 hover:underline">select a program</Link> to view your degree requirements.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
