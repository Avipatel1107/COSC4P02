'use client';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/Spinner';

export default function ClientLayout({ children }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        // If no session and trying to access protected route
        if (!session && pathname.startsWith('/protected')) {
          router.push(`/signin?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        // If has session and trying to access auth routes
        if (session && (pathname.startsWith('/signin') || pathname.startsWith('/signup') || pathname === '/')) {
          const redirect = searchParams.get('redirect');
          if (redirect && redirect.startsWith('/protected')) {
            router.push(redirect);
          } else {
            router.push('/protected/dashboard');
          }
          return;
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        const redirect = searchParams.get('redirect');
        if (redirect && redirect.startsWith('/protected')) {
          router.push(redirect);
        } else if (pathname.startsWith('/signin') || pathname.startsWith('/signup') || pathname === '/') {
          router.push('/protected/dashboard');
        }
      }
      if (event === 'SIGNED_OUT') {
        if (pathname.startsWith('/protected')) {
          router.push('/signin');
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setIsTransitioning(true);
    // Reset after transition
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {isTransitioning && <Spinner />}
        {children}
      </main>
      <Footer />
    </div>
  );
} 