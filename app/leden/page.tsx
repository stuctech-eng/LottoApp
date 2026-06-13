'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscribeAllUsers, formatLidSinds, updateUserRol } from '@/lib/firestore-users';
import { logAudit } from '@/lib/firestore-audit';
import { useAuth } from '@/lib/auth-context';
import { User, Rol } from '@/lib/types';

const NAV = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden', active: true },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer' },
];

const emojis = ['👩‍🦱','👩','👨','👩‍🦰','🧔','👦','👴','👵','🧑'];
const rolColors: Record<string,string> = { lid:'badge-blue', kashouder:'badge-green', beheerder:'badge-gold' };

function LedenPageContent() {
  const { user, profile } = useAuth();
  const [zoek, setZoek] = useState('');
  const [filter, setFilter] = useState('Alle');
  const [leden, setLeden] = useState<User[]>([]);
  const [laden, setLaden] = useState(true);
  const [bezigId, setBezigId] = useState<string | null>(null);

  const isBeheerder = profile?.rol === 'beheerder';

  const handleRolChange = async (lid: User, nieuweRol: Rol) => {
    if (!user || !profile || nieuweRol === lid.rol) return;
    setBezigId(lid.id);
    try {
      await updateUserRol(lid.id, nieuweRol);
      await logAudit('rol_gewijzigd', `${profile.naam} wijzigde rol van ${lid.naam}: ${lid.rol} → ${nieuweRol}`, { uid: user.uid, naam: profile.naam }, { doelUserId: lid.id });
    } finally {
      setBezigId(null);
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
    if (filter === 'Kashouders') return l.rol === 'kashouder';
    if (filter === 'Beheerders') return l.rol === 'beheerder';
    return true;
  });

  const totaal = leden.length;
  const actief = leden.filter(l => l.actief).length;
  const kashouders = leden.filter(l => l.rol === 'kashouder' || l.rol === 'beheerder').length;
  const inactief = totaal - actief;

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 14px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Leden</div>
        </div>

        <div style={{ padding: '0 20px', marginBottom: 12 }}>
          <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="🔍 Zoek lid…" style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', fontSize: 15, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 14, overflowX: 'auto' }}>
          {['Alle','Actief','Inactief','Kashouders','Beheerders'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1.5px solid', background: filter===f?'var(--accent-soft)':'var(--surface)', borderColor: filter===f?'rgba(74,158,255,0.35)':'var(--border)', color: filter===f?'var(--accent)':'var(--muted)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{f}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 16 }}>
          {[[String(totaal),'Totaal',''],[String(actief),'Actief','var(--success)'],[String(inactief),'Inactief','var(--warning)'],[String(kashouders),'Kashouder+','var(--gold)']].map(([v,l,c]) => (
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

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
          {gefilterd.map((lid, i) => (
            <div key={lid.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, opacity: lid.actief ? 1 : 0.5 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{emojis[i % emojis.length]}</div>
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', background: lid.actief ? 'var(--success)' : 'var(--muted)', border: '2px solid var(--navy)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{lid.naam}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lid.email} · sinds {formatLidSinds(lid.lidSinds)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {isBeheerder ? (
                  <select
                    value={lid.rol}
                    disabled={bezigId === lid.id}
                    onChange={(e) => handleRolChange(lid, e.target.value as Rol)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface2)',
                      color: lid.rol === 'beheerder' ? 'var(--gold)' : lid.rol === 'kashouder' ? 'var(--success)' : 'var(--accent)',
                      fontFamily: "'DM Sans',sans-serif",
                      opacity: bezigId === lid.id ? 0.5 : 1,
                    }}
                  >
                    <option value="lid">lid</option>
                    <option value="kashouder">kashouder</option>
                    <option value="beheerder">beheerder</option>
                  </select>
                ) : (
                  <span className={`badge ${rolColors[lid.rol]}`}>{lid.rol}</span>
                )}
                {!lid.actief && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>inactief</span>}
              </div>
            </div>
          ))}
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
