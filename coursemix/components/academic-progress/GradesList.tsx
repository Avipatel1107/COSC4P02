'use client';

import { useState, useEffect } from 'react';
import { numericToLetterGrade, calculateGPA } from '@/utils/grade-utils';
import { updateGradeAction, deleteGradeAction, forceDeleteGradeAction } from '@/app/academic-progress-actions';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

type TermType = 'Fall' | 'Winter' | 'Spring' | 'Summer';

interface Grade {
  id: string;
  course_code: string;
  year: number;
  term: TermType;
  status: 'completed' | 'in-progress';
  decryptedValue?: string;
}

interface WorkTerm {
  id: string;
  user_id: string;
  term_name: string;
  company_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface GroupedGrades {
  [year: number]: {
    [term in TermType]?: Grade[];
  };
}

interface GradesListProps {
  grades: Grade[];
  decryptedGrades: { [id: string]: string };
  graduationProjection?: {
    projectedDate?: string;
    termDisplay: string;
    coursesPerTerm: number;
    remainingCourses: number;
    totalRequiredCourses: number;
    isCeremony?: boolean;
  };
  userProfile?: {
    first_name: string;
    last_name: string;
    student_number?: string;
  };
  program?: {
    program_name: string;
    coop_program?: boolean;
  };
  workTerms?: WorkTerm[];
}

export default function GradesList({ 
  grades, 
  decryptedGrades, 
  graduationProjection, 
  userProfile, 
  program,
  workTerms = []
}: GradesListProps) {
  const router = useRouter();
  const [editGradeId, setEditGradeId] = useState<string | null>(null);
  const [editGradeValue, setEditGradeValue] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  
  // Debug log to check grades and decrypted grades
  useEffect(() => {
    // console.log('Grades from database:', grades);
    // console.log('Decrypted grades mapping:', decryptedGrades);
    
    // Check if any grades are missing from decryptedGrades
    const missingDecryptions = grades.filter(grade => !decryptedGrades[grade.id]);
    if (missingDecryptions.length > 0) {
      setDebugInfo(`Some grades might have decryption issues: ${missingDecryptions.map(g => g.course_code).join(', ')}`);
      // console.warn('Grades missing decryption:', missingDecryptions);
    }
    
    // Debug log to check userProfile and program data
    console.log('GradesList - User Profile:', userProfile);
    console.log('GradesList - Program:', program);
    
    // Check if userProfile or program data is missing
    if (!userProfile) {
      setDebugInfo(prev => `${prev ? prev + ' | ' : ''}User profile data is missing`);
    }
    
    if (!program) {
      setDebugInfo(prev => `${prev ? prev + ' | ' : ''}Program data is missing`);
    }
  }, [grades, decryptedGrades, userProfile, program]);
  
  // Group grades by year and term
  const groupedGrades: GroupedGrades = {};
  
  grades.forEach(grade => {
    if (!groupedGrades[grade.year]) {
      groupedGrades[grade.year] = {};
    }
    
    if (!groupedGrades[grade.year][grade.term as TermType]) {
      groupedGrades[grade.year][grade.term as TermType] = [];
    }
    
    // Use type assertion to fix TypeScript error
    const termGrades = groupedGrades[grade.year][grade.term as TermType];
    if (termGrades) {
      termGrades.push(grade);
    }
  });
  
  // Sort years in descending order (most recent first)
  const sortedYears = Object.keys(groupedGrades)
    .map(Number)
    .sort((a, b) => b - a);
  
  // Calculate GPA for each term and year
  const termGPAs: { [key: string]: number } = {};
  const yearGPAs: { [key: number]: number } = {};
  const allGrades: string[] = [];
  const numericGrades: number[] = []; // Add array to store numeric grades
  
  // Process each grade for GPA calculation
  grades.forEach(grade => {
    const decryptedGrade = decryptedGrades[grade.id];
    
    // console.log(`Processing grade: ${grade.course_code}, Status: ${grade.status}, Decrypted value: ${decryptedGrade}`);
    
    // Only include completed courses with valid grades
    if (grade.status === 'completed' && decryptedGrade && decryptedGrade !== 'Error' && decryptedGrade !== 'Decryption Error' && decryptedGrade !== 'N/A') {
      // console.log(`Including ${grade.course_code} in GPA calculation with value: ${decryptedGrade}`);
      
      // Create term key in format "YEAR-TERM"
      const termKey = `${grade.year}-${grade.term}`;
      
      // Store numeric grade if it's a number, or convert letter grade to estimated numeric value
      let numericGrade: number | null = null;
      
      if (!isNaN(Number(decryptedGrade))) {
        numericGrade = Number(decryptedGrade);
        // Ensure grade doesn't exceed 100
        numericGrade = Math.min(numericGrade, 100);
        numericGrades.push(numericGrade); // Add to numeric grades array
        // console.log(`Added numeric grade: ${numericGrade}`);
      } else {
        // Estimate numeric value based on letter grade (midpoint of range)
        switch(decryptedGrade) {
          case 'A+': numericGrade = 95; break;
          case 'A': numericGrade = 87.5; break;
          case 'A-': numericGrade = 82.5; break;
          case 'B+': numericGrade = 77.5; break;
          case 'B': numericGrade = 75; break;
          case 'B-': numericGrade = 72.5; break;
          case 'C+': numericGrade = 67.5; break;
          case 'C': numericGrade = 65; break;
          case 'C-': numericGrade = 62.5; break;
          case 'D+': numericGrade = 57.5; break;
          case 'D': numericGrade = 55; break;
          case 'D-': numericGrade = 52.5; break;
          case 'F': numericGrade = 45; break;
          default: numericGrade = null;
        }
        
        if (numericGrade !== null) {
          numericGrades.push(numericGrade);
        }
      }
      
      // Convert numeric grades to letter grades if needed
      let letterGrade = decryptedGrade;
      if (!isNaN(Number(decryptedGrade))) {
        letterGrade = numericToLetterGrade(Number(decryptedGrade));
      }
      
      // Add to all grades
      allGrades.push(letterGrade);
      
      // Add to term-specific grades collection
      if (!termGPAs[termKey]) {
        // Initialize with the first grade in this term
        termGPAs[termKey] = calculateGPA([letterGrade]);
      } else {
        // Re-collect all letter grades for this term to recalculate accurately
        const termLetterGrades: string[] = [];
        
        // Find all grades in this term and collect their letter grades
        grades.filter(g => 
          g.status === 'completed' && 
          g.year === grade.year && 
          g.term === grade.term &&
          decryptedGrades[g.id]
        ).forEach(g => {
          let lg = decryptedGrades[g.id];
          if (!isNaN(Number(lg))) {
            lg = numericToLetterGrade(Number(lg));
          }
          termLetterGrades.push(lg);
        });
        
        // Recalculate the term GPA with all grades for this term
        termGPAs[termKey] = calculateGPA(termLetterGrades);
      }
      
      // Add to year-specific grades collection
      if (!yearGPAs[grade.year]) {
        // Initialize with the first grade in this year
        yearGPAs[grade.year] = calculateGPA([letterGrade]);
      } else {
        // Re-collect all letter grades for this year to recalculate accurately
        const yearLetterGrades: string[] = [];
        
        // Find all grades in this year and collect their letter grades
        grades.filter(g => 
          g.status === 'completed' && 
          g.year === grade.year &&
          decryptedGrades[g.id]
        ).forEach(g => {
          let lg = decryptedGrades[g.id];
          if (!isNaN(Number(lg))) {
            lg = numericToLetterGrade(Number(lg));
          }
          yearLetterGrades.push(lg);
        });
        
        // Recalculate the year GPA with all grades for this year
        yearGPAs[grade.year] = calculateGPA(yearLetterGrades);
      }
    }
  });
  
  // Calculate overall GPA using all grades correctly
  const overallGPA = calculateGPA(allGrades);
  
  // Calculate numerical average
  const numericalAverage = numericGrades.length 
    ? numericGrades.reduce((sum, grade) => sum + grade, 0) / numericGrades.length 
    : 0;
  
  // Start edit handler
  const handleStartEdit = (grade: Grade) => {
    // console.log(`Starting edit for grade: ${grade.id}, Course: ${grade.course_code}, Current value: ${decryptedGrades[grade.id]}`);
    setEditGradeId(grade.id);
    setEditGradeValue(decryptedGrades[grade.id] || '');
    
    // Default to "completed" status when editing a grade
    setEditStatus("completed");
  };
  
  // Cancel edit handler
  const handleCancelEdit = () => {
    // console.log('Cancelling edit');
    setEditGradeId(null);
    setEditGradeValue('');
    setEditStatus('');
    setError(null);
  };
  
  // Save edit handler
  const handleSaveEdit = async () => {
    if (!editGradeId) return;
    
    // Validate grade value
    if (!isNaN(Number(editGradeValue)) && Number(editGradeValue) > 100) {
      setError('Grade cannot exceed 100. Please enter a valid grade.');
      return;
    }
    
    // Always set status to "completed" when saving a grade
    const statusToSave = "completed";
    
    // console.log(`Saving grade: ${editGradeId}, New value: ${editGradeValue}, Status: ${statusToSave}`);
    
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('grade_id', editGradeId);
    formData.append('grade', editGradeValue);
    formData.append('status', statusToSave);
    
    // console.log('Submitting grade update:', {
    //   grade_id: editGradeId,
    //   grade: editGradeValue,
    //   status: statusToSave
    // });
    
    const result = await updateGradeAction(formData);
    
    setIsSubmitting(false);
    
    if ('error' in result && result.error) {
      setError(result.error);
      // console.error('Error updating grade:', result.error);
    } else {
      setSuccess('Grade updated successfully');
      setEditGradeId(null);
      setEditGradeValue('');
      setEditStatus('');
      
      // console.log('Grade update successful, forcing page reload');
      
      // Force a complete refresh to ensure UI updates properly
      window.location.reload();
    }
  };
  
  // Delete handler
  const handleDelete = async (gradeId: string) => {
    if (!confirm('Are you sure you want to delete this grade?')) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('grade_id', gradeId);
    
    try {
      // console.log(`Attempting to delete grade with ID: ${gradeId}`);
      
      // Try the standard delete method first
      let result = await deleteGradeAction(formData);
      
      // If that fails, try the force delete method
      if ('error' in result && result.error) {
        // console.log("Standard delete failed, trying force delete:", result.error);
        result = await forceDeleteGradeAction(formData);
      }
      
      setIsSubmitting(false);
      
      if ('error' in result && result.error) {
        // console.error("All delete methods failed:", result.error);
        setError(result.error);
      } else {
        setSuccess('Grade deleted successfully');
        
        // Force a complete refresh to ensure UI updates properly
        window.location.reload();
      }
    } catch (error) {
      // console.error('Error deleting grade:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Status color mapping
  const statusColors: { [key: string]: string } = {
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  };
  
  // Calculate progress towards degree (40 courses total)
  const completedCourses = grades.filter(g => g.status === 'completed').length;
  const inProgressCourses = grades.filter(g => g.status === 'in-progress').length;
  const totalCourses = completedCourses + inProgressCourses;
  const remainingCourses = Math.max(0, 40 - totalCourses);
  
  // Calculate percentage complete and in progress
  const percentComplete = Math.min(100, Math.round((completedCourses / 40) * 100));
  const percentInProgress = Math.min(100 - percentComplete, Math.round((inProgressCourses / 40) * 100));
  const totalPercentage = percentComplete + percentInProgress;
  
  // Export transcript to PDF
  const exportTranscript = async () => {
    setExportingPdf(true);
    setError(null);
    
    try {
      // Debug log to check grades and their status
      console.log('Exporting transcript with grades:', grades.map(g => ({
        course: g.course_code,
        status: g.status,
        decrypted: decryptedGrades[g.id]
      })));
      
      // Debug log to check userProfile and program data
      console.log('PDF Export - User Profile:', userProfile);
      console.log('PDF Export - Program:', program);
      
      // Debug log to check work terms
      console.log('Work terms for transcript:', workTerms);
      console.log('Is co-op program:', program?.coop_program);
      
      // Filter grades that should be included in the transcript
      const gradesForTranscript = grades.filter(grade => {
        const decryptedValue = decryptedGrades[grade.id];
        // Skip if no decrypted value
        if (!decryptedValue || 
            decryptedValue === 'N/A' || 
            decryptedValue === 'Error' || 
            decryptedValue === 'Decryption Error' ||
            decryptedValue.trim() === '') {
          return false;
        }
        
        // Include if the grade is marked as completed OR has a valid grade value
        return grade.status === 'completed' || decryptedValue.trim() !== '';
      });
      
      // Group grades by year and term for the transcript
      const transcriptGrades: { [year: number]: { [term: string]: Grade[] } } = {};
      
      gradesForTranscript.forEach(grade => {
        if (!transcriptGrades[grade.year]) {
          transcriptGrades[grade.year] = {};
        }
        if (!transcriptGrades[grade.year][grade.term]) {
          transcriptGrades[grade.year][grade.term] = [];
        }
        transcriptGrades[grade.year][grade.term].push(grade);
      });
      
      // Create the PDF document
      const doc = new jsPDF();
      
      // Set font to Times New Roman
      doc.setFont("times", "normal");
      
      // Add header
      doc.setFontSize(25);
      doc.text('Academic Transcript', 105, 20, { align: 'center' });
      
      // Debug log to check userProfile and program data
      console.log('PDF Generation - User Profile:', userProfile);
      console.log('PDF Generation - Program:', program);
      
      // Add student information with more robust checks
      doc.setFontSize(12);
      
      // Always display student information section, even if data is missing
      doc.text('Student Information', 20, 30);
      
      if (userProfile) {
        // Display name if available
        if (userProfile.first_name || userProfile.last_name) {
          doc.text(`Name: ${userProfile.first_name || ''} ${userProfile.last_name || ''}`, 20, 40);
        } else {
          doc.text('Name: Not available', 20, 40);
        }
        
        // Display student number if available
        if (userProfile.student_number) {
          doc.text(`Student Number: ${userProfile.student_number}`, 20, 50);
        } else {
          doc.text('Student Number: Not available', 20, 50);
        }
      } else {
        doc.text('Name: Not available', 20, 40);
        doc.text('Student Number: Not available', 20, 50);
      }
      
      // Display program information if available
      if (program && program.program_name) {
        doc.text(`Program: ${program.program_name}`, 20, 60);
      } else {
        doc.text('Program: Not specified', 20, 60);
      }
      
      // Add degree progress statistics
      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text('Degree Progress', 20, 75);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      // Calculate statistics
      const completedCourses = grades.filter(g => g.status === 'completed').length;
      const inProgressCourses = grades.filter(g => g.status === 'in-progress').length;
      const totalCourses = completedCourses + inProgressCourses;
      const remainingCourses = Math.max(0, 40 - totalCourses);
      const percentComplete = Math.min(100, Math.round((completedCourses / 40) * 100));
      
      // Calculate GPA
      const allGrades: string[] = [];
      grades.forEach(grade => {
        const decryptedGrade = decryptedGrades[grade.id];
        if (grade.status === 'completed' && decryptedGrade && decryptedGrade !== 'Error' && decryptedGrade !== 'Decryption Error' && decryptedGrade !== 'N/A') {
          let letterGrade = decryptedGrade;
          if (!isNaN(Number(decryptedGrade))) {
            letterGrade = numericToLetterGrade(Number(decryptedGrade));
          }
          allGrades.push(letterGrade);
        }
      });
      const overallGPA = calculateGPA(allGrades);
      
      // Add statistics table
      autoTable(doc, {
        startY: 80,
        head: [['Category', 'Progress']],
        body: [
          ['Completed Courses', completedCourses.toString()],
          ['In Progress Courses', inProgressCourses.toString()],
          ['Remaining Courses', remainingCourses.toString()],
          ['Overall Degree Progress', `${percentComplete}%`],
          ['Overall GPA', overallGPA.toFixed(2)]
        ],
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'times',
          halign: 'center'
        },
        styles: { 
          fontSize: 10,
          cellPadding: 3,
          font: 'times'
        },
        columnStyles: {
          1: { halign: 'center' } // Center the Progress column
        },
        margin: { left: 20 },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
      
      // Add work terms section if this is a co-op program
      let yPos = doc.lastAutoTable.finalY + 20;
      
      // Check if this is a co-op program and work terms exist
      if (program?.coop_program && workTerms && workTerms.length > 0) {
        // Add work terms header
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text('Co-op Work Terms', 20, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 10;
        
        // Sort work terms alphabetically by term name
        const sortedWorkTerms = [...workTerms].sort((a, b) => {
          return a.term_name.localeCompare(b.term_name);
        });
        
        // Prepare work terms data
        const workTermsData = sortedWorkTerms.map(term => [
          term.term_name,
          term.company_name || 'N/A',
          term.status === 'completed' ? 'Completed' : 'In Progress'
        ]);
        
        // Add work terms table
        autoTable(doc, {
          startY: yPos,
          head: [['Term', 'Company', 'Status']],
          body: workTermsData,
          theme: 'grid',
          headStyles: { 
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            font: 'times',
            halign: 'center'
          },
          styles: { 
            fontSize: 10,
            cellPadding: 3,
            font: 'times'
          },
          columnStyles: {
            1: { halign: 'center' }, // Center the Company column
            2: { halign: 'center' }  // Center the Status column
          },
          margin: { left: 20 },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
        
        yPos = doc.lastAutoTable.finalY + 20;
      }
      
      // Add grades by term
      const years = Object.keys(transcriptGrades).map(Number).sort((a, b) => b - a);
      
      for (const year of years) {
        const terms = Object.keys(transcriptGrades[year]).sort();
        
        for (const term of terms) {
          const termGrades = transcriptGrades[year][term];
          
          // Add term header
          doc.setFontSize(14);
          doc.setTextColor(41, 128, 185);
          doc.text('Completed Courses', 20, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 10;
          
          // Sort grades alphabetically by course code
          const sortedTermGrades = [...termGrades].sort((a, b) => {
            return a.course_code.localeCompare(b.course_code);
          });
          
          // Add grades table
          const tableData = sortedTermGrades.map(grade => [
            grade.course_code,
            decryptedGrades[grade.id] || 'N/A',
            grade.status
          ]);
          
          autoTable(doc, {
            startY: yPos,
            head: [['Course', 'Grade', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
              fillColor: [41, 128, 185],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              font: 'times',
              halign: 'center'
            },
            styles: { 
              fontSize: 10,
              cellPadding: 3,
              font: 'times'
            },
            columnStyles: {
              1: { halign: 'center' }, // Center the Grade column
              2: { halign: 'center' }  // Center the Status column
            },
            margin: { left: 20 },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            }
          });
          
          yPos = doc.lastAutoTable.finalY + 10;
          
          // Add new page if needed
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
        }
      }
      
      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        doc.text('This is an unofficial transcript. For official transcripts, please contact Brock admissions office.', 105, 290, { align: 'center' });
        doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, 105, 295, { align: 'center' });
      }
      
      // Save the PDF
      doc.save('academic_transcript.pdf');
      setSuccess('Transcript exported successfully');
    } catch (err) {
      console.error('Error exporting transcript:', err);
      setError('Failed to export transcript. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };
  
  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4 border border-red-100 dark:border-red-800">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-md mb-4 border border-green-100 dark:border-green-800">
          {success}
        </div>
      )}
      
      {debugInfo && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-3 rounded-md mb-4 border border-yellow-100 dark:border-yellow-800">
          <p><strong>Debug Info:</strong> {debugInfo}</p>
          <p className="text-sm mt-2">Try refreshing the page completely or signing out and back in if grades are not displaying properly.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md text-sm"
          >
            Force Refresh
          </button>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 p-3 rounded-md flex items-start">
        <div className="mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-sm">
            <strong>Privacy Protection:</strong> All grade data is encrypted end-to-end using AES-256 encryption. Only you can see your actual grades.
          </p>
        </div>
      </div>
      
      {/* Degree Progress Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Degree Progress</h2>
          
          <button 
            onClick={exportTranscript}
            disabled={exportingPdf || completedCourses === 0}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium 
              ${exportingPdf || completedCourses === 0 
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'}`}
          >
            {exportingPdf ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Transcript (PDF)
              </>
            )}
          </button>
        </div>
        
        <div className="flex items-center mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mr-4 overflow-hidden">
            <div className="flex h-4">
              <div 
                className={`bg-teal-600 dark:bg-teal-500 h-4 transition-all duration-500 ease-in-out ${inProgressCourses === 0 ? 'rounded-full' : 'rounded-l-full'}`}
                style={{ width: `${percentComplete}%` }}
              ></div>
              {inProgressCourses > 0 && (
                <div 
                  className="bg-blue-500 h-4 transition-all duration-500 ease-in-out rounded-r-full" 
                  style={{ width: `${percentInProgress}%` }}
                ></div>
              )}
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {percentComplete}% Complete
            {inProgressCourses > 0 && (
              <span className="text-blue-600 dark:text-blue-400 ml-1">
                (+{percentInProgress}% In Progress)
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-100 dark:border-teal-800">
            <h3 className="text-lg font-medium text-teal-700 dark:text-teal-300">Completed</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{completedCourses}</p>
            <p className="text-sm text-teal-600 dark:text-teal-400">Courses</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300">In Progress</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{inProgressCourses}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">Courses</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
            <h3 className="text-lg font-medium text-purple-700 dark:text-purple-300">Overall GPA</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{overallGPA.toFixed(2)}</p>
            <p className="text-sm text-purple-600 dark:text-purple-400">4.0 Scale</p>
          </div>
        </div>

        {/* Graduation Projection */}
        {graduationProjection && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-lg border border-indigo-100 dark:border-indigo-800 mt-4">
            <div className="flex items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium text-indigo-800 dark:text-indigo-200">
                  Projected Graduation
                </h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  {graduationProjection.isCeremony 
                    ? `Your projected graduation ceremony will be the ${graduationProjection.termDisplay} convocation.`
                    : `Based on your current progress, you are projected to graduate in ${graduationProjection.termDisplay}.`
                  }
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  Estimation based on {graduationProjection.coursesPerTerm} courses per term with {graduationProjection.remainingCourses} courses remaining.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}