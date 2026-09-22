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
 * "Vereist aandacht" — zes losse checks, elk met zijn eigen, geëxpliciteerde
 * reden om er wel/niet in te staan. BEWUST NIET meegeteld: leden in de
 * wachtrij — dat lost zichzelf vanzelf op zodra er gewonnen wordt, vraagt
 * niets van de beheerder, en hoort dus bij status, niet bij "aandacht
 * vereist" (blijft gewoon zichtbaar via het filter op de Leden-pagina).
 *
 * Volgorde is op urgentie: wat het meest blokkeert en het minst kan
 * wachten staat bovenaan, een proces-nudge zonder specifiek lid staat
 * onderaan.
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

  const delen: string[] = [];
  if (trekkingOntbreekt) delen.push('trekking niet ingevoerd');
  if (openstaand > 0) delen.push(`${openstaand} openstaand`);
  if (zonderTicket > 0) delen.push(`${zonderTicket} zonder ticket`);
  if (zonderTelefoon > 0) delen.push(`${zonderTelefoon} zonder telefoon`);
  if (tikkieVerouderd) delen.push('Tikkie lang niet gecheckt');

  if (delen.length === 0) return null;

  const totaal = (trekkingOntbreekt ? 1 : 0) + openstaand + zonderTicket + zonderTelefoon + (tikkieVerouderd ? 1 : 0);

  // Eén tegel, één bestemming, in prioriteitsvolgorde:
  // 1. Trekking ontbreekt — /leden lost dat toch niet op.
  // 2. Alleen de Tikkie-check staat nog open — dat is een bulkactie
  //    op Financieel, niet iets per lid; naar Leden sturen zou hier
  //    fout zijn.
  // 3. Anders: Leden — daar zijn Storten/Verreken/telefoon nu ook
  //    direct per lid te regelen.
  const alleenTikkie = !trekkingOntbreekt && openstaand === 0 && zonderTicket === 0 && zonderTelefoon === 0 && tikkieVerouderd;
  const href = trekkingOntbreekt ? '/trekkingen' : alleenTikkie ? '/kashouder/financieel' : '/leden';

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
