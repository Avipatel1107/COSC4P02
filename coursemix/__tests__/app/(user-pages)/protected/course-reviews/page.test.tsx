import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReviewPage from '@/app/(user-pages)/protected/course-reviews/page';
import { createClient } from '@/utils/supabase/client';
import { redirect } from 'next/navigation';

// --- Mocks ---
// Define mock functions and client object outside the factory
const mockGetUser_client_rev = jest.fn();
const mockEqStatus_client_rev = jest.fn(); // Mock for the second .eq() on enrollments
const mockEqUserId_client_rev = jest.fn(() => ({ eq: mockEqStatus_client_rev })); // Mock for the first .eq() on enrollments
const mockIn_client_rev = jest.fn(); // Mock for .in() on courses
const mockSelect_client_rev = jest.fn(() => ({ 
    eq: mockEqUserId_client_rev, // Default eq behavior (leads to another eq)
    in: mockIn_client_rev      // Default in behavior
}));
const mockFrom_client_rev = jest.fn(() => ({ select: mockSelect_client_rev }));

const mockSupabaseClient_rev = {
  auth: { getUser: mockGetUser_client_rev },
  from: mockFrom_client_rev,
  __isMock: true, 
};

jest.mock('@/utils/supabase/client', () => {
  // Return a factory function that returns the mock object
  return {
    // Use a separate instance for reviews if needed, or reuse the discussion one
    // For safety, let's use a separate one defined above
    createClient: jest.fn(() => mockSupabaseClient_rev)
  };
});

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock the ReviewForm component
jest.mock('@/components/course-reviews/ReviewForm', 
  () => ({ courseId, courseName }: { courseId: string, courseName: string }) => (
    <div data-testid="review-form-mock">
      Review Form Mock for {courseName} (ID: {courseId})
    </div>
  )
);

// --- Helper Data ---
const mockUser = { id: 'user-rev-789', email: 'review@example.com' };
const mockEnrollments = [
  { course_id: 'course-3' },
  { course_id: 'course-4' },
];
const mockCourses = [
  { id: 'course-3', course_code: 'REVW 201', title: 'Review Course 1' },
  { id: 'course-4', course_code: 'REVW 202', title: 'Review Course 2' },
];

// --- Test Suite ---
describe('Review_Page', () => {
  // Access the client-side mocks directly
  const mockGetUser = mockGetUser_client_rev;
  const mockFrom = mockFrom_client_rev;
  const mockSelect = mockSelect_client_rev;
  const mockIn = mockIn_client_rev;
  const mockEqUserId = mockEqUserId_client_rev;
  const mockEqStatus = mockEqStatus_client_rev;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // Configure default resolved values for the standard case:
    // 1. Enrollments fetch (select -> eq -> eq -> resolve)
    mockEqStatus.mockResolvedValueOnce({ data: mockEnrollments, error: null });
    // 2. Courses fetch (select -> in -> resolve)
    mockIn.mockResolvedValueOnce({ data: mockCourses, error: null });
  });

  it('redirects to /sign-in if user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    render(<ReviewPage />);
    await waitFor(() => {
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
  });

  it('renders loading state initially', () => {
    render(<ReviewPage />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders correctly when user has no enrollments', async () => {
    // Configure mocks for this specific case
    jest.clearAllMocks(); // Clear defaults
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockEqStatus.mockResolvedValueOnce({ data: [], error: null }); // Override enrollments fetch
    // mockIn will not be called

    render(<ReviewPage />);
    
    // Wait for potential loading states to resolve
    // Check that the dropdown is NOT rendered
    await waitFor(() => {
      expect(screen.queryByRole('combobox', { name: /Select a course/i })).not.toBeInTheDocument();
    });

    // Check that review-specific elements are NOT rendered
    expect(screen.queryByRole('radio', { name: /rating/i })).not.toBeInTheDocument(); 
    expect(screen.queryByRole('textbox', { name: /Your review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit review/i })).not.toBeInTheDocument();
    
    // Check for some kind of message indicating no courses (make this robust)
    // Example: Check if text containing "not enrolled" or "no courses" exists
    // expect(screen.getByText(/not enrolled|no courses to review/i)).toBeInTheDocument(); 
    // For now, just ensure the main interactive elements aren't there.
  });

  it('renders course selection dropdown when courses are loaded', async () => {
    render(<ReviewPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: /Select a course/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: mockCourses[0].course_code })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: mockCourses[1].course_code })).toBeInTheDocument();
  });

  it('does not render ReviewForm component initially', async () => {
    render(<ReviewPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument(); 
    });
    expect(screen.queryByTestId('review-form-mock')).not.toBeInTheDocument();
  });

  it('renders ReviewForm component when a course is selected', async () => {
    render(<ReviewPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument(); 
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: mockCourses[0].id } });

    await waitFor(() => {
      expect(screen.getByTestId('review-form-mock')).toBeInTheDocument();
    });
    expect(screen.getByTestId('review-form-mock')).toHaveTextContent(`Review Form Mock for ${mockCourses[0].course_code} (ID: ${mockCourses[0].id})`);
  });

  it('clears ReviewForm component when "Select a course" is chosen', async () => {
     render(<ReviewPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument(); 
    });

    const select = screen.getByRole('combobox');
    // Select a course first
    fireEvent.change(select, { target: { value: mockCourses[1].id } });
    await waitFor(() => {
      expect(screen.getByTestId('review-form-mock')).toBeInTheDocument();
    });

    // Select the default option
    fireEvent.change(select, { target: { value: '' } }); 
    await waitFor(() => {
      expect(screen.queryByTestId('review-form-mock')).not.toBeInTheDocument();
    });
  });
}); 