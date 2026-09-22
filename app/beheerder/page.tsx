'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SpelerDashboardContent } from '@/components/SpelerDashboard';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { subscribeBetalingen, subscribeKasmutaties, relevanteTrekkingWeek } from '@/lib/firestore-payments';
import { subscribeAlleTrekkingen } from '@/lib/firestore-trekkingen';
import { User, Betaling, Trekking, Kasmutatie } from '@/lib/types';

const DRIE_DAGEN_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * "Vereist aandacht" — probleem voor probleem, niet als verzamellijst.
 * Toont ALTIJD maar één ding: het meest urgente probleem, in de vaste
 * volgorde hieronder. Is dat probleem persoonsgebonden (openstaand,
 * geen ticket, zonder telefoon), dan brengt de tegel je DIRECT naar
 * díe persoon — niet naar de algemene Leden-lijst. Is het probleem
 * opgelost, dan verdwijnt de tegel (of springt door naar het
 * volgende) vanzelf, zonder dat er iets weggeklikt hoeft te worden —
 * gewoon opnieuw op de tegel drukken lost het volgende geval op.
 *
 * BEWUST NIET meegeteld: leden in de wachtrij — dat lost zichzelf
 * vanzelf op zodra er gewonnen wordt, vraagt niets van de beheerder,
 * en hoort dus bij status, niet bij "aandacht vereist" (blijft gewoon
 * zichtbaar via het filter op de Leden-pagina).
 *
 * Volgorde (vast, op urgentie): trekking niet ingevoerd → openstaand
 * → geen ticket → zonder telefoon → Tikkie lang niet gecheckt.
 * "In verificatie" bestaat bewust niet meer als check — die status
 * kan in de huidige app niet meer ontstaan (bevestigBetaling is op
 * 25 juli verwijderd).
 */
function VereistAandachtKaart() {
  const [leden, setLeden] = useState<User[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [trekkingen, setTrekkingen] = useState<Trekking[]>([]);
  const [mutaties, setMutaties] = useState<Kasmutatie[]>([]);

  useEffect(() => {
    const u1 = subscribeAllUsers(setLeden);
    const u2 = subscribeBetalingen(setBetalingen);
    const u3 = subscribeAlleTrekkingen(setTrekkingen);
    const u4 = subscribeKasmutaties(setMutaties);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const actieveLeden = leden.filter(l => l.actief);
  // Wachtrij-leden tellen niet mee in de lid-gebonden checks (ticket,
  // openstaand, verificatie) — voor hen speelt deze week toch niet mee.
  const nietWachtend = actieveLeden.filter(l => l.wachtOpNieuweSpeelreeks !== true);

  const huidigeWeek = relevanteTrekkingWeek(betalingen);
  const betalingenDezeWeek = betalingen.filter(b => b.trekkingWeek === huidigeWeek);
  const betalingPerLid = new Map(betalingenDezeWeek.map(b => [b.userId, b]));

  // 1. Trekking nog niet ingevoerd — alleen relevant ná de
  // trekkingsavond (zaterdag vanaf 20:00, of zondag), en dan alleen
  // als de meest recente trekking niet van vandaag/gisteren-zaterdag is.
  const laatsteTrekking = trekkingen[0] ?? null;
  const nu = new Date();
  const dag = nu.getDay();
  const naTrekkingsavond = dag === 0 || (dag === 6 && nu.getHours() >= 20);
  let trekkingOntbreekt = false;
  if (naTrekkingsavond) {
    const verwachteZaterdag = new Date(nu);
    if (dag === 0) verwachteZaterdag.setDate(nu.getDate() - 1);
    verwachteZaterdag.setHours(0, 0, 0, 0);
    const laatsteDatum = laatsteTrekking?.datum?.toDate() ?? null;
    const laatsteDagOnly = laatsteDatum ? new Date(laatsteDatum.getFullYear(), laatsteDatum.getMonth(), laatsteDatum.getDate()) : null;
    trekkingOntbreekt = !laatsteDagOnly || laatsteDagOnly.getTime() !== verwachteZaterdag.getTime();
  }

  // BUGFIX: "in verificatie" is verwijderd als check — die status kan
  // in de huidige app niet meer ontstaan. De functies die 'm ooit
  // aanmaakten (meldBetaling, meldLottoSaldoStorting) én de functie
  // om zo'n betaling te bevestigen (bevestigBetaling) zijn al op 25
  // juli verwijderd; de kashouder registreert stortingen nu altijd
  // direct als 'betaald'. Een check op een onbereikbare status is
  // dode code — nooit iets om op te reageren.

  // 2. Openstaand — geen betaling deze week.
  const openstaand = nietWachtend.filter(l => betalingPerLid.get(l.id)?.status !== 'betaald').length;

  // 4. Geen ticket ingesteld — doet feitelijk niet mee, ook al is er
  // misschien wel betaald.
  const zonderTicket = nietWachtend.filter(l => (l.tickets?.length ?? 0) === 0).length;

  // 5. Zonder telefoon — ook relevant voor wachtrij-leden, want dit
  // gaat niet over deelname, maar over bereikbaarheid.
  const zonderTelefoon = actieveLeden.filter(l => !l.telefoon).length;

  // 6. Tikkie lang niet gecontroleerd (> 3 dagen) — zelfde afleiding
  // als "Tikkie laatst gecontroleerd" op Financieel: het tijdstip van
  // de laatst geregistreerde storting IS het bewijs dat alles
  // daarvóór al bekeken is.
  const laatsteStorting = mutaties
    .filter(m => m.type === 'inleg' && m.datum)
    .sort((a, b) => (b.datum?.toMillis() ?? 0) - (a.datum?.toMillis() ?? 0))[0];
  const tikkieVerouderd = !laatsteStorting || (Date.now() - (laatsteStorting.datum?.toMillis() ?? 0)) > DRIE_DAGEN_MS;

  // Precies één probleem kiezen, in de vaste prioriteitsvolgorde.
  // Persoonsgebonden problemen leveren het LID zelf op (voor de
  // directe link naar zijn detailpagina); de twee proces-problemen
  // (trekking, Tikkie) hebben geen lid, die gaan naar hun eigen pagina.
  let lidMetProbleem: User | null = null;
  let reden: string | null = null;
  let href: string | null = null;

  if (trekkingOntbreekt) {
    href = '/trekkingen';
    reden = 'Trekking nog niet ingevoerd';
  } else {
    const openstaandLid = nietWachtend.find(l => betalingPerLid.get(l.id)?.status !== 'betaald');
    const zonderTicketLid = !openstaandLid ? nietWachtend.find(l => (l.tickets?.length ?? 0) === 0) : null;
    const zonderTelefoonLid = !openstaandLid && !zonderTicketLid ? actieveLeden.find(l => !l.telefoon) : null;

    if (openstaandLid) {
      lidMetProbleem = openstaandLid;
      reden = 'Nog niet betaald deze week';
    } else if (zonderTicketLid) {
      lidMetProbleem = zonderTicketLid;
      reden = 'Geen ticket ingesteld';
    } else if (zonderTelefoonLid) {
      lidMetProbleem = zonderTelefoonLid;
      reden = 'Geen telefoonnummer bekend';
    } else if (tikkieVerouderd) {
      href = '/kashouder/financieel';
      reden = 'Tikkie al een tijd niet gecontroleerd';
    }

    if (lidMetProbleem) href = `/leden/${lidMetProbleem.id}`;
  }

  if (!href || !reden) return null;

  return (
    <div style={{ padding: '0 20px', marginBottom: 14 }}>
      <Link
        href={href}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
          padding: '14px 16px',
          background: 'linear-gradient(135deg,rgba(255,170,51,0.14),rgba(255,170,51,0.03)), var(--surface)',
          border: '1px solid rgba(255,170,51,0.35)', borderRadius: 16,
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,170,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚠️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)', marginBottom: 3 }}>
            {lidMetProbleem ? `⚠️ ${lidMetProbleem.naam}` : 'Vereist aandacht'}
          </div>
          <div style={{ fontSize: 11, color: '#c99a52' }}>{reden}</div>
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
