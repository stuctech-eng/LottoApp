'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst', active: true },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const rangData = [
  { pos: 1, emoji: '👩', naam: 'Jenny Smit', rondes: 22, wins: 5, punten: 52, trend: '= stabiel', trendColor: 'var(--muted)', isMe: false },
  { pos: 2, emoji: '👩‍🦱', naam: 'Neeltje Visser', rondes: 22, wins: 3, punten: 48, trend: '↑ +1', trendColor: 'var(--success)', isMe: true },
  { pos: 3, emoji: '👨', naam: 'Jan de Boer', rondes: 21, wins: 2, punten: 43, trend: '= stabiel', trendColor: 'var(--muted)', isMe: false },
  { pos: 4, emoji: '👩‍🦰', naam: 'Lisa van Dam', rondes: 20, wins: 1, punten: 38, trend: '↑ +2', trendColor: 'var(--success)', isMe: false },
  { pos: 5, emoji: '🧔', naam: 'Peter Janssen', rondes: 19, wins: 1, punten: 35, trend: '↓ −1', trendColor: 'var(--error)', isMe: false },
  { pos: 6, emoji: '👵', naam: 'Mia Koster', rondes: 22, wins: 0, punten: 33, trend: '= stabiel', trendColor: 'var(--muted)', isMe: false },
  { pos: 7, emoji: '👴', naam: 'Henk Smeets', rondes: 22, wins: 0, punten: 31, trend: '↓ −2', trendColor: 'var(--error)', isMe: false },
  { pos: 8, emoji: '🧑', naam: 'Marco Visser', rondes: 22, wins: 0, punten: 29, trend: '= stabiel', trendColor: 'var(--muted)', isMe: false },
];

const posColor = ['var(--gold)', '#c0c8d0', '#c08050'];
const podiumOrder = [1, 0, 2];
const podiumH = ['64px', '48px', '36px'];

function RanglijstPageContent() {
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

        {/* Seizoen chips */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', overflowX: 'auto' }}>
          {['Seizoen 2026','Seizoen 2025','Seizoen 2024','All-time'].map((s, i) => (
            <div key={s} style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', background: i===0 ? 'var(--accent-soft)' : 'var(--surface)', borderColor: i===0 ? 'rgba(74,158,255,0.35)' : 'var(--border)', color: i===0 ? 'var(--accent)' : 'var(--muted)' }}>{s}</div>
          ))}
        </div>

        {/* Podium */}
        <div style={{ padding: '0 20px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
          {podiumOrder.map((idx) => {
            const d = rangData[idx];
            const p = idx;
            const sizes = ['72px','60px','56px'];
            return (
              <div key={d.naam} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ width: sizes[p], height: sizes[p], borderRadius: '50%', background: '#1a2f45', border: `3px solid ${posColor[p]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: p===0?26:22, position: 'relative' }}>
                  {['👩','👩‍🦱','👨'][p]}
                  {p===0 && <div style={{ position: 'absolute', top: -14, fontSize: 18 }}>👑</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center', color: 'var(--white)' }}>{d.naam.split(' ')[0]}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{d.punten} pt</div>
                <div style={{ width: '100%', height: podiumH[p], borderRadius: '12px 12px 0 0', background: `rgba(${p===0?'240,192,96':p===1?'192,200,208':'192,128,80'},0.15)`, border: `1px solid ${posColor[p]}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: posColor[p] }}>{p+1}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-title" style={{ padding: '0 20px', marginBottom: 10 }}>Volledige ranglijst</div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {rangData.map(d => (
            <Link key={d.naam} href="/profiel" style={{ textDecoration: 'none' }}>
              <div style={{ background: d.isMe ? 'var(--accent-soft)' : 'var(--surface)', border: `1px solid ${d.isMe ? 'rgba(74,158,255,0.3)' : 'var(--border)'}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: d.pos===1?'var(--gold)':d.pos===2?'#c0c8d0':d.pos===3?'#c08050':'var(--muted)', width: 24, textAlign: 'center', flexShrink: 0 }}>{d.pos}</span>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{d.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{d.naam}{d.isMe && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 400 }}> (jij)</span>}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{d.rondes} rondes · {d.wins}× gewonnen</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--white)' }}>{d.punten}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: d.trendColor }}>{d.trend}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
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
