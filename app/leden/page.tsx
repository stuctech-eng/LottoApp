'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscribeAllUsers, formatLidSinds } from '@/lib/firestore-users';
import { maakUitnodiging } from '@/lib/firestore-invites';
import { useAuth } from '@/lib/auth-context';
import { User } from '@/lib/types';

const NAV_KASHOUDER = [
  { href: '/kashouder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden', active: true },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/kashouder/financieel', icon: '💸', label: 'Financieel' },
];

const NAV_BEHEERDER = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden', active: true },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/kashouder/financieel', icon: '💸', label: 'Financieel' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer' },
];

const rolLabel: Record<string, string> = { lid: 'lid', kashouder: 'kashouder', beheerder: 'beheerder' };
const rolKleur: Record<string, string> = { lid: 'var(--accent)', kashouder: 'var(--success)', beheerder: 'var(--gold)' };

const tapCard = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 12,
  textDecoration: 'none',
  color: 'inherit',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderColor: 'var(--border)',
  borderTopColor: 'rgba(255,255,255,0.14)',
  borderRadius: 16,
  boxShadow: '0 5px 14px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.04) inset',
  padding: '13px 14px',
};

function LedenPageContent() {
  const { user, profile } = useAuth();
  const [zoek, setZoek] = useState('');
  const [filter, setFilter] = useState('Actief');
  const [leden, setLeden] = useState<User[]>([]);
  const [laden, setLaden] = useState(true);

  const isBeheerder = profile?.rol === 'beheerder';
  const NAV = isBeheerder ? NAV_BEHEERDER : NAV_KASHOUDER;
  const dashboardHref = isBeheerder ? '/beheerder' : '/kashouder';

  // Uitnodigen — zowel kashouder als beheerder mogen dit; deze pagina
  // zelf is al beperkt tot die twee rollen via ProtectedRoute.
  const [uitnodigingBezig, setUitnodigingBezig] = useState(false);
  const [uitnodigingLink, setUitnodigingLink] = useState<string | null>(null);
  const [uitnodigingFout, setUitnodigingFout] = useState<string | null>(null);

  const handleUitnodigen = async () => {
    if (!user || !profile) return;
    setUitnodigingBezig(true);
    setUitnodigingFout(null);
    setUitnodigingLink(null);
    try {
      const token = await maakUitnodiging({ uid: user.uid, naam: profile.naam });
      setUitnodigingLink(`${window.location.origin}/uitnodiging/${token}`);
    } catch {
      setUitnodigingFout('Aanmaken van de uitnodiging is mislukt, probeer opnieuw.');
    } finally {
      setUitnodigingBezig(false);
    }
  };

  useEffect(() => {
    const unsub = subscribeAllUsers((users) => {
      setLeden(users);
      setLaden(false);
    });
    return unsub;
  }, []);

  const gefilterd = leden.filter(l => {
    if (!l.naam.toLowerCase().includes(zoek.toLowerCase())) return false;
    if (filter === 'Actief') return l.actief;
    if (filter === 'Inactief') return !l.actief;
    if (filter === 'Wachtrij') return l.wachtOpNieuweSpeelreeks === true;
    if (filter === 'Kashouders') return l.rol === 'kashouder';
    if (filter === 'Beheerders') return l.rol === 'beheerder';
    return true;
  });

  const totaal = leden.length;
  const actief = leden.filter(l => l.actief).length;
  const wachtrij = leden.filter(l => l.wachtOpNieuweSpeelreeks === true).length;
  const inactief = totaal - actief;

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 14px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Leden</div>
          <Link href={dashboardHref} style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)', flexShrink: 0 }}>←</Link>
        </div>

        {/* Uitnodigen */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            {!uitnodigingLink ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Nieuw lid? Maak een eenmalige uitnodigingslink — 7 dagen geldig, wordt automatisch ongeldig na gebruik.
                </div>
                {uitnodigingFout && (
                  <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 10 }}>⚠️ {uitnodigingFout}</div>
                )}
                <button
                  onClick={handleUitnodigen}
                  disabled={uitnodigingBezig}
                  style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: uitnodigingBezig ? 0.6 : 1 }}
                >
                  {uitnodigingBezig ? 'Bezig…' : '➕ Nieuw lid uitnodigen'}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 10 }}>✅ Uitnodiging aangemaakt</div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 12 }}>
                  {uitnodigingLink}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`🎱 Je bent uitgenodigd voor onze LottoClub.\n\nGebruik onderstaande link om lid te worden:\n${uitnodigingLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, textAlign: 'center', background: 'var(--success)', color: 'var(--navy)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                  >
                    💬 Via WhatsApp
                  </a>
                  <button
                    onClick={() => setUitnodigingLink(null)}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
                  >
                    Sluiten
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '0 20px', marginBottom: 12 }}>
          <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="🔍 Zoek lid…" style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 14, overflowX: 'auto' }}>
          {['Alle', 'Actief', 'Inactief', 'Wachtrij', 'Kashouders', 'Beheerders'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1.5px solid',
                background: filter === f ? (f === 'Wachtrij' ? 'var(--warning-soft)' : 'var(--accent-soft)') : 'var(--surface)',
                borderColor: filter === f ? (f === 'Wachtrij' ? 'rgba(255,170,51,0.35)' : 'rgba(74,158,255,0.35)') : 'var(--border)',
                color: filter === f ? (f === 'Wachtrij' ? 'var(--warning)' : 'var(--accent)') : 'var(--muted)',
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {f === 'Wachtrij' ? `⏳ Wachtrij` : f}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 16 }}>
          {[[String(totaal), 'Totaal', ''], [String(actief), 'Actief', 'var(--success)'], [String(wachtrij), 'Wachtrij', 'var(--warning)'], [String(inactief), 'Inactief', 'var(--muted)']].map(([v, l, c]) => (
            <div key={l} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: c || 'var(--white)' }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {laden && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!laden && gefilterd.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 14 }}>
            Geen leden gevonden
          </div>
        )}

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 8 }}>
          {gefilterd.map(lid => {
            const wacht = lid.wachtOpNieuweSpeelreeks === true;
            return (
              <Link
                key={lid.id}
                href={`/leden/${lid.id}`}
                style={{
                  ...tapCard,
                  opacity: lid.actief ? 1 : 0.55,
                  borderColor: wacht ? 'rgba(255,170,51,0.4)' : tapCard.borderColor,
                  boxShadow: wacht ? '0 5px 14px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,170,51,0.15) inset' : tapCard.boxShadow,
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--white)', border: `2px solid ${wacht ? 'var(--warning)' : lid.actief ? 'var(--success)' : 'var(--muted)'}`, flexShrink: 0, overflow: 'hidden' }}>
                  {lid.foto ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : lid.naam.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lid.naam}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: wacht ? 'var(--warning)' : 'var(--muted)' }}>
                    {wacht ? '⏳ Wacht op nieuwe speelreeks' : !lid.actief ? 'Inactief' : `sinds ${formatLidSinds(lid.lidSinds)}`}
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: rolKleur[lid.rol], background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '3px 8px', flexShrink: 0 }}>
                  {rolLabel[lid.rol] ?? lid.rol}
                </div>
              </Link>
            );
          })}
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

export default function LedenPage() {
  return (
    <ProtectedRoute allowedRoles={['kashouder', 'beheerder']}>
      <LedenPageContent />
    </ProtectedRoute>
  );
}
