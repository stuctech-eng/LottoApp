'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import Link from 'next/link';
import { mockLeden } from '@/lib/mock-data';

const NAV = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden', active: true },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer' },
];

const emojis = ['👩‍🦱','👩','👨','👩‍🦰','🧔','👦','👴'];
const rolColors: Record<string,string> = { lid:'badge-blue', kashouder:'badge-green', beheerder:'badge-gold' };

function LedenPageContent() {
  const [zoek, setZoek] = useState('');
  const [filter, setFilter] = useState('Alle');
  const gefilterd = mockLeden.filter(l => l.naam.toLowerCase().includes(zoek.toLowerCase()));

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 14px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Leden</div>
          <button style={{ height: 40, padding: '0 16px', borderRadius: 13, background: 'linear-gradient(135deg,var(--accent),#2070cc)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>+ Lid</button>
        </div>

        <div style={{ padding: '0 20px', marginBottom: 12 }}>
          <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="🔍 Zoek lid…" style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 14, overflowX: 'auto' }}>
          {['Alle','Actief','Betaald','Niet betaald'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1.5px solid', background: filter===f?'var(--accent-soft)':'var(--surface)', borderColor: filter===f?'rgba(74,158,255,0.35)':'var(--border)', color: filter===f?'var(--accent)':'var(--muted)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{f}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 16 }}>
          {[['17','Totaal',''],['14','Betaald','var(--success)'],['3','Open','var(--warning)'],['2','Inactief','']].map(([v,l,c]) => (
            <div key={l} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: c || 'var(--white)' }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
          {gefilterd.map((lid, i) => (
            <Link key={lid.id} href="/profiel" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: i<3 ? `4px solid ${i===0?'var(--gold)':i===1?'#c0c8d0':'#c08050'}` : `1px solid var(--border)`, borderRadius: 16, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{emojis[i % emojis.length]}</div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', background: i<4?'var(--success)':'var(--warning)', border: '2px solid var(--navy)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i<3 && <span>{['🥇','🥈','🥉'][i]}</span>}
                    {lid.naam}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{lid.ranglijstPunten} pt · {lid.lidSinds}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`badge ${rolColors[lid.rol]}`}>{lid.rol}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: i<4?'var(--success)':'var(--warning)' }}>{i<4?'✓ betaald':'⏳ open'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <nav className="bottom-nav" style={{ '--nav-active': 'var(--gold)' } as React.CSSProperties}>
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${'active' in item && item.active ? 'active' : ''}`} style={{ '--nav-active-color': 'var(--gold)' } as React.CSSProperties}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label" style={'active' in item && item.active ? { color: 'var(--gold)' } : {}}>{item.label}</span>
            <span className="nav-dot" style={{ background: 'var(--gold)' }} />
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function LedenPage() {
  return (
    <ProtectedRoute>
      <LedenPageContent />
    </ProtectedRoute>
  );
}
