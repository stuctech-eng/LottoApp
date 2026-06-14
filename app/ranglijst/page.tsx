'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { subscribeRanglijst, RanglijstEntry } from '@/lib/firestore-ranglijst';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst', active: true },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const posColor = ['var(--gold)', '#c0c8d0', '#c08050'];
const podiumH = ['64px', '48px', '36px'];

function RanglijstPageContent() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<RanglijstEntry[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    const unsub = subscribeRanglijst(data => {
      setEntries(data);
      setLaden(false);
    });
    return unsub;
  }, []);

  const top3 = entries.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 12px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Ranglijst</div>
          <Link href="/hall-of-fame">
            <button style={{ height: 38, padding: '0 14px', borderRadius: 13, background: 'var(--gold-soft)', border: '1px solid rgba(240,192,96,0.25)', color: 'var(--gold)', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>🏆 Hall of Fame</button>
          </Link>
        </div>

        {laden && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!laden && entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 14 }}>
            Nog geen ranglijstdata. Voer een trekking in om de ranglijst te vullen.
          </div>
        )}

        {/* Podium */}
        {top3.length >= 2 && (
          <div style={{ padding: '0 20px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
            {podiumOrder.map((entry, podiumIdx) => {
              const rangIdx = top3.indexOf(entry);
              const isFirst = rangIdx === 0;
              const sizes = ['72px', '60px', '56px'];
              return (
                <div key={entry.user.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div style={{ width: sizes[rangIdx], height: sizes[rangIdx], borderRadius: '50%', background: '#1a2f45', border: `3px solid ${posColor[rangIdx]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: rangIdx === 0 ? 26 : 22, position: 'relative' }}>
                    {entry.user.foto
                      ? <img src={entry.user.foto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : <span>👤</span>
                    }
                    {isFirst && <div style={{ position: 'absolute', top: -14, fontSize: 18 }}>👑</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center', color: 'var(--white)' }}>{entry.user.naam.split(' ')[0]}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{entry.totaalPunten} pt</div>
                  <div style={{ width: '100%', height: podiumH[rangIdx], borderRadius: '12px 12px 0 0', background: `rgba(${rangIdx===0?'240,192,96':rangIdx===1?'192,200,208':'192,128,80'},0.15)`, border: `1px solid ${posColor[rangIdx]}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: posColor[rangIdx] }}>{rangIdx + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Volledige lijst */}
        {entries.length > 0 && (
          <>
            <div className="section-title" style={{ padding: '0 20px', marginBottom: 10 }}>Volledige ranglijst</div>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {entries.map(entry => {
                const isIk = user && entry.user.id === user.uid;
                const posC = entry.positie === 1 ? 'var(--gold)' : entry.positie === 2 ? '#c0c8d0' : entry.positie === 3 ? '#c08050' : 'var(--muted)';
                return (
                  <div key={entry.user.id} style={{ background: isIk ? 'var(--accent-soft)' : 'var(--surface)', border: `1px solid ${isIk ? 'rgba(74,158,255,0.3)' : 'var(--border)'}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: posC, width: 24, textAlign: 'center', flexShrink: 0 }}>{entry.positie}</span>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, overflow: 'hidden' }}>
                      {entry.user.foto ? <img src={entry.user.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {entry.user.naam}
                        {isIk && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 400 }}> (jij)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {entry.aantalDeelnames} rondes · {entry.aantalGewonnen}× gewonnen · gem. {entry.gemiddeldeScore} goed
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--white)' }}>{entry.totaalPunten}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>punten</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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

export default function RanglijstPage() {
  return (
    <ProtectedRoute>
      <RanglijstPageContent />
    </ProtectedRoute>
  );
}
