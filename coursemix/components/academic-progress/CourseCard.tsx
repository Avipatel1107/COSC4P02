"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveGradeAction, deleteGradeAction, forceDeleteGradeAction } from "@/app/academic-progress-actions";
import { useRouter } from "next/navigation";

interface CourseCardProps {
  courseCode: string;
  creditWeight: number;
  minGrade?: string;
  requirementType?: string;
  existingGrade?: string;
  userId: string;
  gradeId?: string;
}

export default function CourseCard({
  courseCode,
  creditWeight,
  minGrade,
  requirementType,
  existingGrade,
  userId,
  gradeId,
}: CourseCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [grade, setGrade] = useState(existingGrade || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasGrade, setHasGrade] = useState(!!existingGrade);
  const router = useRouter();
  
  // Update local state when props change
  useEffect(() => {
    setGrade(existingGrade || "");
    setHasGrade(!!existingGrade);
  }, [existingGrade]);

  const handleSaveGrade = async () => {
    if (!grade.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the server action to save the grade
      const result = await saveGradeAction(courseCode, grade, userId);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Grade saved successfully");
        setIsEditing(false);
        setHasGrade(true);
        // Refresh the page data
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving grade:", error);
      toast.error("Failed to save grade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGrade = async () => {
    if (!confirm("Are you sure you want to delete this grade?")) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let result;
      
      if (!gradeId) {
        toast.error("Cannot delete grade: missing ID");
        setIsSubmitting(false);
        return;
      }
      
      console.log(`Attempting to delete grade with ID: ${gradeId}`);
      
      // Primary method: use deleteGradeAction with the grade ID
      const formData = new FormData();
      formData.append('grade_id', gradeId);
      
      result = await deleteGradeAction(formData);
      
      // If the primary method fails, try the force delete method
      if ('error' in result && result.error) {
        console.log("Primary delete method failed, trying force delete method:", result.error);
        
        // Force delete method
        const forceFormData = new FormData();
        forceFormData.append('grade_id', gradeId);
        result = await forceDeleteGradeAction(forceFormData);
        
        // If force delete also fails, try the saveGradeAction with empty string
        if ('error' in result && result.error) {
          console.log("Force delete method failed, trying empty grade method:", result.error);
          
          // Final fallback: use saveGradeAction with empty string to clear the grade
          result = await saveGradeAction(courseCode, "", userId);
        }
      }
      
      if ('error' in result && result.error) {
        toast.error(result.error);
      } else {
        // Update local state immediately
        setGrade("");
        setHasGrade(false);
        
        toast.success("Grade deleted successfully");
        
        // Force a complete refresh to ensure data is reloaded from the server
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error("Error deleting grade:", error);
      toast.error("Failed to delete grade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = () => {
    if (!existingGrade) return "border-gray-200 bg-white";
    
    const gradeToCheck = existingGrade;
    const numericGrade = parseFloat(gradeToCheck);
    
    // Convert letter grades to numeric values for comparison
    const getNumericValue = (grade: string) => {
      const letterGrades: { [key: string]: number } = {
        'A+': 90, 'A': 85, 'A-': 80,
        'B+': 77, 'B': 73, 'B-': 70,
        'C+': 67, 'C': 63, 'C-': 60,
        'D+': 57, 'D': 53, 'D-': 50,
        'F': 0
      };
      return letterGrades[grade.toUpperCase()] || 0;
    };

    // If there's a minimum grade requirement
    if (minGrade) {
      const studentGradeValue = isNaN(numericGrade) ? getNumericValue(gradeToCheck) : numericGrade;
      const minGradeValue = isNaN(parseFloat(minGrade)) ? getNumericValue(minGrade) : parseFloat(minGrade);
      
      return studentGradeValue >= minGradeValue 
        ? "border-green-400 bg-green-50" 
        : "border-red-400 bg-red-50";
    }
    
    // If no minimum grade requirement, check if passing (>= 50)
    if (isNaN(numericGrade)) {
      // For letter grades
      const numericValue = getNumericValue(gradeToCheck);
      return numericValue >= 50 
        ? "border-green-400 bg-green-50" 
        : "border-red-400 bg-red-50";
    } else {
      // For numeric grades
      return numericGrade >= 50 
        ? "border-green-400 bg-green-50" 
        : "border-red-400 bg-red-50";
    }
  };

  return (
    <div className={`rounded-lg shadow-md p-4 border ${getStatusColor()} transition-all hover:shadow-lg`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-800">{courseCode}</h3>
          <div className="text-sm text-gray-600 mt-1">
            <span className="font-medium">{creditWeight} credits</span>
            {minGrade && (
              <span className="ml-2">
                • Min. grade: <span className="font-medium">{minGrade}</span>
              </span>
            )}

            
            {requirementType && (
              <div className="mt-1">
                <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
                  {requirementType}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          {isEditing ? (
            <div className="flex flex-col items-end gap-2">
              <Input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Enter grade"
                className="w-24 text-right"
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSaveGrade}
                  disabled={isSubmitting}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {hasGrade && existingGrade ? (
                <div>
                  <div className="text-xl font-bold">
                    {existingGrade}
                  </div>
                  <div className="flex gap-2 mt-1 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                    {gradeId && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                        onClick={handleDeleteGrade}
                        disabled={isSubmitting}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Add Grade
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 