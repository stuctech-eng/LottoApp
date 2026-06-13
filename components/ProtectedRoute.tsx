'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Rol } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Indien opgegeven: alleen deze rollen krijgen toegang, anders redirect naar /dashboard */
  allowedRoles?: Rol[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, profile, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
      return;
    }
    if (allowedRoles && !loading && !profileLoading && profile && !allowedRoles.includes(profile.rol)) {
      router.replace('/dashboard');
    }
  }, [user, loading, profile, profileLoading, allowedRoles, router]);

  const klaar = !loading && user && (!allowedRoles || (!profileLoading && profile));
  const toegestaan = !allowedRoles || (profile && allowedRoles.includes(profile.rol));

  if (!klaar || !toegestaan) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <>{children}</>;
}
