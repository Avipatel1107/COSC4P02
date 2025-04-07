import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CourseRegistrationPage from '@/app/(user-pages)/protected/course-registration/page';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentTerm, getCurrentDateET } from '@/utils/date-utils';
import { TermInfo } from '@/types';
import { User } from '@supabase/supabase-js';

// --- Mocks ---
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockImplementation(() => {
    const mockSingle = jest.fn();
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    const mockFrom = jest.fn(() => ({ select: mockSelect }));
    const mockGetUser = jest.fn();

    return {
      auth: { getUser: mockGetUser },
      from: mockFrom,
      _instanceMocks: { mockGetUser, mockSingle, mockEq, mockSelect, mockFrom }
    };
  })
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/utils/date-utils', () => ({
  getCurrentTerm: jest.fn(),
  getCurrentDateET: jest.fn(),
}));

// Mock child components
jest.mock('@/components/UserPages/Protected/CourseRegistration/CourseSearch', () => ({
    __esModule: true,
    default: jest.fn(({ term, year }) => <div data-testid="course-search-mock">CourseSearch Mock (Term: {term}, Year: {year})</div>),
}));
jest.mock('@/components/UserPages/Protected/CourseRegistration/CourseSuggestions', () => ({
    __esModule: true,
    default: jest.fn(({ userId }) => <div data-testid="course-suggestions-mock">CourseSuggestions Mock (UserId: {userId})</div>),
}));

// Helper to get the mock instance's functions
const getMocksForInstance = () => {
  const { createClient } = jest.requireActual('@/utils/supabase/server');
  const instance = createClient();
  return instance._instanceMocks as { 
    mockGetUser: jest.Mock;
    mockSingle: jest.Mock;
    mockEq: jest.Mock;
    mockSelect: jest.Mock;
    mockFrom: jest.Mock;
  }; 
};

// --- Helper Data ---
const mockUser = { id: 'user-reg-123', email: 'register@example.com' };
const mockUserProfile = { user_id: 'user-reg-123', /* other profile fields */ };
const mockTermInfo: TermInfo = { term: 'FALL', year: 2024, displayName: 'Fall 2024' };
const mockDateET = new Date('2024-09-15T12:00:00Z'); // A date within Fall 2024

// --- Test Suite ---
describe('CourseRegistrationPage', () => {
  const mockGetCurrentTerm = getCurrentTerm as jest.Mock;
  const mockGetCurrentDateET = getCurrentDateET as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = getMocksForInstance();
    // Default: Authenticated user with profile
    mocks.mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mocks.mockFrom.mockReturnValue({ select: mocks.mockSelect });
    mocks.mockSelect.mockReturnValue({ eq: mocks.mockEq });
    mocks.mockEq.mockReturnValue({ single: mocks.mockSingle });
    mocks.mockSingle.mockResolvedValue({ data: mockUserProfile, error: null });

    // Mock date utils
    mockGetCurrentTerm.mockReturnValue(mockTermInfo);
    mockGetCurrentDateET.mockReturnValue(mockDateET);
  });

  const renderPage = async () => {
    const Page = await CourseRegistrationPage();
    render(Page);
  };

  it('redirects to /sign-in if user is not authenticated', async () => {
    const mocks = getMocksForInstance();
    mocks.mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    await renderPage();
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/sign-in'));
  });

  it('redirects to /protected/profile-setup if user has no profile', async () => {
    const mocks = getMocksForInstance();
    mocks.mockSingle.mockResolvedValue({ data: null, error: null }); // No profile
    await renderPage();
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/protected/profile-setup'));
  });

  it('renders child components with correct props when authenticated and profile exists', async () => {
    await renderPage(); // Uses beforeEach mocks
    // Check CourseSuggestions
    const suggestionsMock = screen.getByTestId('course-suggestions-mock');
    expect(suggestionsMock).toBeInTheDocument();
    expect(suggestionsMock).toHaveTextContent(`CourseSuggestions Mock (UserId: ${mockUser.id})`);

    // Check CourseSearch
    const searchMock = screen.getByTestId('course-search-mock');
    expect(searchMock).toBeInTheDocument();
    // Term mapping: FALL -> Fall (Assuming CourseSearch component handles this)
    expect(searchMock).toHaveTextContent(`CourseSearch Mock (Term: Fall, Year: 2024)`); 
  });
});