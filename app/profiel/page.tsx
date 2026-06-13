'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import TicketEditorModal from '@/components/TicketEditorModal';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { updateUserTickets, formatLidSinds } from '@/lib/firestore-users';
import { Ticket } from '@/lib/types';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel', active: true },
];

const rolBadge: Record<string, { label: string; variant: string }> = {
  lid: { label: '🎱 Lid', variant: 'badge-blue' },
  kashouder: { label: '⚡ Kashouder', variant: 'badge-green' },
  beheerder: { label: '👑 Beheerder', variant: 'badge-gold' },
};

function ProfielPageContent() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const openNieuwTicket = () => { setEditTicket(null); setModalOpen(true); };
  const openBewerkTicket = (t: Ticket) => { setEditTicket(t); setModalOpen(true); };

  const handleSaveTicket = async (ticket: Ticket) => {
    if (!user || !profile) return;
    const bestaande = profile.tickets ?? [];
    const idx = bestaande.findIndex(t => t.id === ticket.id);
    const nieuwe = idx >= 0
      ? bestaande.map(t => t.id === ticket.id ? ticket : t)
      : [...bestaande, ticket];
    await updateUserTickets(user.uid, nieuwe);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!user || !profile) return;
    const nieuwe = (profile.tickets ?? []).filter(t => t.id !== ticketId);
    await updateUserTickets(user.uid, nieuwe);
  };

  const badge = profile ? rolBadge[profile.rol] : rolBadge.lid;
  const tickets = profile?.tickets ?? [];

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Hero */}
        <div style={{ background: 'linear-gradient(180deg,#1a3a5c 0%,var(--navy) 100%)', padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 28px' }}>
          <Link href="/dashboard" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#4a9eff,#2070cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: '3px solid rgba(74,158,255,0.3)' }}>
                {profile?.foto ? <img src={profile.foto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, letterSpacing: -0.5, marginBottom: 4 }}>{profile?.naam || user?.displayName || user?.email?.split('@')[0] || '—'}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{profile?.email || user?.email} · sinds {formatLidSinds(profile?.lidSinds)}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`badge ${badge.variant}`}>{badge.label}</span>
                {!profile?.actief && <span className="badge badge-muted">Inactief</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gold)', letterSpacing: -0.5 }}>{profile?.ranglijstPunten ?? 0}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Ranglijst punten</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--white)', letterSpacing: -0.5 }}>{tickets.length}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Actieve tickets</div>
            </div>
          </div>
        </div>

        <div style={{ height: 20 }} />

        {/* Tickets */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Lotto tickets</div>
            <span onClick={openNieuwTicket} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, cursor: 'pointer' }}>+ Toevoegen</span>
          </div>

          {tickets.length === 0 && (
            <div className="card" style={{ padding: '24px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎱</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>Je hebt nog geen tickets toegevoegd</div>
              <button onClick={openNieuwTicket} className="btn-primary">+ Eerste ticket toevoegen</button>
            </div>
          )}

          {tickets.map((ticket, i) => (
            <div key={ticket.id} className="card" style={{ padding: '16px 18px', marginBottom: 10, cursor: 'pointer' }} onClick={() => openBewerkTicket(ticket)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>🎱 {ticket.naam}</span>
                <span style={{ fontSize: 16, color: 'var(--muted)' }}>›</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ticket.nummers.map(n => (
                  <div key={n} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, background: 'var(--navy-mid)', border: '1.5px solid var(--border)', color: 'var(--white)' }}>{n}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Uitloggen */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <button onClick={handleLogout} style={{ width: '100%', background: 'var(--error-soft)', border: '1px solid rgba(255,90,90,0.2)', color: 'var(--error)', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>
            🚪 Uitloggen
          </button>
        </div>
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

      <TicketEditorModal
        open={modalOpen}
        ticket={editTicket}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTicket}
        onDelete={editTicket ? handleDeleteTicket : undefined}
      />
    </>
  );
}

export default function ProfielPage() {
  return (
    <ProtectedRoute>
      <ProfielPageContent />
    </ProtectedRoute>
  );
}
