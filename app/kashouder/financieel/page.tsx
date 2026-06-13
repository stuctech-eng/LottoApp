'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

const NAV = [
  { href: '/kashouder', icon: '🏠', label: 'Dashboard' },
  { href: '/kas', icon: '📒', label: 'Kasboek' },
  { href: '/kashouder/financieel', icon: '💰', label: 'Financieel', active: true },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function FinancieelPageContent() {
  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 2 }}>⚡ Kashouder</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Financieel</div>
          </div>
          <Link href="/kashouder" style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
        </div>

        {/* Overzicht */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Overzicht deze maand</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{label:'Totale pot',value:'€1.247',color:'var(--gold)',sub:'Seizoen 2026'},{label:'Ontvangen mei',value:'+€136',color:'var(--success)',sub:'2 rondes'},{label:'Uitbetaald mei',value:'−€50',color:'var(--error)',sub:'2 winnaars'},{label:'Openstaand',value:'€12',color:'var(--white)',sub:'3 leden'}].map(s => (
              <div key={s.label} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.8, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Uitbetaling */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Uitbetaling registreren</div>
          <div className="card" style={{ padding: 18 }}>
            {[['Winnaar','select',['Selecteer lid…','Jenny Smit','Neeltje Visser','Jan de Boer']],['Bedrag','number',[]],['Ronde','select',['Ronde 22 — 31 mei 2026','Ronde 21 — 24 mei 2026']],['Opmerking','text',[]]].map(([l,t,opts]) => (
              <div key={String(l)}>
                <label className="form-label">{String(l)}</label>
                {t==='select'
                  ? <select className="form-input"><option>{(opts as string[])[0]}</option>{(opts as string[]).slice(1).map(o=><option key={o}>{o}</option>)}</select>
                  : <input type={String(t)} placeholder={String(l)==='Bedrag'?'€25,00':'Bijv. contant uitbetaald'} className="form-input" />
                }
              </div>
            ))}
            <button style={{ width: '100%', background: 'linear-gradient(135deg,var(--success),#1a8a50)', color: 'white', border: 'none', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>💸 Uitbetaling registreren</button>
          </div>
        </div>

        {/* Correctie */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div className="section-title">Kascorrectie</div>
          <div className="card" style={{ padding: 18 }}>
            <label className="form-label">Type correctie</label>
            <select className="form-input"><option>+ Toevoeging</option><option>− Aftrek</option></select>
            <label className="form-label">Bedrag</label>
            <input type="number" placeholder="€0,00" className="form-input" />
            <label className="form-label">Reden</label>
            <input type="text" placeholder="Omschrijving correctie…" className="form-input" />
            <button style={{ width: '100%', background: 'linear-gradient(135deg,var(--warning),#c07000)', color: 'var(--navy)', border: 'none', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>⚖️ Correctie doorvoeren</button>
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${'active' in item && item.active ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label" style={'active' in item && item.active ? { color: 'var(--success)' } : {}}>{item.label}</span>
            <span className="nav-dot" style={{ background: 'var(--success)' }} />
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function FinancieelPage() {
  return (
    <ProtectedRoute allowedRoles={['kashouder', 'beheerder']}>
      <FinancieelPageContent />
    </ProtectedRoute>
  );
}
