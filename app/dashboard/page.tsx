'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeKasmutaties, berekenKasSaldo, subscribeBetalingen, subscribeUserBetalingen } from '@/lib/firestore-payments';
import { subscribeSeizoen } from '@/lib/firestore-seizoenen';
import { subscribeAlleTrekkingen, subscribeResultaten } from '@/lib/firestore-trekkingen';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { Kasmutatie, Betaling, Seizoen, Trekking, Resultaat, User } from '@/lib/types';

// Bereken volgende zaterdag
function volgendeZaterdag(): string {
  const nu = new Date();
  const dag = nu.getDay(); // 0=zo, 6=za
  const dagenTot = dag === 6 ? 7 : (6 - dag);
  const za = new Date(nu);
  za.setDate(nu.getDate() + dagenTot);
  return za.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDatum(ts: Trekking['datum']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
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

  // Rol-router
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

  // Laad resultaten van de laatste trekking
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

  // ── Berekeningen ──
  const saldo = berekenKasSaldo(mutaties);
  const actieveLeden = leden.filter(l => l.actief);
  const betaaldeLeden = new Set(betalingen.filter(b => b.status === 'betaald').map(b => b.userId));
  const aantalBetaald = actieveLeden.filter(l => betaaldeLeden.has(l.id)).length;
  const aantalOpen = actieveLeden.length - aantalBetaald;

  // Eigen betaalstatus
  const mijnLaatsteBetaling = mijnBetalingen[0] ?? null;
  const heeftBetaald = mijnLaatsteBetaling?.status === 'betaald';
  const inVerificatie = mijnLaatsteBetaling?.status === 'verificatie';

  // Mijn resultaten in de laatste trekking
  const mijnResultaatLaatste = mijnResultaten.find(r => r.userId === user?.uid);

  // Winnaar van laatste trekking
  const winnaarResultaat = mijnResultaten.find(r => r.isWinnaar);

  // Stats — alle resultaten van dit lid ophalen zou een extra query zijn,
  // we tonen de ranglijstpunten en ranglijstpositie vanuit het profiel
  const mijnPunten = profile?.ranglijstPunten ?? 0;
  const mijnPositie = leden
    .filter(l => l.actief)
    .sort((a, b) => (b.ranglijstPunten ?? 0) - (a.ranglijstPunten ?? 0))
    .findIndex(l => l.id === user?.uid) + 1;

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
                  {winnaarResultaat
                    ? <span className="badge badge-gold">🏆 Winnaar</span>
                    : <span className="badge badge-green">✓ Verwerkt</span>
                  }
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
                  {winnaarResultaat && winnaarResultaat.userId !== user?.uid
                    ? `${winnaarResultaat.userNaam} · ${winnaarResultaat.aantalGoed} goed`
                    : ''
                  }
                  {mijnResultaatLaatste
                    ? ` · Jij: ${mijnResultaatLaatste.aantalGoed} goed`
                    : ' · Jouw resultaat laden…'
                  }
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
            <Link href="/leden" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Alle →</Link>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {actieveLeden.slice(0, 6).map((lid) => (
                <div key={lid.id} style={{ position: 'relative' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: 'var(--white)', border: `2px solid ${betaaldeLeden.has(lid.id) ? 'var(--success)' : 'var(--warning)'}`, overflow: 'hidden' }}>
                    {lid.foto
                      ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : lid.naam.charAt(0).toUpperCase()
                    }
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
