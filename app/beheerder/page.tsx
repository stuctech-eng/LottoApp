'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

const NAV = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard', active: true },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function BeheerderPageContent() {
  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 2 }}>👑 Beheerder</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -1, marginBottom: 6 }}>Dashboard</div>
          <span className="badge badge-gold">⚙️ Systeembeheer</span>
        </div>

        {/* Systeem overzicht */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#2a1c00,#0d1b2a)', border: '1px solid rgba(240,192,96,0.18)', borderRadius: 22, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s ease infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>Systeem operationeel</span>
            </div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, letterSpacing: -0.5, marginBottom: 16 }}>LottoClub 2026</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['17','Actieve leden'],['22','Huidige ronde'],['€1.247','Pot']].map(([v,l]) => (
                <div key={l} style={{ background: 'rgba(240,192,96,0.08)', border: '1px solid rgba(240,192,96,0.12)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{v}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Snelle acties */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Snelle acties</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{icon:'🎱',label:'Trekking invoeren',href:'/trekkingen',bg:'var(--accent-soft)'},{icon:'👥',label:'Leden beheren',href:'/leden',bg:'var(--gold-soft)'},{icon:'💰',label:'Kasboek',href:'/kas',bg:'var(--success-soft)'},{icon:'💸',label:'Financieel beheer',href:'/kashouder/financieel',bg:'rgba(52,201,122,0.06)'},{icon:'⚙️',label:'Instellingen',href:'/beheerder/admin',bg:'var(--purple-soft)'}].map(a => (
              <Link key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: a.bg, border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{a.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{a.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Vereist aandacht</div>
          {[{icon:'⚠️',title:'3 leden niet betaald',sub:'Ronde 22 · Sluiting vrijdag'},{icon:'📷',title:'2 betaalbewijzen wachten',sub:'Rob de Vries, Els Bakker'}].map(a => (
            <div key={a.title} style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{a.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Seizoen */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div className="section-title">Seizoen 2026</div>
          <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 18, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Seizoen 2026</span>
              <span className="badge badge-green">● Actief</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[['22','Rondes'],['17','Leden'],['€1.247','Pot']].map(([v,l]) => (
                <div key={l}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>{v}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${'active' in item && item.active ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label" style={'active' in item && item.active ? { color: 'var(--gold)' } : {}}>{item.label}</span>
            <span className="nav-dot" style={{ background: 'var(--gold)' }} />
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function BeheerderPage() {
  return (
    <ProtectedRoute allowedRoles={['beheerder']}>
      <BeheerderPageContent />
    </ProtectedRoute>
  );
}
