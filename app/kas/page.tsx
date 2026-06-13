'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import Link from 'next/link';
import { mockKasmutaties } from '@/lib/mock-data';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas', active: true },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const typeIcon: Record<string,string> = { inleg:'💳', uitbetaling:'🏆', correctie:'⚖️' };
const typeBg: Record<string,string> = { inleg:'var(--success-soft)', uitbetaling:'var(--error-soft)', correctie:'var(--warning-soft)' };

function KasPageContent() {
  const [tab, setTab] = useState('kasboek');
  const [filter, setFilter] = useState('Alles');
  const mei = mockKasmutaties.filter(m => m.datum.startsWith('2026-05'));
  const apr = mockKasmutaties.filter(m => m.datum.startsWith('2026-04'));

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Kas & Kasboek</div>
          <button style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>⬇️</button>
        </div>

        {/* Pot card */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>💰 Huidige pot</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>€1.247</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Seizoen 2026 · Ronde 22</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>+€136</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ontvangen mei</div></div>
              <div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--error)' }}>−€50</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Uitbetaald mei</div></div>
              <div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)' }}>17</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Deelnemers</div></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', marginBottom: 4 }}>
          {[['kasboek','📒 Kasboek'],['inleg','💳 Inleg'],['uitbetaling','💸 Uitbetalingen']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500, color: tab===k ? 'var(--accent)' : 'var(--muted)', border: 'none', borderBottom: `2px solid ${tab===k ? 'var(--accent)' : 'transparent'}`, background: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{l}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', overflowX: 'auto' }}>
          {['Alles','Mei 2026','April 2026','Maart 2026'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1.5px solid', background: filter===f ? 'var(--accent-soft)' : 'var(--surface)', borderColor: filter===f ? 'rgba(74,158,255,0.35)' : 'var(--border)', color: filter===f ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{f}</button>
          ))}
        </div>

        {/* Saldo */}
        <div style={{ margin: '0 20px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Huidig saldo digitale kas</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--gold)' }}>€1.247,00</span>
        </div>

        {/* Mutaties */}
        <div style={{ padding: '0 20px' }}>
          {[['Mei 2026', mei], ['April 2026', apr]].map(([maand, items]) => (
            <div key={String(maand)}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, marginTop: 12 }}>{String(maand)}</div>
              {(items as typeof mei).map((m, i, arr) => (
                <div key={m.id} style={{ background: 'var(--surface)', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, borderRadius: i===0 ? '16px 16px 0 0' : i===arr.length-1 ? '0 0 16px 16px' : 0, borderBottom: i<arr.length-1 ? '1px solid rgba(74,158,255,0.06)' : 'none', marginBottom: i===arr.length-1 ? 4 : 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: typeBg[m.type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{typeIcon[m.type]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--white)' }}>{m.omschrijving}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.datum}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: m.bedrag > 0 ? 'var(--success)' : 'var(--error)' }}>{m.bedrag > 0 ? '+' : ''}€{Math.abs(m.bedrag)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ height: 16 }} />
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

export default function KasPage() {
  return (
    <ProtectedRoute>
      <KasPageContent />
    </ProtectedRoute>
  );
}
