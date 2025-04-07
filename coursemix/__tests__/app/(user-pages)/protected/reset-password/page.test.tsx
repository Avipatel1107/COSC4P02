import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResetPasswordPage from '@/app/(user-pages)/protected/reset-password/page';
import { resetPasswordAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

// --- Mocks ---

// Mock the server action
jest.mock('@/app/actions', () => ({
  resetPasswordAction: jest.fn(),
}));

// Mock UI components (optional, but good practice if they have complex logic)
// For this test, we can rely on their basic functionality
jest.mock('@/components/ui/button', () => ({ 
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> 
}));
jest.mock('@/components/ui/input', () => ({ 
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> 
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
});

// --- Test Suite ---
describe('ResetPassword Page', () => {
  const mockResetPasswordAction = resetPasswordAction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the reset password form correctly', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole('heading', { name: /Create new password/i })).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset password/i })).toBeInTheDocument();
  });

  it('renders the "Back to sign in" link', () => {
    render(<ResetPasswordPage />);
    const link = screen.getByRole('link', { name: /Back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/sign-in');
  });

  it('allows typing into password fields', () => {
    render(<ResetPasswordPage />);
    const passwordInput = screen.getByLabelText('New password');
    const confirmInput = screen.getByLabelText('Confirm new password');

    fireEvent.change(passwordInput, { target: { value: 'newSecurePassword' } });
    fireEvent.change(confirmInput, { target: { value: 'newSecurePassword' } });

    expect(passwordInput).toHaveValue('newSecurePassword');
    expect(confirmInput).toHaveValue('newSecurePassword');
  });

  it('calls resetPasswordAction with form data on submit', async () => {
    render(<ResetPasswordPage />);
    const passwordInput = screen.getByLabelText('New password');
    const confirmInput = screen.getByLabelText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /Reset password/i });

    const testPassword = 'testPassword123';
    fireEvent.change(passwordInput, { target: { value: testPassword } });
    fireEvent.change(confirmInput, { target: { value: testPassword } });

    fireEvent.click(submitButton);

    // Check if the action was called
    expect(mockResetPasswordAction).toHaveBeenCalledTimes(1);

    // Check if the action was called with FormData containing the correct values
    const expectedFormData = new FormData();
    expectedFormData.append('password', testPassword);
    expectedFormData.append('confirmPassword', testPassword);

    // Compare FormData entries
    const actualFormData = mockResetPasswordAction.mock.calls[0][0] as FormData;
    expect(actualFormData.get('password')).toEqual(expectedFormData.get('password'));
    expect(actualFormData.get('confirmPassword')).toEqual(expectedFormData.get('confirmPassword'));
  });
}); 