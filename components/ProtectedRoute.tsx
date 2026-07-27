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

/**
 * Sinds het ledenuitnodigingssysteem (26 juli 2026) wordt een
 * Firestore-profiel NOOIT meer automatisch aangemaakt bij het inloggen
 * — dat gebeurt uitsluitend via een geldig uitnodigingstoken. Iemand
 * kan dus best succesvol technisch zijn ingelogd (Firebase Auth
 * `user` bestaat) zonder ooit lid te zijn geworden (`profile` is
 * dan null). Voorheen werd die situatie hier NIET gecontroleerd —
 * alleen wanneer `allowedRoles` was opgegeven keek deze component
 * naar `profile` — waardoor zo iemand gewoon werd doorgelaten naar
 * elke pagina zonder `allowedRoles`, met een overal `null` profiel
 * tot gevolg. Nu is een geldig profiel altijd verplicht.
 *
 * Redirect-doel bij een ontbrekend profiel is bewust NIET '/' — de
 * root-pagina stuurt iedereen met een `user` gewoon door naar
 * '/dashboard', wat hier weer zou worden afgekeurd: een oneindige
 * redirect-lus. In plaats daarvan: een aparte, duidelijke pagina.
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, profile, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
      return;
    }
    if (!loading && user && !profileLoading && !profile) {
      router.replace('/geen-toegang');
      return;
    }
    if (allowedRoles && !loading && !profileLoading && profile && !allowedRoles.includes(profile.rol)) {
      router.replace('/dashboard');
    }
  }, [user, loading, profile, profileLoading, allowedRoles, router]);

  const klaar = !loading && user && !profileLoading && profile;
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
