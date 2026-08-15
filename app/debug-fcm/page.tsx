'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * /debug-fcm is samengevoegd met de notificatie-instellingen tot
 * /profiel/notificaties (15 augustus 2026) — alles wat met
 * notificaties te maken heeft (instellen, per categorie, én testen)
 * hoort nu bij elkaar op één plek. Blijft bestaan als redirect zodat
 * een eventuele bestaande bladwijzer blijft werken.
 */
function DebugFcmRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profiel/notificaties');
  }, [router]);
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function DebugFcmPage() {
  return (
    <ProtectedRoute allowedRoles={['beheerder']}>
      <DebugFcmRedirect />
    </ProtectedRoute>
  );
}
