import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyCoursesPage from '@/app/(user-pages)/protected/my-courses/page';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentTerm, getCurrentDateET } from '@/utils/date-utils';
import { TermInfo } from '@/types';
import { User } from '@supabase/supabase-js';

// --- Mocks ---
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockImplementation(() => {
    // Define mocks inline for THIS instance
    const mockSingle = jest.fn();
    const mockEqFn1 = jest.fn(); // Represents first .eq()
    const mockEqFn2 = jest.fn(); // Represents second .eq()
    const mockIn = jest.fn();
    // Configure the return value of the first eq mock inline
    mockEqFn1.mockReturnValue({ single: mockSingle, eq: mockEqFn2 }); 
    const mockSelect = jest.fn(() => ({ 
      eq: mockEqFn1,
      in: mockIn 
    }));
    const mockFrom = jest.fn(() => ({ select: mockSelect }));
    const mockGetUser = jest.fn();

    // Return the mock client structure
    return {
      auth: { getUser: mockGetUser },
      from: mockFrom,
      // Expose mocks for configuration *on this instance*
      _instanceMocks: { mockGetUser, mockSingle, mockEqFn1, mockEqFn2, mockIn, mockSelect, mockFrom }
    };
  })
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
});

jest.mock('@/utils/date-utils', () => ({
  getCurrentTerm: jest.fn(),
  getCurrentDateET: jest.fn(),
}));

// Mock child components
jest.mock('@/components/UserPages/Protected/MyCourses/CourseCard', () => ({
    __esModule: true,
    default: jest.fn(({ course }) => <div data-testid="course-card-mock">{course.course_code}</div>),
}));
jest.mock('@/components/UserPages/Protected/MyCourses/TermInfoDisplay', () => ({
    __esModule: true,
    default: jest.fn(() => <div data-testid="term-info-mock">Term Info</div>),
}));

// Define the expected type structure for the exported mocks
interface SupabaseServerMockRefs {
  mockGetUser: jest.Mock;
  mockSingle: jest.Mock;
  mockEqFn1: jest.Mock; // First eq
  mockEqFn2: jest.Mock; // Second eq
  mockIn: jest.Mock;
  mockSelect: jest.Mock;
  mockFrom: jest.Mock;
}

// Get the mock references ONCE using requireActual and apply the type
const supabaseServerMocks = jest.requireActual<{ _mocks: SupabaseServerMockRefs }>('@/utils/supabase/server')._mocks;
const mocks: SupabaseServerMockRefs = {
    mockGetUser: supabaseServerMocks.mockGetUser,
    mockSingle: supabaseServerMocks.mockSingle,
    mockEqFn1: supabaseServerMocks.mockEqFn1,
    mockEqFn2: supabaseServerMocks.mockEqFn2,
    mockIn: supabaseServerMocks.mockIn,
    mockSelect: supabaseServerMocks.mockSelect,
    mockFrom: supabaseServerMocks.mockFrom,
};

// --- Helper Data ---
const mockUser = { id: 'user-myc-1', email: 'mycourses@example.com' };
const mockUserProfileData = { user_id: 'user-myc-1' };
const mockTermInfo: TermInfo = { term: 'WINTER', year: 2025, displayName: 'Winter 2025' };
const mockDateET = new Date('2025-02-15T10:00:00Z');
const mockEnrollmentsData = [
  { id: 'e1', course_id: 'c1', term: 'Winter', status: 'enrolled' },
  { id: 'e2', course_id: 'c2', term: 'Winter', status: 'enrolled' },
];
const mockCoursesData = [
  { id: 'c1', course_code: 'MYC 101' },
  { id: 'c2', course_code: 'MYC 102' },
];

// --- Test Suite ---
describe('MyCourses Page', () => {
  // Use imported mock references
  const mockGetCurrentTerm = getCurrentTerm as jest.Mock;
  const mockGetCurrentDateET = getCurrentDateET as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Authenticated user
    mocks.mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetCurrentTerm.mockReturnValue(mockTermInfo);
    mockGetCurrentDateET.mockReturnValue(mockDateET);

    // Configure the chain endings based on expected default call order:
    // 1. Profile: from -> select -> eq -> single
    mocks.mockEqFn1.mockReturnValueOnce({ single: mocks.mockSingle }); 
    mocks.mockSingle.mockResolvedValueOnce({ data: mockUserProfileData, error: null });
    
    // 2. Enrollments: from -> select -> eq -> eq -> resolve
    mocks.mockEqFn1.mockReturnValueOnce({ eq: mocks.mockEqFn2 }); 
    mocks.mockEqFn2.mockResolvedValueOnce({ data: mockEnrollmentsData, error: null });

    // 3. Courses: from -> select -> in -> resolve
    mocks.mockIn.mockResolvedValueOnce({ data: mockCoursesData, error: null });
  });

  const renderPage = async () => {
    const Page = await MyCoursesPage(); 
    render(Page);
  };

  it('redirects to /sign-in if user is not authenticated', async () => {
    mocks.mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    await renderPage();
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/sign-in'));
  });
  
  it('redirects to /protected/profile-setup if user has no profile', async () => {
    jest.clearAllMocks(); // Clear default setups
    mocks.mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    // Configure only the profile part of the chain
    mocks.mockEqFn1.mockReturnValueOnce({ single: mocks.mockSingle });
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: null }); // No profile

    await renderPage();
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/protected/profile-setup'));
  });

  it('renders TermInfo and CourseCards when data is available', async () => {
    // Default beforeEach setup handles this
    await renderPage();
    expect(screen.getByTestId('term-info-mock')).toBeInTheDocument();
    const courseCards = screen.getAllByTestId('course-card-mock');
    expect(courseCards).toHaveLength(mockCoursesData.length);
    expect(courseCards[0]).toHaveTextContent(mockCoursesData[0].course_code);
    expect(courseCards[1]).toHaveTextContent(mockCoursesData[1].course_code);
  });

  it('renders "No Courses Found" message when there are no enrollments', async () => {
    jest.clearAllMocks(); 
    mocks.mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetCurrentTerm.mockReturnValue(mockTermInfo);
    mockGetCurrentDateET.mockReturnValue(mockDateET);

    // 1. Profile check - Should succeed
    mocks.mockEqFn1.mockReturnValueOnce({ single: mocks.mockSingle });
    mocks.mockSingle.mockResolvedValueOnce({ data: mockUserProfileData, error: null });
    // 2. Enrollments fetch - Should return empty
    mocks.mockEqFn1.mockReturnValueOnce({ eq: mocks.mockEqFn2 });
    mocks.mockEqFn2.mockResolvedValueOnce({ data: [], error: null });
    // 3. Courses fetch - Should ideally not be called
    mocks.mockIn.mockResolvedValueOnce({ data: [], error: null });

    await renderPage();
    expect(screen.getByRole('heading', { name: /No Courses Found/i })).toBeInTheDocument();
    expect(screen.queryByTestId('course-card-mock')).not.toBeInTheDocument();
  });
}); 