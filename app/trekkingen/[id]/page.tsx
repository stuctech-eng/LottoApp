'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeTrekking, subscribeResultaten } from '@/lib/firestore-trekkingen';
import { Trekking, Resultaat } from '@/lib/types';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen', active: true },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function formatDatum(ts: Trekking['datum']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function TrekkingDetailContent() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [trekking, setTrekking] = useState<Trekking | null>(null);
  const [resultaten, setResultaten] = useState<Resultaat[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!id) return;
    const u1 = subscribeTrekking(id, t => { setTrekking(t); setLaden(false); });
    const u2 = subscribeResultaten(id, setResultaten);
    return () => { u1(); u2(); };
  }, [id]);

  const mijnResultaten = user ? resultaten.filter(r => r.userId === user.uid) : [];
  const winnaars = resultaten.filter(r => r.isWinnaar);

  if (laden) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!trekking) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>Trekking niet gevonden</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Hero */}
        <div style={{ background: 'linear-gradient(180deg,#1a3a5c 0%,var(--navy) 100%)', padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 28px' }}>
          <Link href="/trekkingen" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Trekking resultaat</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 4 }}>{formatDatum(trekking.datum)}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Ingevoerd door {trekking.ingevoerdDoorNaam}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {trekking.nummers.map((n, i) => (
              <div key={n} className="bal bal-normal" style={{ width: 52, height: 52, fontSize: 17, animation: `ballDrop 0.4s ease ${0.1 + i * 0.08}s both` }}>{n}</div>
            ))}
            {trekking.bonusBal !== null && (
              <div className="bal bal-bonus" style={{ width: 52, height: 52, fontSize: 13, animation: 'ballDrop 0.4s ease 0.7s both' }}>B·{trekking.bonusBal}</div>
            )}
          </div>

          {/* Winnaars banner */}
          {winnaars.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.15),rgba(240,192,96,0.05))', border: '1px solid rgba(240,192,96,0.25)', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>🏆 Winnaar{winnaars.length > 1 ? 's' : ''}</div>
              {winnaars.map(w => (
                <div key={`${w.userId}-${w.ticketId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{w.userNaam} · {w.ticketNaam}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{w.aantalGoed} goed</span>
                </div>
              ))}
            </div>
          )}
          {!trekking.verwerkt && (
            <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '12px 14px', marginTop: 10, fontSize: 13, color: 'var(--warning)' }}>
              ⏳ Trekking wordt nog verwerkt…
            </div>
          )}
        </div>

        <div style={{ height: 20 }} />

        {/* Mijn resultaten */}
        {mijnResultaten.length > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div className="section-title">Mijn resultaten</div>
            {mijnResultaten.map(r => (
              <div key={r.id} className="card" style={{ padding: '16px 18px', marginBottom: 10, border: r.isWinnaar ? '1px solid rgba(240,192,96,0.3)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>🎱 {r.ticketNaam}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: r.aantalGoed >= 4 ? 'var(--gold-soft)' : r.aantalGoed >= 3 ? 'var(--accent-soft)' : 'var(--surface2)', color: r.aantalGoed >= 4 ? 'var(--gold)' : r.aantalGoed >= 3 ? 'var(--accent)' : 'var(--muted)' }}>
                    {r.aantalGoed} goed {r.isWinnaar ? '🏆' : r.aantalGoed >= 4 ? '🥇' : r.aantalGoed >= 3 ? '🥈' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {trekking.nummers.map(n => {
                    const hit = r.nummersGoed.includes(n);
                    return (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={`bal ${hit ? 'bal-hit' : 'bal-miss'}`} style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>{n}</div>
                        <span style={{ fontSize: 14, color: hit ? 'var(--white)' : 'var(--muted)' }}>{n} — {hit ? 'getrokken ✅' : 'niet getrokken'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alle deelnemers */}
        {resultaten.length > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 8 }}>
            <div className="section-title">Alle deelnemers</div>
            {Object.values(
              resultaten.reduce<Record<string, Resultaat & { tickets: Resultaat[] }>>((acc, r) => {
                if (!acc[r.userId]) acc[r.userId] = { ...r, tickets: [] };
                acc[r.userId].tickets.push(r);
                return acc;
              }, {})
            ).sort((a, b) => {
              const maxA = Math.max(...a.tickets.map(t => t.punten));
              const maxB = Math.max(...b.tickets.map(t => t.punten));
              return maxB - maxA;
            }).map((lid, i) => {
              const besteTicket = lid.tickets.reduce((a, b) => a.punten > b.punten ? a : b);
              const isIk = user && lid.userId === user.uid;
              return (
                <div key={lid.userId} style={{ background: isIk ? 'var(--accent-soft)' : 'var(--surface)', border: `1px solid ${isIk ? 'rgba(74,158,255,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--muted)', width: 22, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{lid.userNaam}{isIk && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 400 }}> (jij)</span>}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {trekking.nummers.map(n => (
                        <div key={n} className={`bal ${besteTicket.nummersGoed.includes(n) ? 'bal-hit' : 'bal-miss'}`} style={{ width: 24, height: 24, fontSize: 9 }}>{n}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: besteTicket.isWinnaar ? 'var(--gold)' : 'var(--white)' }}>{besteTicket.aantalGoed} {besteTicket.isWinnaar ? '🏆' : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{besteTicket.ticketNaam}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {resultaten.length === 0 && trekking.verwerkt && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 14 }}>
            Geen resultaten gevonden — leden hadden mogelijk nog geen tickets.
          </div>
        )}
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

export default function TrekkingDetailPage() {
  return (
    <ProtectedRoute>
      <TrekkingDetailContent />
    </ProtectedRoute>
  );
}
