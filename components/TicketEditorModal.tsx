'use client';
import { useState, useEffect } from 'react';
import { Ticket } from '@/lib/types';
import { TICKET_CONFIG, valideerTicketNummers } from '@/lib/constants';

interface TicketEditorModalProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onSave: (ticket: Ticket) => Promise<void>;
  onDelete?: (ticketId: string) => Promise<void>;
}

export default function TicketEditorModal({ open, ticket, onClose, onSave, onDelete }: TicketEditorModalProps) {
  const [naam, setNaam] = useState('');
  const [nummers, setNummers] = useState<string[]>(Array(TICKET_CONFIG.aantalNummers).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    if (open) {
      if (ticket) {
        setNaam(ticket.naam);
        setNummers(ticket.nummers.map(String));
      } else {
        setNaam('');
        setNummers(Array(TICKET_CONFIG.aantalNummers).fill(''));
      }
      setError(null);
    }
  }, [open, ticket]);

  if (!open) return null;

  const handleSave = async () => {
    if (!naam.trim()) {
      setError('Vul een naam in voor dit ticket');
      return;
    }
    const parsed = nummers.map(n => parseInt(n, 10));
    if (parsed.some(isNaN)) {
      setError('Vul alle nummers in');
      return;
    }
    const validatieError = valideerTicketNummers(parsed);
    if (validatieError) {
      setError(validatieError);
      return;
    }
    setError(null);
    setBezig(true);
    try {
      await onSave({
        id: ticket?.id ?? `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        naam: naam.trim(),
        nummers: parsed,
      });
      onClose();
    } catch (e) {
      setError('Opslaan mislukt, probeer opnieuw');
    } finally {
      setBezig(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket || !onDelete) return;
    setBezig(true);
    try {
      await onDelete(ticket.id);
      onClose();
    } catch {
      setError('Verwijderen mislukt');
      setBezig(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Scrollbare container — voorkomt dat opslaan-knop achter toetsenbord verdwijnt */}
      <div
        style={{
          width: '100%',
          background: 'var(--navy-mid)',
          borderRadius: '24px 24px 0 0',
          borderTop: '1px solid var(--border)',
          height: '85dvh',
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ padding: '0 24px', paddingBottom: 'max(100px, calc(env(safe-area-inset-bottom, 24px) + 88px))' }}>
          <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '14px auto 20px' }} />
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 20 }}>
            {ticket ? '🎱 Ticket bewerken' : '🎱 Nieuw ticket'}
          </div>

          <label className="form-label">Naam van dit ticket</label>
          <input
            type="text"
            className="form-input"
            placeholder="Bijv. Mijn nummers"
            value={naam}
            onChange={e => setNaam(e.target.value)}
          />

          <label className="form-label">{TICKET_CONFIG.aantalNummers} nummers ({TICKET_CONFIG.min}-{TICKET_CONFIG.max})</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {nummers.map((val, i) => (
              <input
                key={i}
                type="number"
                inputMode="numeric"
                min={TICKET_CONFIG.min}
                max={TICKET_CONFIG.max}
                value={val}
                onChange={e => {
                  const next = [...nummers];
                  next[i] = e.target.value;
                  setNummers(next);
                }}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  textAlign: 'center', fontSize: 15, fontWeight: 600,
                  color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", outline: 'none',
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ color: 'var(--error)', fontSize: 13, fontWeight: 500, marginBottom: 12, marginTop: 4 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ height: 16 }} />

          <button
            onClick={handleSave}
            disabled={bezig}
            className="btn-primary"
            style={{ marginBottom: ticket && onDelete ? 10 : 0, opacity: bezig ? 0.6 : 1 }}
          >
            {bezig ? 'Even geduld…' : '✓ Opslaan'}
          </button>

          {ticket && onDelete && (
            <button
              onClick={handleDelete}
              disabled={bezig}
              style={{
                width: '100%', background: 'var(--error-soft)',
                border: '1px solid rgba(255,90,90,0.2)', color: 'var(--error)',
                borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 600,
                fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
                opacity: bezig ? 0.6 : 1,
              }}
            >
              🗑️ Ticket verwijderen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
