'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiDownload } from 'react-icons/fi';
import { numericToLetterGrade } from '@/utils/grade-utils';

interface ExportButtonProps {
  grades: {
    id: string;
    course_code: string;
    term: string;
    year: number;
    status: string;
  }[];
  decryptedGrades: { [id: string]: string };
  userName: string;
  userId: string;
  programName?: string;
  completedCourses: number;
  inProgressCourses: number;
  totalRequiredCourses: number;
  overallGPA: number;
  projectedGraduation?: string;
}

export default function ExportButton({
  grades,
  decryptedGrades,
  userName,
  userId,
  programName,
  completedCourses,
  inProgressCourses,
  totalRequiredCourses,
  overallGPA,
  projectedGraduation,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Create new PDF document with 'p' for portrait orientation
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const currentDate = new Date().toLocaleDateString();
      
      // Add document title (centered)
      doc.setFontSize(22);
      doc.setTextColor(39, 55, 77); // Dark blue color
      doc.text('Academic Progress Report', 105, 20, { align: 'center' });
      
      // Add progress bar - similar to screenshot
      const percentComplete = Math.round((completedCourses / totalRequiredCourses) * 100);
      const percentInProgress = Math.min(100 - percentComplete, Math.round((inProgressCourses / totalRequiredCourses) * 100));
      
      // Add "Degree Progress" label above the bar
      doc.setFontSize(12);
      doc.setTextColor(39, 55, 77);
      doc.text('Degree Progress', 20, 30);
      
      // Progress bar dimensions - make it slightly taller and positioned better
      const barWidth = 170;
      const barHeight = 10; // Increased height for smoother appearance
      const barX = 20;
      const barY = 35; // Increased distance from title
      const cornerRadius = 5; // More rounded corners for smoother appearance
      
      // Draw background rectangle (light gray)
      doc.setFillColor(225, 225, 225); // Slightly lighter gray for better contrast
      doc.roundedRect(barX, barY, barWidth, barHeight, cornerRadius, cornerRadius, 'F');
      
      // Draw completed portion (teal)
      if (percentComplete > 0) {
        const completedWidth = (percentComplete / 100) * barWidth;
        // Use darker teal color to match screenshot (#2a7d7d)
        doc.setFillColor(42, 125, 125);
        
        if (percentInProgress > 0) {
          // Only round left corners
          doc.roundedRect(barX, barY, completedWidth, barHeight, cornerRadius, cornerRadius, 'F');
        } else {
          // Round all corners
          doc.roundedRect(barX, barY, completedWidth, barHeight, cornerRadius, cornerRadius, 'F');
        }
      }
      
      // Draw in-progress portion (blue)
      if (percentInProgress > 0) {
        const progressWidth = (percentInProgress / 100) * barWidth;
        const progressX = barX + (percentComplete / 100) * barWidth;
        // Use #4a7aef blue color to match screenshot
        doc.setFillColor(74, 122, 239);
        doc.roundedRect(progressX, barY, progressWidth, barHeight, cornerRadius, cornerRadius, 'F');
      }
      
      // Add progress text - positioned better below the bar
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`${percentComplete}% Complete${percentInProgress > 0 ? ` (+${percentInProgress}% In Progress)` : ''}`, barX, barY + barHeight + 8);
      
      // Add student information in a box - match screenshot
      const infoBox = {
        x: 20,
        y: 55, // Increased space after progress bar
        width: 170,
        height: 60 // Slightly taller for better text spacing
      };
      
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(infoBox.x, infoBox.y, infoBox.width, infoBox.height, 3, 3, 'FD');
      
      doc.setFontSize(14);
      doc.setTextColor(39, 55, 77);
      doc.text('Student Information', infoBox.x + 5, infoBox.y + 10);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      
      // Position student details with proper spacing
      let y = infoBox.y + 22; // Better starting position
      doc.text(`Name: ${userName}`, infoBox.x + 10, y);
      y += 9; // Increased line spacing
      doc.text(`Student ID: ${userId}`, infoBox.x + 10, y);
      y += 9; // Increased line spacing
      doc.text(`Program: ${programName || 'Not specified'}`, infoBox.x + 10, y);
      y += 9; // Increased line spacing
      doc.text(`Projected Graduation: ${projectedGraduation || 'Not determined'}`, infoBox.x + 10, y);
      y += 9; // Increased line spacing
      doc.text(`Report Date: ${currentDate}`, infoBox.x + 10, y);
      
      // Add academic summary in a box - with more space from previous section
      const summaryBox = {
        x: 20,
        y: 125, // Increased space between sections
        width: 170,
        height: 55
      };
      
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(summaryBox.x, summaryBox.y, summaryBox.width, summaryBox.height, 3, 3, 'FD');
      
      doc.setFontSize(14);
      doc.setTextColor(39, 55, 77);
      doc.text('Academic Summary', summaryBox.x + 5, summaryBox.y + 10);
      
      // Create a grid layout for the academic summary (3 boxes) - adjusted for better fit
      const boxWidth = 48; // Slightly narrower boxes
      const boxMargin = 8; // Reduced margin between boxes
      const boxHeight = 30;
      let boxX = summaryBox.x + 5;
      const boxY = summaryBox.y + 18;
      
      // GPA Box
      doc.setFillColor(237, 242, 247); // Lighter blue to match screenshot
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Overall GPA', boxX + 5, boxY + 7);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${overallGPA.toFixed(2)} / 4.0`, boxX + 5, boxY + 20);
      
      // Completed Courses Box
      boxX += boxWidth + boxMargin;
      doc.setFillColor(237, 247, 242); // Lighter green to match screenshot
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Completed', boxX + 5, boxY + 7);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${completedCourses} courses`, boxX + 5, boxY + 20);
      
      // In Progress Courses Box
      boxX += boxWidth + boxMargin;
      doc.setFillColor(242, 240, 247); // Lighter purple to match screenshot
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('In Progress', boxX + 5, boxY + 7);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${inProgressCourses} courses`, boxX + 5, boxY + 20);
      
      // Group courses by year for display
      const coursesByYear = grades.reduce((acc, grade) => {
        if (!acc[grade.year]) {
          acc[grade.year] = [];
        }
        acc[grade.year].push(grade);
        return acc;
      }, {} as Record<number, typeof grades>);
      
      // Sort years in descending order (most recent first)
      const years = Object.keys(coursesByYear)
        .map(Number)
        .sort((a, b) => b - a);
      
      // Add course details section by year - match screenshot with better spacing
      let tableY = 195; // Increased space after academic summary
      doc.setFontSize(16);
      doc.setTextColor(39, 55, 77);
      doc.text('Grades', 20, tableY - 8);
      
      // Iterate through years and add tables for each
      for (const year of years) {
        const yearCourses = coursesByYear[year];
        if (yearCourses.length === 0) continue;
        
        // We're skipping the year heading as requested
        
        // Prepare course data for this year
        const yearTableData = yearCourses.map(grade => {
          const decryptedGrade = decryptedGrades[grade.id] || 'N/A';
          let gradeDisplay = decryptedGrade;
          
          // Convert numeric grades to include letter grade
          if (!isNaN(Number(decryptedGrade)) && decryptedGrade !== 'N/A') {
            const numericGrade = Number(decryptedGrade);
            const letterGrade = numericToLetterGrade(numericGrade);
            gradeDisplay = `${numericGrade} (${letterGrade})`;
          }
          
          return [
            grade.course_code,
            grade.status === 'completed' ? gradeDisplay : (grade.status === 'in-progress' ? 'In Progress' : 'Not Started'),
            grade.status.charAt(0).toUpperCase() + grade.status.slice(1)
          ];
        });
        
        // Add table for this year's courses - style to match screenshot
        autoTable(doc, {
          head: [['Course Code', 'Grade', 'Status']],
          body: yearTableData,
          startY: tableY,
          theme: 'grid',
          tableWidth: 170,
          margin: { left: 20 },
          styles: {
            fontSize: 10,
            cellPadding: 6,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [39, 55, 77],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'left' },
            2: { halign: 'left' }
          }
        });
        
        // Update y position for next year
        tableY = (doc as any).lastAutoTable.finalY + 20; // Increased space between tables
        
        // Check if we need a new page
        if (tableY > 260) { // Adjusted threshold for new page
          doc.addPage();
          tableY = 20;
        }
      }
      
      // Add footer with disclaimer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          'This report is confidential and intended for the student\'s personal use only.',
          105,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
        doc.text(
          `Generated on ${currentDate} by CourseMix | Page ${i} of ${pageCount}`,
          105,
          doc.internal.pageSize.height - 5,
          { align: 'center' }
        );
      }
      
      // Save the PDF with student ID in filename
      doc.save(`academic_progress_${userId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors shadow-sm"
      aria-label="Export Academic Progress"
    >
      <FiDownload className="w-4 h-4" />
      <span>{isExporting ? 'Exporting...' : 'Export Your Progress'}</span>
    </button>
  );
} 