'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SpelerDashboardContent } from '@/components/SpelerDashboard';

function DashboardPageContent() {
  const { profile, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!profileLoading && profile) {
      if (profile.rol === 'kashouder') router.replace('/kashouder');
      else if (profile.rol === 'beheerder') router.replace('/beheerder');
    }
  }, [profile, profileLoading, router]);

  return <SpelerDashboardContent allowedRoles={['lid']} />;
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPageContent />
    </ProtectedRoute>
  );
}
