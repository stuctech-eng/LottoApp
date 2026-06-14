'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { haalHallOfFameOp, subscribeRanglijst, HallOfFameRecord, RanglijstEntry } from '@/lib/firestore-ranglijst';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst', active: true },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function HallOfFameContent() {
  const [records, setRecords] = useState<HallOfFameRecord[]>([]);
  const [topLeden, setTopLeden] = useState<RanglijstEntry[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    haalHallOfFameOp().then(data => {
      setRecords(data);
      setLaden(false);
    });
    const unsub = subscribeRanglijst(entries => setTopLeden(entries.slice(0, 3)));
    return unsub;
  }, []);

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
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            <div className="section-title">All-time records</div>
            <div style={{ display: 'grid', gridTemplateColumns: records.length >= 2 ? '1fr 1fr' : '1fr', gap: 12 }}>
              {records.map(r => (
                <div key={r.categorie} style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 18, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icoon}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{r.categorie}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)', marginBottom: 3 }}>{r.userNaam}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>{r.waarde}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{r.sub}</div>
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

        {/* Top deelnemers */}
        {topLeden.length > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            <div className="section-title">All-time top deelnemers</div>
            {topLeden.map((entry, i) => (
              <div key={entry.user.id} style={{ background: i === 0 ? 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))' : 'var(--surface)', border: `1px solid ${i === 0 ? 'rgba(240,192,96,0.2)' : 'var(--border)'}`, borderRadius: 18, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 24, width: 36, textAlign: 'center', flexShrink: 0 }}>{['🥇', '🥈', '🥉'][i]}</span>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `2px solid ${i === 0 ? 'rgba(240,192,96,0.4)' : 'var(--border)'}`, flexShrink: 0, overflow: 'hidden' }}>
                  {entry.user.foto ? <img src={entry.user.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{entry.user.naam}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>🏆 <span style={{ color: 'var(--white)', fontWeight: 600 }}>{entry.aantalGewonnen}</span> gewonnen</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>📊 <span style={{ color: 'var(--white)', fontWeight: 600 }}>{entry.aantalDeelnames}</span> rondes</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>🎯 gem. <span style={{ color: 'var(--white)', fontWeight: 600 }}>{entry.gemiddeldeScore}</span></span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)', letterSpacing: -0.5 }}>{entry.totaalPunten}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>punten</div>
                </div>
              </div>
            ))}
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
