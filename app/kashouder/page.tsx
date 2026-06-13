'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import Link from 'next/link';

const NAV = [
  { href: '/kashouder', icon: '🏠', label: 'Dashboard', active: true },
  { href: '/kas', icon: '📒', label: 'Kasboek' },
  { href: '/kashouder/financieel', icon: '💰', label: 'Financieel' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function KashouderPageContent() {
  const [approved, setApproved] = useState<string[]>([]);

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 2 }}>⚡ Kashouder</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -1, marginBottom: 6 }}>Dashboard</div>
          <span className="badge badge-green">💳 Kas beheer</span>
        </div>

        {/* Kas hero */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#0d2a1a,#0d1b2a)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 22, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 6 }}>💰 Totale pot</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>€1.247</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Seizoen 2026 · Ronde 22</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link href="/kashouder/financieel" style={{ background: 'rgba(52,201,122,0.1)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 13, padding: 12, textAlign: 'center', textDecoration: 'none' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>💸 Uitbetalen</div>
              </Link>
              <Link href="/kas" style={{ background: 'rgba(52,201,122,0.1)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 13, padding: 12, textAlign: 'center', textDecoration: 'none' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>📒 Kasboek</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Betaalvoortgang */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Betaalvoortgang ronde 22</div>
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>14 van 17 leden betaald</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>82%</span>
            </div>
            <div style={{ height: 8, background: 'var(--navy-mid)', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: '82%', borderRadius: 10, background: 'linear-gradient(90deg,var(--success),#20a050)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <span>€0</span><span>€56 van €68</span><span>€68</span>
            </div>
          </div>
        </div>

        {/* Betaalbewijzen */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Betaalbewijzen</div>
            <span style={{ fontSize: 12, background: 'var(--warning-soft)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>2 open</span>
          </div>
          {[{id:'rob',naam:'Rob de Vries'},{id:'els',naam:'Els Bakker'}].map(b => (
            !approved.includes(b.id) && (
              <div key={b.id} style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,170,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📷</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.naam}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>€4,00 · Ronde 22</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setApproved(a => [...a, b.id])} style={{ background: 'var(--success)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>✓</button>
                  <button style={{ background: 'var(--error-soft)', color: 'var(--error)', border: '1px solid rgba(255,90,90,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            )
          ))}
          {approved.length === 2 && <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--success)', padding: '12px 0' }}>✓ Alle bewijzen verwerkt</div>}
        </div>

        {/* Openstaand */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div className="section-title">Openstaand</div>
          <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,170,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Tim Hoekstra</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>€4,00 · Ronde 22</div>
            </div>
            <button style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>🔔 Herinner</button>
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

export default function KashouderPage() {
  return (
    <ProtectedRoute allowedRoles={['kashouder', 'beheerder']}>
      <KashouderPageContent />
    </ProtectedRoute>
  );
}
