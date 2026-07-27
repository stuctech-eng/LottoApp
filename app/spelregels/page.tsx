'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * /spelregels is samengevoegd met /help tot /startinfo (26 juli 2026)
 * — voorkomt dat er twee plekken bestaan die elkaar kunnen
 * tegenspreken (wat hier eerder ook daadwerkelijk gebeurde: deze
 * pagina beschreef nog de oude, niet-cumulatieve spelregel).
 * Blijft bestaan als redirect zodat bestaande links/bladwijzers
 * blijven werken.
 */
function SpelregelsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/startinfo');
  }, [router]);
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function SpelregelsPage() {
  return (
    <ProtectedRoute>
      <SpelregelsRedirect />
    </ProtectedRoute>
  );
}
