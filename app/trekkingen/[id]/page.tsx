'use client';
import Link from 'next/link';
import { mockUser } from '@/lib/mock-data';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen', active: true },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const getrokken = [6, 16, 19, 23, 24, 31];
const bonusBal = 12;

export default function TrekkingDetailPage() {
  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Hero */}
        <div style={{ background: 'linear-gradient(180deg,#1a3a5c 0%,var(--navy) 100%)', padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 28px' }}>
          <Link href="/trekkingen" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Trekking resultaat</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 4 }}>Ronde 21</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Zaterdag 24 mei 2026 · Nederlandse Lotto</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {getrokken.map((n, i) => (
              <div key={n} className="bal bal-normal" style={{ width: 52, height: 52, fontSize: 17, animation: `ballDrop 0.4s ease ${0.1+i*0.1}s both` }}>{n}</div>
            ))}
            <div className="bal bal-bonus" style={{ width: 52, height: 52, fontSize: 13, animation: 'ballDrop 0.4s ease 0.7s both' }}>B·{bonusBal}</div>
          </div>
          {/* Winnaar banner */}
          <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.15),rgba(240,192,96,0.05))', border: '1px solid rgba(240,192,96,0.25)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 3 }}>Winnaar</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Jenny Smit</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Formulier A · 4 goed</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>€25</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Uitbetaald</div>
            </div>
          </div>
        </div>

        <div style={{ height: 20 }} />

        {/* Jouw resultaten */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Jouw resultaten</div>
          {mockUser.tickets.map((ticket) => {
            const hits = ticket.nummers.filter(n => getrokken.includes(n));
            return (
              <div key={ticket.naam} className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>🎱 {ticket.naam}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: hits.length >= 3 ? 'var(--accent-soft)' : 'var(--surface2)', color: hits.length >= 3 ? 'var(--accent)' : 'var(--muted)', border: `1px solid ${hits.length >= 3 ? 'rgba(74,158,255,0.25)' : 'var(--border)'}` }}>
                    {hits.length} goed {hits.length >= 4 ? '🥇' : hits.length >= 3 ? '🥈' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ticket.nummers.map(n => {
                    const hit = getrokken.includes(n);
                    return (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={`bal ${hit ? 'bal-hit' : 'bal-miss'}`} style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>{n}</div>
                        <span style={{ fontSize: 14, fontWeight: 500, flex: 1, color: hit ? 'var(--white)' : 'var(--muted)' }}>{n} — {hit ? 'getrokken ✅' : 'niet getrokken'}</span>
                        <span>{hit ? '✅' : '❌'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Alle spelers */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div className="section-title">Alle deelnemers</div>
          {[
            { pos:'1', emoji:'👩', naam:'Jenny Smit', hits:[6,19,24,31], score:'4 🏆', isMe:false, posColor:'var(--gold)' },
            { pos:'2', emoji:'👩‍🦱', naam:'Neeltje Visser', hits:[6,19,31], score:'3 🥈', isMe:true, posColor:'#c0c8d0' },
            { pos:'3', emoji:'🧔', naam:'Peter Janssen', hits:[16,23,31], score:'3 🥉', isMe:false, posColor:'#c08050' },
            { pos:'4', emoji:'👨', naam:'Jan de Boer', hits:[6,19], score:'2', isMe:false, posColor:'var(--muted)' },
            { pos:'5', emoji:'👩‍🦰', naam:'Lisa van Dam', hits:[24], score:'1', isMe:false, posColor:'var(--muted)' },
          ].map(s => (
            <div key={s.naam} style={{ background: s.isMe ? 'var(--accent-soft)' : 'var(--surface)', border: `1px solid ${s.isMe ? 'rgba(74,158,255,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.posColor, width: 22, textAlign: 'center', flexShrink: 0 }}>{s.pos}</span>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--navy-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{s.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{s.naam}{s.isMe && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 400 }}> (jij)</span>}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {getrokken.map(n => <div key={n} className={`bal ${s.hits.includes(n)?'bal-hit':'bal-miss'}`} style={{ width: 24, height: 24, fontSize: 9 }}>{n}</div>)}
                </div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{s.score}</span>
            </div>
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
