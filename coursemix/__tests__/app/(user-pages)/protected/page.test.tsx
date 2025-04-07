import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ProtectedPage from '@/app/(user-pages)/protected/page';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

// Mock Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Define the type for the mock Supabase client
type MockSupabaseClient = {
  auth: {
    getUser: jest.Mock<Promise<{ data: { user: object | null } }>>;
  };
};

describe('ProtectedPage', () => {
  // Cast the mocked createClient to the expected type via unknown
  const mockCreateClient = createClient as unknown as jest.Mock<Promise<MockSupabaseClient>>;

  beforeEach(() => {
    // Reset mocks before each test
    mockCreateClient.mockClear();
    // Cast redirect via unknown
    (redirect as unknown as jest.Mock).mockClear();
  });

  it('redirects to /sign-in if user is not authenticated', async () => {
    // Setup mock Supabase client to return no user
    const mockGetUser = jest.fn().mockResolvedValueOnce({ data: { user: null } });
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
    });

    // Render the component (it's async, so we need to handle the promise)
    const renderPromise = ProtectedPage();
    render(<>Promise Pending...</>); // Render placeholder while async component resolves

    // Wait for the component's logic to execute
    await renderPromise;

    // Check if redirect was called with the correct path
    await waitFor(() => {
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('redirects to /protected/dashboard if user is authenticated', async () => {
    // Setup mock Supabase client to return a user object
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockGetUser = jest.fn().mockResolvedValueOnce({ data: { user: mockUser } });
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
    });

    // Render the component
    const renderPromise = ProtectedPage();
    render(<>Promise Pending...</>); // Placeholder

    // Wait for the component's logic to execute
    await renderPromise;

    // Check if redirect was called with the correct path
    await waitFor(() => {
      expect(redirect).toHaveBeenCalledWith('/protected/dashboard');
    });
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });
}); 