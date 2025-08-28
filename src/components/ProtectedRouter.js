'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRouter({ children, allowedRoles }) {
  const { currentUser, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!currentUser) {
      // If there is no user, redirect to login
      router.push('/login');
    } else if (!currentUser.emailVerified) {
      // If the user exists but their email is not verified, redirect them
      alert('Please verify your email to access this page.');
      router.push('/login');
    } else if (allowedRoles && !allowedRoles.includes(role)) {
      // If the user's role is not allowed, redirect to login
      router.push('/login');
    }
  }, [currentUser, role, loading, router, allowedRoles]);

  if (loading || !currentUser || !currentUser.emailVerified || (allowedRoles && !allowedRoles.includes(role))) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}