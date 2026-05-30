'use client';
import Link from 'next/link';
import { mockUser } from '@/lib/mock-data';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel', active: true },
];

export default function ProfielPage() {
  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Hero */}
        <div style={{ background: 'linear-gradient(180deg,#1a3a5c 0%,var(--navy) 100%)', padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 28px' }}>
          <Link href="/dashboard" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#4a9eff,#2070cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: '3px solid rgba(74,158,255,0.3)' }}>👩‍🦱</div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--navy)', border: '2px solid var(--navy)' }}>2</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, letterSpacing: -0.5, marginBottom: 4 }}>{mockUser.naam}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Lid sinds {mockUser.lidSinds} · 22 rondes</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-blue">🎱 Lid</span>
                <span className="badge badge-green">✓ Betaald</span>
                <span className="badge badge-gold">🏆 #2</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 20 }}>
            {[['3×','Gewonnen','var(--gold)'],['€75','Verdiend','var(--success)'],['3.4','Gem. goed','var(--white)'],['48','Punten','var(--white)']].map(([v,l,c]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: c, letterSpacing: -0.5 }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 20 }} />

        {/* Tickets */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Lotto tickets</div>
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, cursor: 'pointer' }}>Bewerken</span>
          </div>
          {mockUser.tickets.map((ticket, i) => (
            <div key={ticket.naam} className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>🎱 {ticket.naam}</span>
                <span className={`badge ${i===0?'badge-blue':'badge-gold'}`}>{i===0?'Hoofdticket':'Extra'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ticket.nummers.map(n => {
                  const hot = [10,19,8,44].includes(n);
                  return <div key={n} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, background: hot ? 'var(--gold-soft)' : 'var(--navy-mid)', border: `1.5px solid ${hot ? 'rgba(240,192,96,0.4)' : 'var(--border)'}`, color: hot ? 'var(--gold)' : 'var(--white)' }}>{n}</div>;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Statistieken */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Seizoen statistieken</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon:'🎯', value:'3.4', label:'Gem. goed per ronde', sub:'↑ Beter dan 68% leden', color:'var(--accent)' },
              { icon:'🏆', value:'5', label:'Beste resultaat ooit', sub:'Ronde 14 · 5 goed', color:'var(--gold)' },
              { icon:'📊', value:'22', label:'Deelnames totaal', sub:'', color:'var(--white)' },
              { icon:'💶', value:'€75', label:'Totaal gewonnen', sub:'', color:'var(--success)' },
              { icon:'🔥', value:'4', label:'Huidige reeks', sub:'4 rondes ≥3 goed', color:'var(--white)' },
              { icon:'📈', value:'#2', label:'Positie ranglijst', sub:'↑ Was #3 vorige week', color:'var(--accent)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, letterSpacing: -0.8, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4, fontWeight: 500 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Recente resultaten */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Recente resultaten</div>
            <Link href="/trekkingen" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Alle →</Link>
          </div>
          {[
            { datum:'24 mei', nummers:[6,16,19,23,24,31], hits:[6,19,31], score:'3 goed 🥈' },
            { datum:'17 mei', nummers:[10,12,15,27,34,40], hits:[10,15,34,40], score:'4 goed 🥇' },
            { datum:'10 mei', nummers:[3,11,22,28,31,38], hits:[31], score:'1 goed' },
          ].map(r => (
            <Link key={r.datum} href="/trekkingen/21" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', width: 52, flexShrink: 0 }}>{r.datum}</span>
                <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                  {r.nummers.map(n => <div key={n} style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: r.hits.includes(n) ? 'linear-gradient(135deg,#4a9eff,#2070cc)' : 'var(--navy-mid)', color: r.hits.includes(n) ? 'white' : 'var(--muted)', border: r.hits.includes(n) ? 'none' : '1px solid var(--border)' }}>{n}</div>)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap' }}>{r.score}</span>
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
