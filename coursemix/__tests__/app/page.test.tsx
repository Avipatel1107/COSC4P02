import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '@/app/page'; // Adjusted import path
import type { Feature } from '@/types';

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <a href={href}>{children}</a>;
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    render(<HomePage />);
  });

  it('renders the main heading', () => {
    expect(screen.getByRole('heading', { name: /Your Personal Academic Advisor/i })).toBeInTheDocument();
  });

  it('renders the main subheading', () => {
    expect(screen.getByText(/Revolutionizing academic advising/i)).toBeInTheDocument();
  });

  it('renders the Brock students subheading', () => {
    expect(screen.getByText(/Made for Brock Students by Brock Students/i)).toBeInTheDocument();
  });

  it('renders the "Get Started" button linking to sign-up', () => {
    const button = screen.getByRole('button', { name: /Get Started/i });
    expect(button).toBeInTheDocument();
    expect(button.closest('a')).toHaveAttribute('href', '/sign-up');
  });

  it('renders the "Key Features" section heading', () => {
    expect(screen.getByRole('heading', { name: /Key Features/i })).toBeInTheDocument();
  });

  it('renders all feature cards with correct content and links', () => {
    const features: Feature[] = [
      { icon: '📅', title: 'Personalized Course Planning', description: 'Create optimized course schedules tailored to your unique preferences and requirements.' },
      { icon: '🔧', title: 'Dynamic Course Adjustment', description: 'Adapt your academic plans as needed while staying on track for graduation.' },
      { icon: '📊', title: 'Course Insights', description: 'Access comprehensive course data including schedules, failure rates, and peer reviews.' },
      { icon: '💬', title: 'Community Feedback', description: 'Discuss and rate courses with peers to discover efficient course combinations.' }
    ];

    features.forEach(feature => {
      expect(screen.getByText(feature.icon)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: feature.title })).toBeInTheDocument();
      expect(screen.getByText(feature.description)).toBeInTheDocument();
      // Check the link associated with the feature card
      const featureLink = screen.getByText(feature.title).closest('a');
      expect(featureLink).toHaveAttribute('href', '/protected/dashboard');
    });
  });

  it('renders the "Student Testimonials" section heading', () => {
    expect(screen.getByRole('heading', { name: /Student Testimonials/i })).toBeInTheDocument();
  });

  it('renders the testimonial text', () => {
    expect(screen.getByText(/As a first-year student, I struggled with academic advising/i)).toBeInTheDocument();
  });

  it('renders the testimonial attribution', () => {
    expect(screen.getByText(/- Computer Science Student/i)).toBeInTheDocument();
  });

  it('renders the CTA section heading', () => {
    expect(screen.getByRole('heading', { name: /Ready to Transform Your Academic Journey\?/i })).toBeInTheDocument();
  });

  it('renders the CTA description', () => {
    expect(screen.getByText(/Join Course Mix today and revolutionize your academic experience/i)).toBeInTheDocument();
  });

  it('renders the "Start Planning Now" button linking to sign-up', () => {
    const button = screen.getByRole('button', { name: /Start Planning Now/i });
    expect(button).toBeInTheDocument();
    expect(button.closest('a')).toHaveAttribute('href', '/sign-up');
  });
}); 