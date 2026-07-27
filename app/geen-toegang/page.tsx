'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

/**
 * Getoond aan iemand die succesvol technisch is ingelogd (Firebase
 * Auth-account bestaat) maar geen Firestore-profiel heeft — d.w.z.
 * nooit een geldige ledenuitnodiging heeft verzilverd. Sinds het
 * uitnodigingssysteem is dit de enige plek waar zo iemand terechtkomt;
 * er is bewust geen enkele weg naar de rest van de app vanaf hier
 * behalve opnieuw inloggen met een ander account of uitloggen.
 */
export default function GeenToegangPage() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleUitloggen = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, letterSpacing: -0.5, marginBottom: 12 }}>Geen toegang</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8, maxWidth: 340 }}>
        Deze uitnodiging is verlopen of ongeldig.
      </div>
      <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32, maxWidth: 340 }}>
        Vraag de beheerder om een nieuwe uitnodiging.
      </div>
      <button
        onClick={handleUitloggen}
        style={{ width: '100%', maxWidth: 340, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
      >
        Uitloggen
      </button>
    </div>
  );
}
