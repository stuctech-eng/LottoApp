'use client';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst', active: true },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

export default function HallOfFamePage() {
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

        {/* Records */}
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div className="section-title">All-time records</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { emoji:'💰', cat:'Hoogste uitbetaling', naam:'Jenny Smit', value:'€250', sub:'Ronde 8 · 2025' },
              { emoji:'🎯', cat:'Meeste goed ooit', naam:'Jan de Boer', value:'5 goed', sub:'Ronde 14 · 2025' },
              { emoji:'🔥', cat:'Langste reeks', naam:'Neeltje Visser', value:'8 rondes', sub:'≥3 goed op rij' },
              { emoji:'🏆', cat:'Meeste overwinningen', naam:'Jenny Smit', value:'12 keer', sub:'2024 + 2025' },
            ].map(r => (
              <div key={r.cat} style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 18, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{r.emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{r.cat}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)', marginBottom: 3 }}>{r.naam}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{r.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Beste moment */}
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div className="section-title">Legendarisch moment</div>
          <div style={{ background: 'linear-gradient(135deg,rgba(74,158,255,0.08),var(--surface))', border: '1px solid rgba(74,158,255,0.18)', borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>🌟 Grootste trekking ooit</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, letterSpacing: -0.3, marginBottom: 8 }}>Jenny Smit · 5 goed · Ronde 8</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>Op 22 maart 2025 raadde Jenny Smit 5 van de 6 getrokken nummers correct. De pot stond op €312 — de grootste uitbetaling ooit.</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[7,14,19,23,31,38].map((n,i) => (
                <div key={n} className={`bal ${i!==2?'bal-bonus':'bal-normal'}`} style={{ width: 34, height: 34, fontSize: 11 }}>{n}</div>
              ))}
            </div>
          </div>
        </div>

        {/* HOF lijst */}
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div className="section-title">All-time top deelnemers</div>
          {[
            { medal:'🥇', emoji:'👩', naam:'Jenny Smit', wins:12, verdiend:'€475', gem:'3.8', punten:124, gold:true },
            { medal:'🥈', emoji:'👩‍🦱', naam:'Neeltje Visser', wins:7, verdiend:'€225', gem:'3.4', punten:108, gold:false },
            { medal:'🥉', emoji:'👨', naam:'Jan de Boer', wins:5, verdiend:'€150', gem:'3.1', punten:96, gold:false },
          ].map(h => (
            <Link key={h.naam} href="/profiel" style={{ textDecoration: 'none' }}>
              <div style={{ background: h.gold ? 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))' : 'var(--surface)', border: `1px solid ${h.gold ? 'rgba(240,192,96,0.2)' : 'var(--border)'}`, borderRadius: 18, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 24, width: 36, textAlign: 'center', flexShrink: 0 }}>{h.medal}</span>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `2px solid ${h.gold ? 'rgba(240,192,96,0.4)' : 'var(--border)'}`, flexShrink: 0 }}>{h.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{h.naam}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>🏆 <span style={{ color: 'var(--white)', fontWeight: 600 }}>{h.wins}</span> overwinningen</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>💶 <span style={{ color: 'var(--white)', fontWeight: 600 }}>{h.verdiend}</span></span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)', letterSpacing: -0.5 }}>{h.punten}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>all-time pt</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Club stats */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div className="section-title">Club statistieken all-time</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[['87','Rondes',''],['€3.480','Ingelegd','var(--gold)'],['€850','Uitbetaald','var(--success)'],['3','Seizoenen','var(--accent)'],['19','Max. leden',''],['5','Hoogste score','var(--gold)']].map(([v,l,c]) => (
              <div key={l} className="card" style={{ padding: '13px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: c || 'var(--white)', letterSpacing: -0.5 }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
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
