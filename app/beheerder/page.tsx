'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SpelerDashboardContent } from '@/components/SpelerDashboard';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { subscribeBetalingen, relevanteTrekkingWeek } from '@/lib/firestore-payments';
import { User, Betaling } from '@/lib/types';

/**
 * "Vereist aandacht" — telt alleen dingen die daadwerkelijk een actie
 * van de beheerder vragen: leden zonder telefoonnummer (geen WhatsApp-
 * herinnering/bericht mogelijk) en leden die deze week nog niet
 * betaald hebben. BEWUST NIET meegeteld: leden in de wachtrij — dat
 * lost zichzelf vanzelf op zodra er gewonnen wordt, vraagt niets van
 * de beheerder, en hoort dus bij status, niet bij "aandacht vereist".
 * Wachtrij-leden blijven wel gewoon zichtbaar via het filter op de
 * Leden-pagina.
 */
function VereistAandachtKaart() {
  const [leden, setLeden] = useState<User[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);

  useEffect(() => {
    const u1 = subscribeAllUsers(setLeden);
    const u2 = subscribeBetalingen(setBetalingen);
    return () => { u1(); u2(); };
  }, []);

  const actieveLeden = leden.filter(l => l.actief);
  const zonderTelefoon = actieveLeden.filter(l => !l.telefoon).length;

  const huidigeWeek = relevanteTrekkingWeek(betalingen);
  const betalingenDezeWeek = betalingen.filter(b => b.trekkingWeek === huidigeWeek);
  const betaaldeLeden = new Set(betalingenDezeWeek.filter(b => b.status === 'betaald').map(b => b.userId));
  const openstaand = actieveLeden.filter(l => !betaaldeLeden.has(l.id)).length;

  const totaal = zonderTelefoon + openstaand;
  if (totaal === 0) return null;

  const delen: string[] = [];
  if (openstaand > 0) delen.push(`${openstaand} openstaand`);
  if (zonderTelefoon > 0) delen.push(`${zonderTelefoon} zonder telefoon`);

  return (
    <div style={{ padding: '0 20px', marginBottom: 14 }}>
      <Link
        href="/leden"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
          padding: '14px 16px',
          background: 'linear-gradient(135deg,rgba(255,170,51,0.14),rgba(255,170,51,0.03)), var(--surface)',
          border: '1px solid rgba(255,170,51,0.35)', borderRadius: 16,
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,170,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚠️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)', marginBottom: 3 }}>Vereist aandacht — {totaal}</div>
          <div style={{ fontSize: 11, color: '#c99a52' }}>{delen.join(' · ')}</div>
        </div>
        <div style={{ fontSize: 15, color: 'var(--warning)', flexShrink: 0 }}>›</div>
      </Link>
    </div>
  );
}

function BeheerderPageContent() {
  const { profile, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!profileLoading && profile && profile.rol !== 'beheerder') {
      if (profile.rol === 'kashouder') router.replace('/kashouder');
      else router.replace('/dashboard');
    }
  }, [profile, profileLoading, router]);

  return <SpelerDashboardContent allowedRoles={['beheerder']} extraTop={<VereistAandachtKaart />} />;
}

export default function BeheerderPage() {
  return (
    <ProtectedRoute>
      <BeheerderPageContent />
    </ProtectedRoute>
  );
}
