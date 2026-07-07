'use client'; // weekfix W28 - 7 jul 2026
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  subscribeKasmutaties,
  subscribeBetalingen,
  huidigTrekkingWeek,
  berekenKasSaldo,
  bevestigBetaling,
  wijsBetalingAf,
  huidigTrekkingWeek,
} from '@/lib/firestore-payments';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { subscribeSeizoen } from '@/lib/firestore-seizoenen';
import { subscribePaymentConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/firestore-payment-config';
import { whatsappLink, buildWhatsappHerinnering } from '@/lib/providers/notifications';
import { STANDAARD_INLEG, STANDAARD_OMSCHRIJVING } from '@/lib/constants';
import { Betaling, Kasmutatie, User, Seizoen, PaymentConfig } from '@/lib/types';

const NAV = [
  { href: '/kashouder', icon: '🏠', label: 'Dashboard', active: true },
  { href: '/kas', icon: '📒', label: 'Kasboek' },
  { href: '/kashouder/financieel', icon: '💰', label: 'Financieel' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function KashouderPageContent() {
  const { user, profile } = useAuth();
  const [mutaties, setMutaties] = useState<Kasmutatie[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [leden, setLeden] = useState<User[]>([]);
  const [seizoen, setSeizoen] = useState<Seizoen | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let geladen = 0;
    const klaar = () => { geladen++; if (geladen >= 4) setLaden(false); };
    const u1 = subscribeKasmutaties((m) => { setMutaties(m); klaar(); });
    const u2 = subscribeBetalingen((b) => { setBetalingen(b); klaar(); });
    const u3 = subscribeAllUsers((l) => { setLeden(l); klaar(); });
    const u4 = subscribeSeizoen((s) => { setSeizoen(s); klaar(); });
    const u5 = subscribePaymentConfig(setPaymentConfig);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const actieUser = () => user && profile ? { uid: user.uid, naam: profile.naam } : null;

  const saldo = berekenKasSaldo(mutaties);
  const actieveLeden = leden.filter(l => l.actief);
  const tikkieLink = (paymentConfig as PaymentConfig & { tikkieLink?: string }).tikkieLink || undefined;

  // Filter op huidige week — alleen betalingen van deze week tellen mee
  const huidigeWeek = huidigTrekkingWeek();
  const betalingenDezeWeek = betalingen.filter(
    b => (b as Betaling & { trekkingWeek?: string }).trekkingWeek === huidigeWeek
  );

  const teVerifieren = betalingenDezeWeek.filter(b => b.status === 'verificatie');
  const openBetalingen = betalingenDezeWeek.filter(b => b.status === 'open');

  // Betaalvoortgang alleen op basis van huidige week
  const huidigeWeek = huidigTrekkingWeek();
const betalingenDezeWeek = betalingen.filter(
  b => (b as Betaling & { trekkingWeek?: string }).trekkingWeek === huidigeWeek
);
const betaaldeLeden = new Set(betalingenDezeWeek.filter(b => b.status === 'betaald').map(b => b.userId));
const teVerifieren = betalingenDezeWeek.filter(b => b.status === 'verificatie');
const openBetalingen = betalingenDezeWeek.filter(b => b.status === 'open');

  const aantalBetaald = actieveLeden.filter(l => betaaldeLeden.has(l.id)).length;
  const totaalLeden = actieveLeden.length;
  const percentage = totaalLeden > 0 ? Math.round((aantalBetaald / totaalLeden) * 100) : 0;
  const totaalVerwacht = totaalLeden * STANDAARD_INLEG;
  const totaalOntvangen = aantalBetaald * STANDAARD_INLEG;

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

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 2 }}>⚡ Kashouder</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -1, marginBottom: 6 }}>Dashboard</div>
          <span className="badge badge-green">💳 Kas beheer</span>
        </div>

        {/* Kas hero */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#0d2a1a,#0d1b2a)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 22, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 6 }}>💰 Kassaldo</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>
              {laden ? '…' : `€${saldo.toFixed(2)}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {seizoen ? seizoen.naam : 'Geen actief seizoen'} · {totaalLeden} leden · {huidigeWeek}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link href="/kashouder/financieel" style={{ background: 'rgba(52,201,122,0.1)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 13, padding: 12, textAlign: 'center', textDecoration: 'none' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>💸 Uitbetalen</div>
              </Link>
              <Link href="/kas" style={{ background: 'rgba(52,201,122,0.1)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 13, padding: 12, textAlign: 'center', textDecoration: 'none' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>📒 Kasboek</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Betaalvoortgang deze week */}
        {!laden && totaalLeden > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div className="section-title">Betaalvoortgang {huidigeWeek}</div>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{aantalBetaald} van {totaalLeden} leden betaald</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: percentage === 100 ? 'var(--success)' : 'var(--warning)' }}>{percentage}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--navy-mid)', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${percentage}%`, borderRadius: 10, background: percentage === 100 ? 'linear-gradient(90deg,var(--success),#20a050)' : 'linear-gradient(90deg,var(--warning),#c07000)', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                <span>€0</span>
                <span>€{totaalOntvangen.toFixed(0)} van €{totaalVerwacht.toFixed(0)}</span>
                <span>€{totaalVerwacht.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Te verifiëren betalingen */}
        {teVerifieren.length > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Betaalbewijzen</div>
              <span style={{ fontSize: 12, background: 'var(--warning-soft)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{teVerifieren.length} open</span>
            </div>
            {teVerifieren.map(b => (
              <div key={b.id} style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,170,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>💬</div>
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
        )}

        {/* Openstaande betalingen */}
        {openBetalingen.length > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div className="section-title">Openstaand</div>
            {openBetalingen.map(b => {
              const lid = leden.find(l => l.id === b.userId);
              return (
                <div key={b.id} style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,170,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{b.userNaam}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>€{b.bedrag.toFixed(2)} · {b.omschrijving}</div>
                  </div>
                  {lid?.telefoon && (
                    <a
                      href={whatsappLink(lid.telefoon, buildWhatsappHerinnering(lid.naam, STANDAARD_INLEG, STANDAARD_OMSCHRIJVING, tikkieLink))}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                    >
                      💬 Herinner
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Alles in orde */}
        {!laden && teVerifieren.length === 0 && openBetalingen.length === 0 && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div className="card" style={{ padding: '16px 18px', textAlign: 'center', color: 'var(--success)', fontSize: 13 }}>
              ✅ Alles in orde — geen openstaande acties deze week
            </div>
          </div>
        )}
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

export default function KashouderPage() {
  return (
    <ProtectedRoute allowedRoles={['kashouder', 'beheerder']}>
      <KashouderPageContent />
    </ProtectedRoute>
  );
}
