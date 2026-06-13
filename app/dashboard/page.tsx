'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { mockUser, mockTrekkingen, mockLeden } from '@/lib/mock-data';

function DashboardPageContent() {
  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.5px' }}>Goedemorgen 👋</span>
            <Link href="/profiel">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#4a9eff,#2070cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '2px solid rgba(74,158,255,0.3)' }}>👩‍🦱</div>
            </Link>
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -1, lineHeight: 1.1 }}>{mockUser.naam.split(' ')[0]}</div>
        </div>

        {/* Pot hero */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c 0%,#0f2438 100%)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>💰 Huidige pot</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 52, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>€1.247</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Seizoen 2026 · Ronde 22 · 17 deelnemers</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/betalen" style={{ flex: 1, background: 'linear-gradient(135deg,#4a9eff,#2070cc)', color: 'var(--white)', borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none', boxShadow: '0 6px 20px rgba(74,158,255,0.3)' }}>💳 Betaal €4</Link>
              <Link href="/trekkingen" style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', color: 'var(--white)', borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>🎱 Trekkingen</Link>
            </div>
          </div>
        </div>

        {/* Betaalstatus */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Betaalstatus</div>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ronde 22 — €4,00</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Betaald · 30 mei 2026 · iDEAL</div>
            </div>
            <span className="badge badge-green">Betaald</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Dit seizoen</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🎯', value: '3.4', label: 'Gem. goed', color: 'var(--accent)' },
              { icon: '🏆', value: '3×', label: 'Gewonnen', color: 'var(--gold)' },
              { icon: '💶', value: '€75', label: 'Verdiend', color: 'var(--success)' },
              { icon: '📊', value: '#2', label: 'Positie', color: 'var(--accent)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.8, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Laatste trekking */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Laatste trekking</div>
            <Link href="/trekkingen" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Alle →</Link>
          </div>
          <Link href="/trekkingen/21" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08) 0%,var(--surface) 100%)', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 18, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>Ronde 21 · 24 mei</span>
                <span className="badge badge-gold">🏆 Winnaar</span>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                {[6,16,19,23,24,31].map(n => (
                  <div key={n} className="bal bal-normal" style={{ width: 34, height: 34, fontSize: 12 }}>{n}</div>
                ))}
                <div className="bal bal-bonus" style={{ width: 34, height: 34, fontSize: 11 }}>B·12</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Jenny Smit · 4 goed · Jij: 3 goed</div>
            </div>
          </Link>
        </div>

        {/* Deelnemers */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Deelnemers ronde 22</div>
            <Link href="/leden" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Alle →</Link>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['👩‍🦱','👩','👨','👩‍🦰','🧔','👦'].map((e, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `2px solid ${i < 4 ? 'var(--success)' : 'var(--warning)'}` }}>{e}</div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', background: i < 4 ? 'var(--success)' : 'var(--warning)', border: '2px solid var(--navy)' }} />
                </div>
              ))}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>+11</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>14 betaald · 3 open · sluiting vrijdag</div>
          </div>
        </div>

        {/* Volgende ronde */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>⏰</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Volgende trekking morgen</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Zaterdag 31 mei 2026 · Ronde 22</div>
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/dashboard', icon: '🏠', label: 'Dashboard', active: true },
          { href: '/trekkingen', icon: '🎱', label: 'Trekkingen', active: false },
          { href: '/ranglijst', icon: '📈', label: 'Ranglijst', active: false },
          { href: '/kas', icon: '💰', label: 'Kas', active: false },
          { href: '/profiel', icon: '👤', label: 'Profiel', active: false },
        ].map(item => (
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

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPageContent />
    </ProtectedRoute>
  );
}
