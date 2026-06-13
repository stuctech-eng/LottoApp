'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  subscribeKasmutaties,
  subscribeBetalingen,
  berekenKasSaldo,
  bevestigBetaling,
  wijsBetalingAf,
  registreerUitbetaling,
  registreerCorrectie,
} from '@/lib/firestore-payments';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { whatsappLink, buildWhatsappHerinnering } from '@/lib/providers/notifications';
import { STANDAARD_INLEG, STANDAARD_OMSCHRIJVING } from '@/lib/constants';
import { Betaling, Kasmutatie, User } from '@/lib/types';

const NAV = [
  { href: '/kashouder', icon: '🏠', label: 'Dashboard' },
  { href: '/kas', icon: '📒', label: 'Kasboek' },
  { href: '/kashouder/financieel', icon: '💰', label: 'Financieel', active: true },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function FinancieelPageContent() {
  const { user, profile } = useAuth();
  const [mutaties, setMutaties] = useState<Kasmutatie[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [leden, setLeden] = useState<User[]>([]);

  // Uitbetaling form
  const [uitbBedrag, setUitbBedrag] = useState('');
  const [uitbOmschrijving, setUitbOmschrijving] = useState('');
  const [uitbBezig, setUitbBezig] = useState(false);
  const [uitbOk, setUitbOk] = useState(false);

  // Correctie form
  const [corType, setCorType] = useState<'plus' | 'min'>('plus');
  const [corBedrag, setCorBedrag] = useState('');
  const [corOmschrijving, setCorOmschrijving] = useState('');
  const [corBezig, setCorBezig] = useState(false);
  const [corOk, setCorOk] = useState(false);

  useEffect(() => {
    const u1 = subscribeKasmutaties(setMutaties);
    const u2 = subscribeBetalingen(setBetalingen);
    const u3 = subscribeAllUsers(setLeden);
    return () => { u1(); u2(); u3(); };
  }, []);

  const saldo = berekenKasSaldo(mutaties);
  const nu = new Date();
  const ontvangenDezeMaand = mutaties
    .filter(m => m.type === 'inleg' && m.datum && m.datum.toDate().getMonth() === nu.getMonth() && m.datum.toDate().getFullYear() === nu.getFullYear())
    .reduce((s, m) => s + m.bedrag, 0);
  const uitbetaaldDezeMaand = mutaties
    .filter(m => m.type === 'uitbetaling' && m.datum && m.datum.toDate().getMonth() === nu.getMonth() && m.datum.toDate().getFullYear() === nu.getFullYear())
    .reduce((s, m) => s + m.bedrag, 0);

  const teVerifieren = betalingen.filter(b => b.status === 'verificatie');
  const ledenZonderTelefoon = leden.filter(l => l.actief && !l.telefoon);
  const ledenMetTelefoon = leden.filter(l => l.actief && l.telefoon);

  const actieUser = () => user && profile ? { uid: user.uid, naam: profile.naam } : null;

  const handleBevestig = async (b: Betaling) => {
    const au = actieUser();
    if (!au) return;
    await bevestigBetaling(b, au);
  };

  const handleAfwijzen = async (b: Betaling) => {
    const au = actieUser();
    if (!au) return;
    await wijsBetalingAf(b, au);
  };

  const handleUitbetaling = async () => {
    const au = actieUser();
    const bedrag = parseFloat(uitbBedrag.replace(',', '.'));
    if (!au || isNaN(bedrag) || bedrag <= 0 || !uitbOmschrijving.trim()) return;
    setUitbBezig(true);
    try {
      await registreerUitbetaling({ bedrag, omschrijving: uitbOmschrijving.trim() }, au);
      setUitbBedrag('');
      setUitbOmschrijving('');
      setUitbOk(true);
      setTimeout(() => setUitbOk(false), 2000);
    } finally {
      setUitbBezig(false);
    }
  };

  const handleCorrectie = async () => {
    const au = actieUser();
    const bedragAbs = parseFloat(corBedrag.replace(',', '.'));
    if (!au || isNaN(bedragAbs) || bedragAbs <= 0 || !corOmschrijving.trim()) return;
    const bedrag = corType === 'plus' ? bedragAbs : -bedragAbs;
    setCorBezig(true);
    try {
      await registreerCorrectie({ bedrag, omschrijving: corOmschrijving.trim() }, au);
      setCorBedrag('');
      setCorOmschrijving('');
      setCorOk(true);
      setTimeout(() => setCorOk(false), 2000);
    } finally {
      setCorBezig(false);
    }
  };

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 2 }}>⚡ Kashouder</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Financieel</div>
          </div>
          <Link href="/kashouder" style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
        </div>

        {/* Overzicht */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Overzicht deze maand</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Kassaldo', value: `€${saldo.toFixed(2)}`, color: 'var(--gold)', sub: 'som van kasmutaties' },
              { label: 'Ontvangen', value: `+€${ontvangenDezeMaand.toFixed(2)}`, color: 'var(--success)', sub: 'deze maand' },
              { label: 'Uitbetaald', value: `−€${Math.abs(uitbetaaldDezeMaand).toFixed(2)}`, color: 'var(--error)', sub: 'deze maand' },
              { label: 'Te verifiëren', value: String(teVerifieren.length), color: teVerifieren.length > 0 ? 'var(--warning)' : 'var(--white)', sub: 'betalingen' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.8, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Te verifiëren betalingen */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Te verifiëren betalingen</div>
            {teVerifieren.length > 0 && <span style={{ fontSize: 12, background: 'var(--warning-soft)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{teVerifieren.length}</span>}
          </div>
          {teVerifieren.length === 0 && (
            <div className="card" style={{ padding: '20px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Geen openstaande meldingen
            </div>
          )}
          {teVerifieren.map(b => (
            <div key={b.id} style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,170,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💬</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.userNaam}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>€{b.bedrag.toFixed(2)} · {b.omschrijving}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleBevestig(b)} style={{ background: 'var(--success)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>✓</button>
                <button onClick={() => handleAfwijzen(b)} style={{ background: 'var(--error-soft)', color: 'var(--error)', border: '1px solid rgba(255,90,90,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp herinneringen */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Betaalherinnering versturen (WhatsApp)</div>
          {ledenMetTelefoon.length === 0 && (
            <div className="card" style={{ padding: '20px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nog geen leden met telefoonnummer. Leden kunnen dit toevoegen via hun profiel.
            </div>
          )}
          {ledenMetTelefoon.map(lid => (
            <div key={lid.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{lid.naam}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lid.telefoon}</div>
              </div>
              <a
                href={whatsappLink(lid.telefoon!, buildWhatsappHerinnering(lid.naam, STANDAARD_INLEG, STANDAARD_OMSCHRIJVING))}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
              >
                💬 Stuur
              </a>
            </div>
          ))}
          {ledenZonderTelefoon.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {ledenZonderTelefoon.length} lid/leden zonder telefoonnummer: {ledenZonderTelefoon.map(l => l.naam).join(', ')}
            </div>
          )}
        </div>

        {/* Uitbetaling */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Uitbetaling registreren</div>
          <div className="card" style={{ padding: 18 }}>
            <label className="form-label">Bedrag</label>
            <input type="text" inputMode="decimal" placeholder="€25,00" className="form-input" value={uitbBedrag} onChange={e => setUitbBedrag(e.target.value)} />
            <label className="form-label">Omschrijving</label>
            <input type="text" placeholder="Bijv. Prijs winnaar ronde 22" className="form-input" value={uitbOmschrijving} onChange={e => setUitbOmschrijving(e.target.value)} />
            <button onClick={handleUitbetaling} disabled={uitbBezig} style={{ width: '100%', background: uitbOk ? 'linear-gradient(135deg,var(--success),#1a8a50)' : 'linear-gradient(135deg,var(--success),#1a8a50)', color: 'white', border: 'none', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: uitbBezig ? 0.6 : 1 }}>
              {uitbOk ? '✓ Geregistreerd' : uitbBezig ? 'Bezig…' : '💸 Uitbetaling registreren'}
            </button>
          </div>
        </div>

        {/* Correctie */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div className="section-title">Kascorrectie</div>
          <div className="card" style={{ padding: 18 }}>
            <label className="form-label">Type correctie</label>
            <select className="form-input" value={corType} onChange={e => setCorType(e.target.value as 'plus' | 'min')}>
              <option value="plus">+ Toevoeging</option>
              <option value="min">− Aftrek</option>
            </select>
            <label className="form-label">Bedrag</label>
            <input type="text" inputMode="decimal" placeholder="€0,00" className="form-input" value={corBedrag} onChange={e => setCorBedrag(e.target.value)} />
            <label className="form-label">Reden</label>
            <input type="text" placeholder="Omschrijving correctie…" className="form-input" value={corOmschrijving} onChange={e => setCorOmschrijving(e.target.value)} />
            <button onClick={handleCorrectie} disabled={corBezig} style={{ width: '100%', background: 'linear-gradient(135deg,var(--warning),#c07000)', color: 'var(--navy)', border: 'none', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: corBezig ? 0.6 : 1 }}>
              {corOk ? '✓ Verwerkt' : corBezig ? 'Bezig…' : '⚖️ Correctie doorvoeren'}
            </button>
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

export default function FinancieelPage() {
  return (
    <ProtectedRoute allowedRoles={['kashouder', 'beheerder']}>
      <FinancieelPageContent />
    </ProtectedRoute>
  );
}
