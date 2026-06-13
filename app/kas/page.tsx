'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscribeKasmutaties, berekenKasSaldo } from '@/lib/firestore-payments';
import { Kasmutatie } from '@/lib/types';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas', active: true },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const typeIcon: Record<string,string> = { inleg:'💳', uitbetaling:'🏆', correctie:'⚖️' };
const typeBg: Record<string,string> = { inleg:'var(--success-soft)', uitbetaling:'var(--error-soft)', correctie:'var(--warning-soft)' };

function formatDatum(ts: Kasmutatie['datum']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function maandKey(ts: Kasmutatie['datum']): string {
  if (!ts) return 'Onbekend';
  return ts.toDate().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}

function KasPageContent() {
  const [mutaties, setMutaties] = useState<Kasmutatie[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    const unsub = subscribeKasmutaties((data) => {
      setMutaties(data);
      setLaden(false);
    });
    return unsub;
  }, []);

  const saldo = berekenKasSaldo(mutaties);

  const nu = new Date();
  const ontvangenDezeMaand = mutaties
    .filter(m => m.type === 'inleg' && m.datum && m.datum.toDate().getMonth() === nu.getMonth() && m.datum.toDate().getFullYear() === nu.getFullYear())
    .reduce((s, m) => s + m.bedrag, 0);
  const uitbetaaldDezeMaand = mutaties
    .filter(m => m.type === 'uitbetaling' && m.datum && m.datum.toDate().getMonth() === nu.getMonth() && m.datum.toDate().getFullYear() === nu.getFullYear())
    .reduce((s, m) => s + m.bedrag, 0);

  // Groepeer per maand
  const groepen: { label: string; items: Kasmutatie[] }[] = [];
  for (const m of mutaties) {
    const label = maandKey(m.datum);
    let groep = groepen.find(g => g.label === label);
    if (!groep) {
      groep = { label, items: [] };
      groepen.push(groep);
    }
    groep.items.push(m);
  }

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Kas & Kasboek</div>
        </div>

        {/* Pot card */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>💰 Huidige pot</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>€{saldo.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>kasSaldo = som van alle kasmutaties</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>+€{ontvangenDezeMaand.toFixed(2)}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Ontvangen deze maand</div></div>
              <div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--error)' }}>−€{Math.abs(uitbetaaldDezeMaand).toFixed(2)}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Uitbetaald deze maand</div></div>
            </div>
          </div>
        </div>

        {laden && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!laden && mutaties.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 14 }}>
            Nog geen kasmutaties. Zodra betalingen worden bevestigd of uitbetalingen/correcties worden geregistreerd, verschijnen ze hier.
          </div>
        )}

        {/* Mutaties */}
        <div style={{ padding: '0 20px' }}>
          {groepen.map(({ label, items }) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, marginTop: 12 }}>{label}</div>
              {items.map((m, i, arr) => (
                <div key={m.id} style={{ background: 'var(--surface)', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, borderRadius: i===0 ? '16px 16px 0 0' : i===arr.length-1 ? '0 0 16px 16px' : 0, borderBottom: i<arr.length-1 ? '1px solid rgba(74,158,255,0.06)' : 'none', marginBottom: i===arr.length-1 ? 4 : 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: typeBg[m.type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{typeIcon[m.type]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--white)' }}>{m.omschrijving}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{formatDatum(m.datum)}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: m.bedrag > 0 ? 'var(--success)' : 'var(--error)' }}>{m.bedrag > 0 ? '+' : ''}€{m.bedrag.toFixed(2)}</span>
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
