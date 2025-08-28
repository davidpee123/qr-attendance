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
      router.push('/login');
    } else if (allowedRoles && !allowedRoles.includes(role)) {
      router.push('/login');
    }
  }, [currentUser, role, loading, router, allowedRoles]);

  if (loading || (currentUser && allowedRoles && !allowedRoles.includes(role))) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}