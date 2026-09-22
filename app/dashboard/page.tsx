'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeBetalingen, subscribeUserBetalingen, relevanteTrekkingWeek } from '@/lib/firestore-payments';
import { subscribeAlleTrekkingen, subscribeResultaten } from '@/lib/firestore-trekkingen';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { subscribeVerenigingConfig, DEFAULT_VERENIGING_CONFIG } from '@/lib/firestore-vereniging';
import { berekenActuelePrijzenpot } from '@/lib/firestore-prijzenpot';
import { Betaling, Trekking, Resultaat, User } from '@/lib/types';

// Kashouder contactgegevens dynamisch ophalen uit users collectie

// "Nog X dagen"-badge op het nieuwe dashboardkaartje — 0 op zaterdag
// zelf, i.p.v. de "+7 dagen"-sprong die volgendeZaterdag() bewust wél
// maakt voor de datumregel elders.
function dagenTotVolgendeTrekking(): number {
  const dag = new Date().getDay();
  return dag === 6 ? 0 : 6 - dag;
}

// Gedeelde "tegel-als-knop"-stijl voor de nieuwe dashboardkaarten —
// lichte bevel-rand + zachte schaduw, zodat een tegel er tastbaar/
// klikbaar uitziet zonder een los "Alle →"-tekstje nodig te hebben.
const tapCard: CSSProperties = {
  display: 'block',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderTopColor: 'rgba(255,255,255,0.14)',
  borderRadius: 16,
  boxShadow: '0 5px 14px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.04) inset',
  textDecoration: 'none',
  color: 'inherit',
  position: 'relative',
};

const chevron: CSSProperties = {
  position: 'absolute',
  top: 14,
  right: 14,
  fontSize: 15,
  color: 'var(--muted)',
  opacity: 0.6,
};

function formatDatum(ts: Trekking['datum']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

// Confetti component
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const kleuren = ['#f0c060', '#4a9eff', '#34c97a', '#ff5a5a', '#a78bfa', '#ffffff'];
    const deeltjes: { x: number; y: number; r: number; kleur: string; snelheid: number; hoek: number; rotatie: number; rotSnelheid: number }[] = [];

    for (let i = 0; i < 150; i++) {
      deeltjes.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        r: 4 + Math.random() * 8,
        kleur: kleuren[Math.floor(Math.random() * kleuren.length)],
        snelheid: 2 + Math.random() * 4,
        hoek: Math.random() * Math.PI * 2,
        rotatie: Math.random() * Math.PI * 2,
        rotSnelheid: (Math.random() - 0.5) * 0.2,
      });
    }

    let animFrame: number;
    let actief = true;

    function teken() {
      if (!actief || !ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const d of deeltjes) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotatie);
        ctx.fillStyle = d.kleur;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-d.r / 2, -d.r / 2, d.r, d.r * 0.5);
        ctx.restore();

        d.y += d.snelheid;
        d.x += Math.sin(d.hoek) * 1.5;
        d.rotatie += d.rotSnelheid;
        d.hoek += 0.02;

        if (d.y > canvas.height + 20) {
          d.y = -20;
          d.x = Math.random() * canvas.width;
        }
      }

      animFrame = requestAnimationFrame(teken);
    }

    teken();

    return () => {
      actief = false;
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }}
    />
  );
}

// Winnaar scherm
// BUGFIX: toonde eerder het totale, cumulatieve kassaldo (incl. al
// bevestigde stortingen voor toekomstige weken) i.p.v. de prijzenpot
// van déze speelreeks. Gebruikt nu resultaat.prijsBedrag — vastgelegd
// server-side op het moment van winnen (zie functions/src/index.ts),
// dus permanent correct, ook nadat dit scherm ooit wordt gesloten.
function WinnaarScherm({ resultaat, trekking, kashouder, onGeclaimed }: { resultaat: Resultaat; trekking: Trekking; kashouder: User | null; onGeclaimed: () => void }) {
  const kashouderNaam = kashouder?.naam ?? 'de kashouder';
  const kashouderTelefoon = kashouder?.telefoon?.replace(/\s/g, '') ?? '';
  const prijsBedrag = resultaat.prijsBedrag;
  const prijsTekst = prijsBedrag != null ? `€${prijsBedrag.toFixed(0)}` : 'het bedrag (vraag na bij de beheerder)';

  const tikkieBericht = encodeURIComponent(
    prijsBedrag != null
      ? `Hoi ${kashouderNaam}! 🏆 Ik heb gewonnen bij LottoClub! Kun je €${prijsBedrag.toFixed(0)} overmaken? Stuur me een Tikkie!`
      : `Hoi ${kashouderNaam}! 🏆 Ik heb gewonnen bij LottoClub! Kun je aangeven hoeveel ik krijg en het overmaken? Stuur me een Tikkie!`
  );
  const whatsappUrl = kashouderTelefoon
    ? `https://wa.me/${kashouderTelefoon}?text=${tikkieBericht}`
    : undefined;

  const handleWhatsApp = () => {
    // Sla op dat winnaar heeft geclaimd — confetti scherm verdwijnt
    localStorage.setItem(`winnaar_geclaimed_${trekking.id}`, 'true');
    onGeclaimed();
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#1a0a00,#0d1b2a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', position: 'relative', overflow: 'hidden' }}>
      <Confetti />

      {/* Gouden gloed */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle,rgba(240,192,96,0.2) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 20 }}>
        {/* Trofee */}
        <div style={{ fontSize: 96, marginBottom: 8, animation: 'popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>🏆</div>

        {/* JACKPOT */}
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, letterSpacing: -1, color: 'var(--gold)', marginBottom: 4, animation: 'fadeUp 0.5s ease 0.2s both', textShadow: '0 0 30px rgba(240,192,96,0.5)' }}>
          JACKPOT!
        </div>

        <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 24, animation: 'fadeUp 0.5s ease 0.3s both' }}>
          Jij hebt gewonnen! 🎉
        </div>

        {/* Pot bedrag */}
        <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.15),rgba(240,192,96,0.05))', border: '1px solid rgba(240,192,96,0.3)', borderRadius: 24, padding: '24px 32px', marginBottom: 24, animation: 'fadeUp 0.5s ease 0.4s both' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Jouw winst</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: prijsBedrag != null ? 64 : 22, letterSpacing: -2, color: 'var(--gold)', lineHeight: 1, textShadow: '0 0 20px rgba(240,192,96,0.4)' }}>
            {prijsTekst}
          </div>
        </div>

        {/* Getrokken nummers */}
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.5s ease 0.5s both' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Getrokken nummers {formatDatum(trekking.datum)}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {trekking.nummers.map(n => (
              <div key={n} style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),#c08820)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{n}</div>
            ))}
          </div>
        </div>

        {/* Instructie */}
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6, maxWidth: 300, animation: 'fadeUp 0.5s ease 0.6s both' }}>
          Stuur een WhatsApp naar {kashouderNaam} om je winst te claimen. Hij maakt het bedrag daarna over.
        </div>

        {/* WhatsApp knop */}
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsApp}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', maxWidth: 340, background: 'linear-gradient(135deg,#25d366,#128c4a)', color: 'white', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,211,102,0.3)', marginBottom: 14, animation: 'fadeUp 0.5s ease 0.7s both' }}
          >
            💬 WhatsApp {kashouderNaam}
          </a>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
            Neem contact op met {kashouderNaam} om je winst te claimen.
          </div>
        )}

        <Link href="/trekkingen" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          Bekijk de trekking details →
        </Link>
      </div>
    </div>
  );
}

function DashboardPageContent() {
  const { profile, profileLoading, user } = useAuth();
  const router = useRouter();

  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [mijnBetalingen, setMijnBetalingen] = useState<Betaling[]>([]);
  const [trekkingen, setTrekkingen] = useState<Trekking[]>([]);
  const [leden, setLeden] = useState<User[]>([]);
  const [mijnResultaten, setMijnResultaten] = useState<Resultaat[]>([]);
  const [laden, setLaden] = useState(true);
  const [standaardInleg, setStandaardInleg] = useState(DEFAULT_VERENIGING_CONFIG.standaardInleg);
  const [prijzenpot, setPrijzenpot] = useState<number | null>(null);

  useEffect(() => {
    const unsub = subscribeVerenigingConfig(cfg => setStandaardInleg(cfg.standaardInleg));
    return unsub;
  }, []);

  useEffect(() => {
    // Eenmalige berekening, herhaald zodra betalingen wijzigen — geen
    // live subscription mogelijk voor deze afgeleide, samengestelde
    // waarde (vereist meerdere losse queries).
    let actief = true;
    berekenActuelePrijzenpot().then(p => { if (actief) setPrijzenpot(p); });
    return () => { actief = false; };
  }, [betalingen]);

  useEffect(() => {
    if (!profileLoading && profile) {
      if (profile.rol === 'kashouder') router.replace('/kashouder');
      else if (profile.rol === 'beheerder') router.replace('/beheerder');
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (!user) return;
    let geladen = 0;
    const klaar = () => { geladen++; if (geladen >= 3) setLaden(false); };

    const u2 = subscribeBetalingen((b) => { setBetalingen(b); klaar(); });
    const u3 = subscribeUserBetalingen(user.uid, (b) => { setMijnBetalingen(b); klaar(); });
    const u5 = subscribeAlleTrekkingen((t) => { setTrekkingen(t); klaar(); });
    const u6 = subscribeAllUsers(setLeden);

    return () => { u2(); u3(); u5(); u6(); };
  }, [user]);

  const laatsteTrekking = trekkingen[0] ?? null;

  useEffect(() => {
    if (!laatsteTrekking) return;
    const unsub = subscribeResultaten(laatsteTrekking.id, setMijnResultaten);
    return unsub;
  }, [laatsteTrekking?.id]);

  if (profileLoading || (profile && profile.rol !== 'lid')) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const actieveLeden = leden.filter(l => l.actief);
  // KRITIEK: alleen betalingen van de huidige ISO-week meetellen.
  // Zonder deze filter blijft een lid voor altijd als "betaald"
  // gelden zodra hij ooit één week heeft ingelegd — precies het patroon
  // dat de betaalvoortgang op de kashouder-pagina al goed afhandelt.
  const huidigeWeek = relevanteTrekkingWeek(betalingen);
  const betalingenDezeWeek = betalingen.filter(
    b => (b as typeof betalingen[number] & { trekkingWeek?: string }).trekkingWeek === huidigeWeek
  );
  const betaaldeLeden = new Set(betalingenDezeWeek.filter(b => b.status === 'betaald').map(b => b.userId));
  const aantalBetaald = actieveLeden.filter(l => betaaldeLeden.has(l.id)).length;

  const mijnLaatsteBetaling = mijnBetalingen[0] ?? null;
  const heeftBetaald = mijnLaatsteBetaling?.status === 'betaald';
  const inVerificatie = mijnLaatsteBetaling?.status === 'verificatie';

  const mijnResultaatLaatste = mijnResultaten.find(r => r.userId === user?.uid);
  const winnaarResultaat = mijnResultaten.find(r => r.isWinnaar);

  // Confetti scherm alleen bij écht winnen — alle 6 nummers goed
  // Extra check op aantalGoed voorkomt dat oude resultaten met verkeerde
  // prijsmodus (hoogste_score_wint) het winnaar-scherm triggeren
  const ikHebGewonnen = mijnResultaatLaatste?.isWinnaar === true
    && mijnResultaatLaatste?.aantalGoed >= 6;

  // Geclaimed state — verdwijnt zodra winnaar op WhatsApp heeft getikt
  const [winnaarGeclaimed, setWinnaarGeclaimed] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check localStorage bij laden
    return false; // wordt later ingevuld als trekking bekend is
  });

  // Kashouder — eerst kashouder rol, dan beheerder als fallback
  const kashouder = leden.find(l => l.rol === 'kashouder') ?? leden.find(l => l.rol === 'beheerder') ?? null;

  // Check localStorage voor geclaimed status
  const geclaimed = winnaarGeclaimed ||
    (typeof window !== 'undefined' && laatsteTrekking
      ? localStorage.getItem(`winnaar_geclaimed_${laatsteTrekking.id}`) === 'true'
      : false);

  // Winnaar scherm tonen — alleen als niet al geclaimed
  if (!laden && ikHebGewonnen && laatsteTrekking && !geclaimed) {
    return <WinnaarScherm
      resultaat={mijnResultaatLaatste!}
      trekking={laatsteTrekking}
      kashouder={kashouder}
      onGeclaimed={() => setWinnaarGeclaimed(true)}
    />;
  }

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(22px, env(safe-area-inset-top, 22px)) 20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {new Date().getHours() < 12 ? 'Goedemorgen 👋' : new Date().getHours() < 18 ? 'Goedemiddag 👋' : 'Goedenavond 👋'}
            </span>
            <Link href="/profiel">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#4a9eff,#2070cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '2px solid rgba(74,158,255,0.3)', overflow: 'hidden' }}>
                {profile?.foto ? <img src={profile.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
              </div>
            </Link>
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -1, lineHeight: 1.1 }}>
            {profile?.naam?.split(' ')[0] ?? '—'}
          </div>
        </div>

        {/* Wacht op nieuwe speelreeks */}
        {profile?.wachtOpNieuweSpeelreeks && (
          <div style={{ margin: '0 20px 16px', background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>⏳ Je wacht op de nieuwe speelreeks</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              Je bent lid geworden terwijl de huidige speelreeks al bezig was — andere spelers hebben dan al een voorsprong. Zodra er een winnaar is en een nieuwe, eerlijke speelreeks begint, doe jij automatisch mee. Je gestorte saldo blijft gewoon staan tot dat moment. Je ticket-nummers kun je nu al instellen.
            </div>
          </div>
        )}

        {/* Prijzenpot — bovenaan, hoogste prioriteit. Bewust GEEN link
            (verwees eerder naar /kas — dat scherm is voor de financiën
            van de club, niet bedoeld voor leden en zorgde voor verwarring) */}
        <div style={{ padding: '0 20px', marginBottom: 14 }}>
          <div style={{ ...tapCard, textAlign: 'center', padding: '16px 18px', background: 'linear-gradient(135deg,rgba(240,192,96,0.14),rgba(240,192,96,0.03)), var(--surface)', borderColor: 'rgba(240,192,96,0.32)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>🏆 Te winnen deze speelreeks</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 40, letterSpacing: -1.5, color: 'var(--gold)', lineHeight: 1.05 }}>
              {laden || prijzenpot === null ? '…' : `€${prijzenpot.toFixed(0)}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Groeit elke week zonder winnaar</div>
          </div>
        </div>

        {/* Mijn LottoSaldo */}
        <div style={{ padding: '0 20px', marginBottom: 14 }}>
          {(() => {
            const lottoSaldo = profile?.lottoSaldo ?? 0;
            const wekenTegoed = Math.floor(lottoSaldo / standaardInleg);
            let kleur = 'var(--success)';
            let kort = `Nog ${wekenTegoed} weken gedekt`;
            if (lottoSaldo <= 0 && !heeftBetaald) { kleur = 'var(--muted)'; kort = 'Nog geen saldo'; }
            else if (lottoSaldo < standaardInleg && !heeftBetaald) { kleur = 'var(--error)'; kort = `Nog €${(standaardInleg - lottoSaldo).toFixed(2)} nodig`; }
            else if (heeftBetaald && wekenTegoed <= 1) { kleur = 'var(--warning)'; kort = wekenTegoed === 1 ? 'Deze + 1 week extra' : 'Deze trekking gedekt'; }
            else if (heeftBetaald) { kleur = 'var(--success)'; kort = `Deze + ${wekenTegoed} weken extra`; }
            else if (wekenTegoed <= 1) { kleur = 'var(--warning)'; kort = 'Bijna op'; }
            return (
              <Link href="/betalen" style={{ ...tapCard, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Mijn LottoSaldo</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 25, color: 'var(--gold)', letterSpacing: -0.5 }}>€{lottoSaldo.toFixed(2)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: kleur, flexShrink: 0 }} />
                      <div style={{ fontSize: 11, color: kleur, fontWeight: 600 }}>{kort}</div>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'var(--accent)', color: 'white', borderRadius: 11, padding: '9px 15px', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Storten</div>
              </Link>
            );
          })()}
        </div>

        {/* Mijn betaalstatus — direct onder LottoSaldo; ja, enigszins
            dubbel met het puntje hierboven, maar dit blok geeft leden
            in één oogopslag zekerheid, los van het saldo-cijfer zelf */}
        <div style={{ padding: '0 20px', marginBottom: 14 }}>
          {inVerificatie ? (
            <Link href="/betalen" style={{ ...tapCard, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--warning-soft)', borderColor: 'rgba(255,170,51,0.28)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--warning)' }}>In verificatie — €{mijnLaatsteBetaling!.bedrag.toFixed(2)}</div>
              <div style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--muted)', opacity: 0.6 }}>›</div>
            </Link>
          ) : heeftBetaald ? (
            <Link href="/betalen" style={{ ...tapCard, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--success-soft)', borderColor: 'rgba(62,207,126,0.28)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--success)' }}>Betaald voor deze week</div>
              <div style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--muted)', opacity: 0.6 }}>›</div>
            </Link>
          ) : (
            <Link href="/betalen" style={{ ...tapCard, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--warning-soft)', borderColor: 'rgba(255,170,51,0.28)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--warning)' }}>Nog niet betaald deze week</div>
              <div style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--muted)', opacity: 0.6 }}>›</div>
            </Link>
          )}
        </div>

        {/* Volgende trekking + eigen nummers */}
        <div style={{ padding: '0 20px', marginBottom: 14 }}>
          <Link href="/trekkingen" style={{ ...tapCard, padding: '13px 16px', display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase' }}>⏰ Volgende trekking</div>
              <div style={{ background: 'var(--accent-soft)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 18, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                {dagenTotVolgendeTrekking() === 0 ? 'Vandaag' : `Nog ${dagenTotVolgendeTrekking()} ${dagenTotVolgendeTrekking() === 1 ? 'dag' : 'dagen'}`}
              </div>
            </div>
            {profile?.tickets?.[0]?.nummers?.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 6 }}>
                {profile.tickets[0].nummers.map(n => (
                  <div key={n} className="bal bal-normal" style={{ width: '100%', aspectRatio: '1', fontSize: 12.5 }}>{n}</div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nog geen ticket ingesteld — stel je nummers in via Profiel.</div>
            )}
          </Link>
        </div>

        {/* Laatste trekking / winnaar */}
        {laatsteTrekking ? (
          <div style={{ padding: '0 20px', marginBottom: 14 }}>
            <Link href={`/trekkingen/${laatsteTrekking.id}`} style={{ ...tapCard, padding: '13px 16px', display: 'block', background: winnaarResultaat ? 'linear-gradient(135deg,rgba(240,192,96,0.1),rgba(240,192,96,0.02)), var(--surface)' : tapCard.background, borderColor: winnaarResultaat ? 'rgba(240,192,96,0.28)' : 'var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: winnaarResultaat ? 'var(--gold)' : 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Laatste trekking — {formatDatum(laatsteTrekking.datum)}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {laatsteTrekking.nummers.map(n => {
                  const isHit = mijnResultaatLaatste?.matchedNumbers?.includes(n) ?? false;
                  return <div key={n} className={`bal ${isHit ? 'bal-hit' : 'bal-normal'}`} style={{ width: 28, height: 28, fontSize: 11 }}>{n}</div>;
                })}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 9 }}>
                {winnaarResultaat
                  ? <>🎉 <span style={{ color: 'var(--gold)' }}>{winnaarResultaat.userNaam}</span> — {winnaarResultaat.aantalGoed} goed{winnaarResultaat.prijsBedrag != null ? <> — <span style={{ color: 'var(--gold)' }}>€{winnaarResultaat.prijsBedrag.toFixed(0)}</span></> : ''}</>
                  : mijnResultaatLaatste ? `Jij: ${mijnResultaatLaatste.aantalGoed} goed` : 'Geen winnaar deze trekking'}
              </div>
              <div style={chevron}>›</div>
            </Link>
          </div>
        ) : !laden && (
          <div style={{ padding: '0 20px', marginBottom: 14 }}>
            <div style={{ ...tapCard, padding: '16px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nog geen trekkingen dit seizoen.</div>
          </div>
        )}

        {/* Deelnemers — betaalstatus van de club zit hierin verwerkt */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <Link href="/deelnemers" style={{ ...tapCard, padding: '13px 16px', display: 'block' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Deelnemers</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--success)', marginBottom: 10 }}>
              {laden ? 'Laden…' : `${aantalBetaald} / ${actieveLeden.length} betaald deze week`}
            </div>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
              {actieveLeden.slice(0, 6).map(lid => (
                <div key={lid.id} style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--white)', border: `2px solid ${betaaldeLeden.has(lid.id) ? 'var(--success)' : 'var(--warning)'}`, overflow: 'hidden' }}>
                  {lid.foto ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : lid.naam.charAt(0).toUpperCase()}
                </div>
              ))}
              {actieveLeden.length > 6 && (
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>
                  +{actieveLeden.length - 6}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--success)' }}>● betaald</div>
              <div style={{ fontSize: 11, color: 'var(--warning)' }}>● nog niet</div>
            </div>
            <div style={chevron}>›</div>
          </Link>
        </div>
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/dashboard', icon: '🏠', label: 'Dashboard', active: true },
          { href: '/trekkingen', icon: '🎱', label: 'Trekkingen', active: false },
          { href: '/ranglijst', icon: '📈', label: 'Ranglijst', active: false },
          { href: '/kas', icon: '💰', label: 'Kas', active: false },
          { href: '/profiel', icon: '👤', label: 'Profiel', active: false },
        ].map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${item.active ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-dot" />
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPageContent />
    </ProtectedRoute>
  );
}

