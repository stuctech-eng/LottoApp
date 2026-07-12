'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { subscribeKasmutaties, subscribeBetalingen, berekenKasSaldo, huidigTrekkingWeek } from '@/lib/firestore-payments';
import { subscribeSeizoen, subscribeAlleSeizoenen } from '@/lib/firestore-seizoenen';
import { User, Kasmutatie, Betaling, Seizoen } from '@/lib/types';

const NAV = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard', active: true },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function BeheerderPageContent() {
  const [leden, setLeden] = useState<User[]>([]);
  const [mutaties, setMutaties] = useState<Kasmutatie[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [actiefsSeizoen, setActiefSeizoen] = useState<Seizoen | null>(null);
  const [seizoenen, setSeizoenen] = useState<Seizoen[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let geladen = 0;
    const klaar = () => { geladen++; if (geladen >= 4) setLaden(false); };
    const u1 = subscribeAllUsers((l) => { setLeden(l); klaar(); });
    const u2 = subscribeKasmutaties((m) => { setMutaties(m); klaar(); });
    const u3 = subscribeBetalingen((b) => { setBetalingen(b); klaar(); });
    const u4 = subscribeSeizoen((s) => { setActiefSeizoen(s); klaar(); });
    const u5 = subscribeAlleSeizoenen(setSeizoenen);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const actieveLeden = leden.filter(l => l.actief).length;
  const saldo = berekenKasSaldo(mutaties);

  // KRITIEK: alleen betalingen van de HUIDIGE week meetellen, en
  // vergelijken tegen wie er daadwerkelijk een ticket heeft — niet
  // alleen kijken naar bestaande 'open'/'verificatie'-documenten. Een
  // lid zonder betaaldocument voor deze week (bijv. omdat het ticket
  // pas na het aanmaken van de weekbetalingen is toegevoegd) werd
  // anders helemaal niet gesignaleerd, terwijl diegene wél niet had
  // betaald.
  const huidigeWeek = huidigTrekkingWeek();
  const actieveLedenMetTicket = leden.filter(l => l.actief && (l.tickets?.length ?? 0) > 0);
  const betalingenDezeWeek = betalingen.filter(
    b => (b as Betaling & { trekkingWeek?: string }).trekkingWeek === huidigeWeek
  );
  const betaaldeUserIds = new Set(betalingenDezeWeek.filter(b => b.status === 'betaald').map(b => b.userId));
  const teVerifieren = betalingenDezeWeek.filter(b => b.status === 'verificatie');
  const verificatieUserIds = new Set(teVerifieren.map(b => b.userId));
  const openBetalingen = actieveLedenMetTicket.filter(
    l => !betaaldeUserIds.has(l.id) && !verificatieUserIds.has(l.id)
  );

  // Aantal rondes = aantal trekkingen in actief seizoen (via resultaten tellen)
  // Vereenvoudigd: toon seizoensnummer of actief seizoen naam
  const seizoenLabel = actiefsSeizoen?.naam ?? '—';
  const aantalSeizoenen = seizoenen.length;

  // Alerts
  const alerts: { icon: string; title: string; sub: string }[] = [];
  if (openBetalingen.length > 0) {
    const namen = [...new Set(openBetalingen.map(l => l.naam))].slice(0, 3).join(', ');
    alerts.push({ icon: '⚠️', title: `${openBetalingen.length} ${openBetalingen.length === 1 ? 'lid' : 'leden'} niet betaald`, sub: namen });
  }
  if (teVerifieren.length > 0) {
    const namen = [...new Set(teVerifieren.map(b => b.userNaam))].slice(0, 3).join(', ');
    alerts.push({ icon: '💬', title: `${teVerifieren.length} betaling${teVerifieren.length === 1 ? '' : 'en'} wacht${teVerifieren.length === 1 ? '' : 'en'} op verificatie`, sub: namen });
  }

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 2 }}>👑 Beheerder</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -1, marginBottom: 6 }}>Dashboard</div>
          <span className="badge badge-gold">⚙️ Systeembeheer</span>
        </div>

        {/* Systeem overzicht */}
        <div style={{ margin: '0 20px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg,#2a1c00,#0d1b2a)', border: '1px solid rgba(240,192,96,0.18)', borderRadius: 22, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s ease infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>Systeem operationeel</span>
            </div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, letterSpacing: -0.5, marginBottom: 16 }}>LottoClub {new Date().getFullYear()}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {laden ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ background: 'rgba(240,192,96,0.08)', border: '1px solid rgba(240,192,96,0.12)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>…</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>laden</div>
                  </div>
                ))
              ) : (
                [
                  [String(actieveLeden), 'Actieve leden'],
                  [actiefsSeizoen ? seizoenLabel : '—', 'Seizoen'],
                  [`€${saldo.toFixed(0)}`, 'Kassaldo'],
                ].map(([v, l]) => (
                  <div key={l} style={{ background: 'rgba(240,192,96,0.08)', border: '1px solid rgba(240,192,96,0.12)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{v}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Snelle acties */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Snelle acties</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🎱', label: 'Trekking invoeren', href: '/trekkingen', bg: 'var(--accent-soft)' },
              { icon: '👥', label: 'Leden beheren', href: '/leden', bg: 'var(--gold-soft)' },
              { icon: '💰', label: 'Kas', href: '/kas', bg: 'var(--success-soft)' },
              { icon: '💸', label: 'Financieel beheer', href: '/kashouder/financieel', bg: 'rgba(52,201,122,0.06)' },
              { icon: '💳', label: 'Mijn inleg betalen', href: '/betalen', bg: 'rgba(74,158,255,0.06)' },
              { icon: '⚙️', label: 'Instellingen', href: '/beheerder/admin', bg: 'var(--purple-soft)' },
            ].map(a => (
              <Link key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: a.bg, border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{a.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{a.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-title">Vereist aandacht</div>
          {!laden && alerts.length === 0 && (
            <div className="card" style={{ padding: '16px 18px', textAlign: 'center', color: 'var(--success)', fontSize: 13 }}>
              ✅ Alles in orde — geen openstaande acties
            </div>
          )}
          {alerts.map(a => (
            <div key={a.title} style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{a.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Seizoen */}
        <div style={{ padding: '0 20px', marginBottom: 8 }}>
          <div className="section-title">{actiefsSeizoen ? actiefsSeizoen.naam : 'Seizoen'}</div>
          {!actiefsSeizoen && !laden && (
            <div className="card" style={{ padding: '16px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Geen actief seizoen. Start een nieuw seizoen via <Link href="/beheerder/admin" style={{ color: 'var(--gold)' }}>Beheer → Seizoen</Link>.
            </div>
          )}
          {actiefsSeizoen && (
            <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 18, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{actiefsSeizoen.naam}</span>
                <span className="badge badge-green">● Actief</span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  [String(aantalSeizoenen), 'Seizoenen totaal'],
                  [String(actieveLeden), 'Leden'],
                  [`€${saldo.toFixed(0)}`, 'Kassaldo'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

export default function BeheerderPage() {
  return (
    <ProtectedRoute allowedRoles={['beheerder']}>
      <BeheerderPageContent />
    </ProtectedRoute>
  );
}
