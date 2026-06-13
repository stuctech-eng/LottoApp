'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen', active: true },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function TrekkingPageContent() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Trekkingen</div>
          <button onClick={() => setModalOpen(true)} style={{ height: 40, padding: '0 16px', borderRadius: 13, background: 'linear-gradient(135deg,#4a9eff,#2070cc)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', boxShadow: '0 4px 14px rgba(74,158,255,0.3)' }}>+ Invoeren</button>
        </div>

        {/* Volgende trekking */}
        <div style={{ margin: '0 20px 20px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 36 }}>🎱</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>Volgende trekking</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, letterSpacing: -0.3, marginBottom: 3 }}>Zaterdag 31 mei</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ronde 22 · Nederlandse Lotto</div>
            </div>
            <div style={{ background: 'var(--accent-soft)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 12, padding: '10px 14px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: -0.5 }}>1</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>dag</div>
            </div>
          </div>
        </div>

        <div className="section-title" style={{ padding: '0 20px', marginBottom: 12 }}>Recente trekkingen</div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Ronde 22 verwacht */}
          <div className="card" style={{ padding: '16px 18px', borderColor: 'rgba(255,170,51,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Ronde 22</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Zaterdag 31 mei 2026</div>
              </div>
              <span className="badge badge-warning">⏳ Verwacht</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Trekking vindt vanavond plaats.</div>
          </div>

          {/* Ronde 21 */}
          <Link href="/trekkingen/21" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 18, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>Ronde 21</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Zaterdag 24 mei 2026</div></div>
                <span className="badge badge-gold">🏆 Winnaar</span>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                {[6,16,19,23,24,31].map(n => <div key={n} className="bal bal-normal" style={{ width: 36, height: 36, fontSize: 12 }}>{n}</div>)}
                <div className="bal bal-bonus" style={{ width: 36, height: 36, fontSize: 11 }}>B·12</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👩</div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)' }}>Jenny Smit · <span style={{ color: 'var(--gold)' }}>4 goed</span></span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Jij: 3 goed ›</span>
              </div>
            </div>
          </Link>

          {/* Ronde 20 */}
          <Link href="/trekkingen/20" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>Ronde 20</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Zaterdag 17 mei 2026</div></div>
                <span className="badge badge-gold">🥇 Jij gewonnen!</span>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                {[10,12,15,27,34,40].map(n => <div key={n} className={`bal ${[10,15,34,40].includes(n) ? 'bal-hit' : 'bal-normal'}`} style={{ width: 36, height: 36, fontSize: 12 }}>{n}</div>)}
                <div className="bal bal-bonus" style={{ width: 36, height: 36, fontSize: 11 }}>B·8</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)' }}>Neeltje Visser · <span style={{ color: 'var(--gold)' }}>4 goed</span> 🎉 ›</div>
            </div>
          </Link>

          {/* Ronde 19 */}
          <Link href="/trekkingen/19" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>Ronde 19</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Zaterdag 10 mei 2026</div></div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                {[3,11,22,28,31,38].map(n => <div key={n} className={`bal ${n===31?'bal-hit':'bal-normal'}`} style={{ width: 36, height: 36, fontSize: 12 }}>{n}</div>)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--white)' }}>Jan de Boer · <span style={{ color: 'var(--gold)' }}>3 goed</span></span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Jij: 1 goed ›</span>
              </div>
            </div>
          </Link>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div style={{ width: '100%', background: 'var(--navy-mid)', borderRadius: '24px 24px 0 0', borderTop: '1px solid var(--border)', padding: '0 24px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '14px auto 20px' }} />
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 20 }}>🎱 Trekking invoeren</div>
            <label className="form-label">Ronde</label>
            <select className="form-input"><option>Ronde 22 — 31 mei 2026</option></select>
            <label className="form-label">Getrokken nummers</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {[1,2,3,4,5,6].map(i => (
                <input key={i} type="number" placeholder={String(i)} min={1} max={45} style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
              ))}
            </div>
            <label className="form-label">Bonusbal</label>
            <input type="number" placeholder="Bonusnummer" className="form-input" />
            <button onClick={() => setModalOpen(false)} style={{ width: '100%', background: 'linear-gradient(135deg,#4a9eff,#2070cc)', color: 'white', border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>✓ Trekking opslaan & verwerken</button>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${item.active ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-dot" />
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function TrekkingPage() {
  return (
    <ProtectedRoute>
      <TrekkingPageContent />
    </ProtectedRoute>
  );
}
