'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CoursePrerequisite } from '@/types';

interface CourseRequirement {
  id: string;
  program_id: number;
  year: number;
  course_code: string;
  credit_weight: number;
  requirement_type: string;
  min_grade?: number;
  created_at: string;
  updated_at: string;
}

interface StudentGrade {
  id: string;
  user_id: string;
  course_code: string;
  requirement_id?: string;
  grade: string;
  term: string;
  year: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SuggestedCourse {
  id: string;
  course_code: string;
  year: number;
  requirement_type: string;
}

interface CourseSuggestionsProps {
  userId: string;
}

export default function CourseSuggestions({ userId }: CourseSuggestionsProps) {
  const [loading, setLoading] = useState(true);
  const [suggestedCourses, setSuggestedCourses] = useState<SuggestedCourse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        setLoading(true);
        
        // Step 1: Get the user's program ID
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('program_id')
          .eq('user_id', userId)
          .single();
          
        if (profileError || !userProfile?.program_id) {
          setError('Could not determine user program');
          setLoading(false);
          return;
        }
        
        // Step 2: Fetch program requirements
        const { data: programRequirements, error: requirementsError } = await supabase
          .from('program_requirements')
          .select('*')
          .eq('program_id', userProfile.program_id);
          
        if (requirementsError || !programRequirements) {
          setError('Could not fetch program requirements');
          setLoading(false);
          return;
        }
        
        // Step 3: Fetch student's completed or in-progress courses
        const { data: studentGrades, error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('user_id', userId);
          
        if (gradesError) {
          setError('Could not fetch student grades');
          setLoading(false);
          return;
        }
        
        // Create sets of completed and in-progress course codes for easy lookup
        const completedCourses = new Set<string>();
        const inProgressCourses = new Set<string>();
        
        (studentGrades || []).forEach(grade => {
          if (grade.status === 'completed') {
            completedCourses.add(grade.course_code);
          } else if (grade.status === 'in-progress') {
            inProgressCourses.add(grade.course_code);
          }
        });
        
        // Step 4: Find courses that need to be taken (not completed and not in progress)
        const requiredCourses = programRequirements.filter(requirement => {
          return !(
            completedCourses.has(requirement.course_code) || 
            inProgressCourses.has(requirement.course_code)
          );
        });
        
        // Step 5: Sort by year (ascending) to prioritize earlier year courses
        requiredCourses.sort((a, b) => a.year - b.year);
        
        // Step 6: Prepare to check prerequisites for each potential suggestion
        const { data: allPrerequisites, error: prerequisitesError } = await supabase
          .from('course_prerequisites')
          .select('*');
          
        if (prerequisitesError) {
          setError('Could not fetch course prerequisites');
          setLoading(false);
          return;
        }

        // Create a map for quick prerequisite lookup
        const prerequisiteMap = new Map<string, CoursePrerequisite[]>();
        (allPrerequisites || []).forEach(prereq => {
          if (!prerequisiteMap.has(prereq.course_code)) {
            prerequisiteMap.set(prereq.course_code, []);
          }
          prerequisiteMap.get(prereq.course_code)!.push(prereq);
        });
        
        // Function to check if prerequisites are met for a course
        const arePrerequisitesMet = (courseCode: string): boolean => {
          const prerequisites = prerequisiteMap.get(courseCode);
          
          // If no prerequisites, return true
          if (!prerequisites || prerequisites.length === 0) {
            return true;
          }
          
          // Check if all prerequisites are met
          return prerequisites.every(prereq => {
            // If prerequisite is completed and meets minimum grade requirement
            if (completedCourses.has(prereq.prerequisite_code)) {
              // We don't have access to the actual grade value here
              // In a real implementation, we would check the min_grade requirement
              return true;
            }
            return false;
          });
        };
        
        // Step 7: Filter courses based on prerequisites and limit to 5
        const eligibleCourses = requiredCourses
          .filter(course => arePrerequisitesMet(course.course_code))
          .slice(0, 5)
          .map(course => ({
            id: course.id,
            course_code: course.course_code,
            year: course.year,
            requirement_type: course.requirement_type
          }));
        
        setSuggestedCourses(eligibleCourses);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course suggestions:', err);
        setError('An error occurred while fetching course suggestions');
        setLoading(false);
      }
    }
    
    fetchSuggestions();
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-red-200 dark:border-red-900">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (suggestedCourses.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-600 dark:text-gray-300">No course suggestions available. You may have completed all required courses, or there might not be suitable courses to suggest at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Suggested Courses</h2>
      
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {suggestedCourses.map((course) => (
          <div 
            key={course.id} 
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Year {course.year}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {course.requirement_type.charAt(0).toUpperCase() + course.requirement_type.slice(1)}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{course.course_code}</h3>
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                className="w-full mt-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800"
                onClick={() => {
                  // Find the search input by its type and placeholder
                  const searchInputs = document.querySelectorAll('input[type="text"]');
                  let searchInput = null;
                  
                  // Loop through all text inputs to find the right one
                  for (let i = 0; i < searchInputs.length; i++) {
                    const input = searchInputs[i] as HTMLInputElement;
                    if (input.placeholder && input.placeholder.includes('course code')) {
                      searchInput = input;
                      break;
                    }
                  }
                  
                  if (searchInput) {
                    // Scroll to and focus the search input
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    searchInput.focus();
                    
                    // Clear the input first
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Better simulate user typing by setting the text character by character
                    const courseCode = course.course_code;
                    let currentIndex = 0;
                    
                    // Function to add the next character
                    const typeNextCharacter = () => {
                      if (currentIndex < courseCode.length) {
                        // Add the next character
                        searchInput.value += courseCode[currentIndex];
                        
                        // Dispatch input event
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Increment index and schedule next character
                        currentIndex++;
                        setTimeout(typeNextCharacter, 50);
                      }
                    };
                    
                    // Start the typing simulation after a small delay
                    setTimeout(typeNextCharacter, 100);
                  }
                }}
              >
                Search for Course
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 