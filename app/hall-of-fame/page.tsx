'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { haalHallOfFameOp, HallOfFameData } from '@/lib/firestore-ranglijst';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst', active: true },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const DREMPEL_LABEL: Record<number, string> = { 3: 'Eerste op 3/6', 4: 'Eerste op 4/6', 5: 'Eerste op 5/6' };

function HallOfFameContent() {
  const [data, setData] = useState<HallOfFameData | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    haalHallOfFameOp().then(d => {
      setData(d);
      setLaden(false);
    });
  }, []);

  const records = data?.hoofdrecords ?? [];

  return (
    <>
      <div className="bg-grid" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(240,192,96,0.10) 0%,transparent 70%)' }} />
      </div>
      <div className="page">
        {/* Hero */}
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 28px', textAlign: 'center' }}>
          <Link href="/ranglijst" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🏆</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36, letterSpacing: -1, color: 'var(--gold)', marginBottom: 6 }}>Hall of Fame</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>De legendarische prestaties van LottoClub</div>
        </div>

        {laden && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* Records */}
        {records.length > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {records.map(r => (
                <div key={r.categorie} style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 16, padding: '16px 14px' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{r.icoon}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{r.categorie}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>{r.userNaam}</div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>{r.waarde} · {r.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!laden && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 20px 32px', color: 'var(--muted)', fontSize: 14 }}>
            Nog geen records. Zodra trekkingen zijn verwerkt verschijnen hier de all-time prestaties.
          </div>
        )}

        {/* Race naar 6 — bewust kleiner/lichter dan de hoofdkaarten */}
        {data && data.raceNaarZes.some(r => r.userNaam) && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>🏁 Race naar 6</div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
              {data.raceNaarZes.map((r, i) => (
                <div key={r.drempel} style={{ textAlign: 'center', flex: 1, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{DREMPEL_LABEL[r.drempel]}</div>
                  {r.userNaam ? (
                    <>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.userNaam.split(' ')[0]}</div>
                      <div style={{ fontSize: 9.5, color: '#5c7188' }}>trekking {r.aantalTrekkingen}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>—</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* De getallen */}
        {data && (data.meestGevallenNummer || data.minstGevallenNummer) && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>🎱 De getallen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {data.meestGevallenNummer && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--muted)', marginBottom: 8 }}>Meest gevallen</div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(240,192,96,0.18)', border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--gold)', margin: '0 auto 6px' }}>{data.meestGevallenNummer.nummer}</div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>{data.meestGevallenNummer.aantal}× gevallen</div>
                </div>
              )}
              {data.minstGevallenNummer && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--muted)', marginBottom: 8 }}>Minst gevallen</div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#9db0c4', margin: '0 auto 6px' }}>{data.minstGevallenNummer.nummer}</div>
                  <div style={{ fontSize: 11, color: '#9db0c4', fontWeight: 600 }}>{data.minstGevallenNummer.aantal}× gevallen</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${'active' in item && item.active ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-dot" />
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function HallOfFamePage() {
  return (
    <ProtectedRoute>
      <HallOfFameContent />
    </ProtectedRoute>
  );
}
