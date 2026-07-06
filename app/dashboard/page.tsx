'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeKasmutaties, berekenKasSaldo, subscribeBetalingen, subscribeUserBetalingen } from '@/lib/firestore-payments';
import { subscribeSeizoen } from '@/lib/firestore-seizoenen';
import { subscribeAlleTrekkingen, subscribeResultaten } from '@/lib/firestore-trekkingen';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { Kasmutatie, Betaling, Seizoen, Trekking, Resultaat, User } from '@/lib/types';

// Kashouder contactgegevens dynamisch ophalen uit users collectie

function volgendeZaterdag(): string {
  const nu = new Date();
  const dag = nu.getDay();
  const dagenTot = dag === 6 ? 7 : (6 - dag);
  const za = new Date(nu);
  za.setDate(nu.getDate() + dagenTot);
  return za.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

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
function WinnaarScherm({ resultaat, kassaldo, trekking, kashouder, onGeclaimed }: { resultaat: Resultaat; kassaldo: number; trekking: Trekking; kashouder: User | null; onGeclaimed: () => void }) {
  const kashouderNaam = kashouder?.naam ?? 'de kashouder';
  const kashouderTelefoon = kashouder?.telefoon?.replace(/\s/g, '') ?? '';

  const tikkieBericht = encodeURIComponent(
    `Hoi ${kashouderNaam}! 🏆 Ik heb gewonnen bij LottoClub! Kun je €${kassaldo.toFixed(0)} overmaken? Stuur me een Tikkie!`
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
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 64, letterSpacing: -2, color: 'var(--gold)', lineHeight: 1, textShadow: '0 0 20px rgba(240,192,96,0.4)' }}>
            €{kassaldo.toFixed(0)}
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

  const [mutaties, setMutaties] = useState<Kasmutatie[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [mijnBetalingen, setMijnBetalingen] = useState<Betaling[]>([]);
  const [seizoen, setSeizoen] = useState<Seizoen | null>(null);
  const [trekkingen, setTrekkingen] = useState<Trekking[]>([]);
  const [leden, setLeden] = useState<User[]>([]);
  const [mijnResultaten, setMijnResultaten] = useState<Resultaat[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!profileLoading && profile) {
      if (profile.rol === 'kashouder') router.replace('/kashouder');
      else if (profile.rol === 'beheerder') router.replace('/beheerder');
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (!user) return;
    let geladen = 0;
    const klaar = () => { geladen++; if (geladen >= 5) setLaden(false); };

    const u1 = subscribeKasmutaties((m) => { setMutaties(m); klaar(); });
    const u2 = subscribeBetalingen((b) => { setBetalingen(b); klaar(); });
    const u3 = subscribeUserBetalingen(user.uid, (b) => { setMijnBetalingen(b); klaar(); });
    const u4 = subscribeSeizoen((s) => { setSeizoen(s); klaar(); });
    const u5 = subscribeAlleTrekkingen((t) => { setTrekkingen(t); klaar(); });
    const u6 = subscribeAllUsers(setLeden);

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
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

  const saldo = berekenKasSaldo(mutaties);
  const actieveLeden = leden.filter(l => l.actief);
  const betaaldeLeden = new Set(betalingen.filter(b => b.status === 'betaald').map(b => b.userId));
  const aantalBetaald = actieveLeden.filter(l => betaaldeLeden.has(l.id)).length;
  const aantalOpen = actieveLeden.length - aantalBetaald;

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

  const mijnPunten = profile?.ranglijstPunten ?? 0;
  const mijnPositie = leden
    .filter(l => l.actief)
    .sort((a, b) => (b.ranglijstPunten ?? 0) - (a.ranglijstPunten ?? 0))
    .findIndex(l => l.id === user?.uid) + 1;

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
      kassaldo={saldo}
      trekking={laatsteTrekking}
      kashouder={kashouder}
      onGeclaimed={() => setWinnaarGeclaimed(true)}
    />;
  }

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px' }}>
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

        {/* Pot hero */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c 0%,#0f2438 100%)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>💰 Huidige pot</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 52, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>
              {laden ? '…' : `€${saldo.toFixed(0)}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {seizoen ? seizoen.naam : '—'} · {actieveLeden.length} deelnemers
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/betalen" style={{ flex: 1, background: 'linear-gradient(135deg,#4a9eff,#2070cc)', color: 'var(--white)', borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none', boxShadow: '0 6px 20px rgba(74,158,255,0.3)' }}>💳 Betaal €4</Link>
              <Link href="/trekkingen" style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', color: 'var(--white)', borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>🎱 Trekkingen</Link>
            </div>
          </div>
        </div>

        {/* Betaalstatus */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Betaalstatus</div>
          {!mijnLaatsteBetaling && (
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⏳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Nog niet betaald</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Betaal via de Tikkie-link of overboeking</div>
              </div>
              <Link href="/betalen" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Betaal →</Link>
            </div>
          )}
          {inVerificatie && (
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>In verificatie — €{mijnLaatsteBetaling.bedrag.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Kashouder bevestigt zo snel mogelijk</div>
              </div>
              <span className="badge badge-warning">⏳ Wachten</span>
            </div>
          )}
          {heeftBetaald && (
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{mijnLaatsteBetaling.omschrijving} — €{mijnLaatsteBetaling.bedrag.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Betaald · {mijnLaatsteBetaling.bevestigd ? mijnLaatsteBetaling.bevestigd.toDate().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </div>
              </div>
              <span className="badge badge-green">Betaald</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Dit seizoen</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>🎯</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.8, color: 'var(--accent)' }}>{mijnPunten}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Ranglijst punten</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>📊</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.8, color: 'var(--accent)' }}>
                {laden || mijnPositie === 0 ? '—' : `#${mijnPositie}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Positie</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>🎱</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.8, color: 'var(--gold)' }}>{trekkingen.length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Trekkingen</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>👥</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.8, color: 'var(--success)' }}>{actieveLeden.length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Leden</div>
            </div>
          </div>
        </div>

        {/* Laatste trekking */}
        {laatsteTrekking && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Laatste trekking</div>
              <Link href="/trekkingen" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Alle →</Link>
            </div>
            <Link href={`/trekkingen/${laatsteTrekking.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: winnaarResultaat ? 'linear-gradient(135deg,rgba(240,192,96,0.08) 0%,var(--surface) 100%)' : 'var(--surface)', border: `1px solid ${winnaarResultaat ? 'rgba(240,192,96,0.2)' : 'var(--border)'}`, borderRadius: 18, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{formatDatum(laatsteTrekking.datum)}</span>
                  {winnaarResultaat ? <span className="badge badge-gold">🏆 Winnaar</span> : <span className="badge badge-green">✓ Verwerkt</span>}
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                  {laatsteTrekking.nummers.map(n => (
                    <div key={n} className="bal bal-normal" style={{ width: 34, height: 34, fontSize: 12 }}>{n}</div>
                  ))}
                  {laatsteTrekking.bonusBal !== null && (
                    <div className="bal bal-bonus" style={{ width: 34, height: 34, fontSize: 11 }}>B·{laatsteTrekking.bonusBal}</div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {winnaarResultaat && winnaarResultaat.userId !== user?.uid ? `${winnaarResultaat.userNaam} · ${winnaarResultaat.aantalGoed} goed` : ''}
                  {mijnResultaatLaatste ? ` · Jij: ${mijnResultaatLaatste.aantalGoed} goed` : ''}
                </div>
              </div>
            </Link>
          </div>
        )}

        {!laden && trekkingen.length === 0 && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div className="section-title">Laatste trekking</div>
            <div className="card" style={{ padding: '16px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nog geen trekkingen dit seizoen.
            </div>
          </div>
        )}

        {/* Deelnemers */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Deelnemers</div>
            <Link href="/deelnemers" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Alle →</Link>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {actieveLeden.slice(0, 6).map((lid) => (
                <div key={lid.id} style={{ position: 'relative' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: 'var(--white)', border: `2px solid ${betaaldeLeden.has(lid.id) ? 'var(--success)' : 'var(--warning)'}`, overflow: 'hidden' }}>
                    {lid.foto ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : lid.naam.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', background: betaaldeLeden.has(lid.id) ? 'var(--success)' : 'var(--warning)', border: '2px solid var(--navy)' }} />
                </div>
              ))}
              {actieveLeden.length > 6 && (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                  +{actieveLeden.length - 6}
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              {laden ? 'Laden…' : `${aantalBetaald} betaald · ${aantalOpen} open`}
            </div>
          </div>
        </div>

        {/* Volgende trekking */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>⏰</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Volgende trekking</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{volgendeZaterdag()}</div>
            </div>
          </div>
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
