'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { subscribeAlleTrekkingen, subscribeResultaten } from '@/lib/firestore-trekkingen';
import { subscribeBetalingen, relevanteTrekkingWeek } from '@/lib/firestore-payments';
import { User, Trekking, Resultaat, Betaling } from '@/lib/types';

function DeelnemersContent() {
  const { user, profile } = useAuth();
  const [leden, setLeden] = useState<User[]>([]);
  const [trekkingen, setTrekkingen] = useState<Trekking[]>([]);
  const [resultatenLaatsteTrekking, setResultatenLaatsteTrekking] = useState<Resultaat[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let geladen = 0;
    const klaar = () => { geladen++; if (geladen >= 3) setLaden(false); };
    const u1 = subscribeAllUsers((l) => { setLeden(l); klaar(); });
    const u2 = subscribeAlleTrekkingen((t) => { setTrekkingen(t); klaar(); });
    const u3 = subscribeBetalingen((b) => { setBetalingen(b); klaar(); });
    return () => { u1(); u2(); u3(); };
  }, []);

  const laatsteTrekking = trekkingen[0] ?? null;

  useEffect(() => {
    if (!laatsteTrekking) { setResultatenLaatsteTrekking([]); return; }
    const unsub = subscribeResultaten(laatsteTrekking.id, setResultatenLaatsteTrekking);
    return unsub;
  }, [laatsteTrekking?.id]);

  const actieveLeden = leden.filter(l => l.actief);

  // Betaalstatus deze week — zelfde patroon als dashboard/kashouder.
  const huidigeWeek = relevanteTrekkingWeek(betalingen);
  const betalingenDezeWeek = betalingen.filter(b => b.trekkingWeek === huidigeWeek);
  const betaaldeLeden = new Set(betalingenDezeWeek.filter(b => b.status === 'betaald').map(b => b.userId));

  // Per lid: hun resultaat van de laatste trekking (aantalGoed,
  // matchedNumbers) — zelfde bron als dashboard gebruikt voor
  // mijnResultaatLaatste/winnaarResultaat. Geen resultaat (nog geen
  // ticket, nog niet meegedaan, of nog in de wachtrij) → 0/6, leeg.
  const resultaatPerLid = new Map(resultatenLaatsteTrekking.map(r => [r.userId, r]));

  const ledenMetData = actieveLeden.map(lid => {
    const resultaat = resultaatPerLid.get(lid.id);
    const ticket = lid.tickets?.[0] ?? null;
    return {
      lid,
      ticket,
      aantalGoed: resultaat?.aantalGoed ?? 0,
      matchedNumbers: resultaat?.matchedNumbers ?? [],
      betaald: betaaldeLeden.has(lid.id),
    };
  });

  // Gesorteerd op aantal goed — wie het dichtst bij winnen zit staat
  // bovenaan, een echt live scorebord i.p.v. willekeurige lijstvolgorde.
  ledenMetData.sort((a, b) => b.aantalGoed - a.aantalGoed);

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <Link href="/dashboard" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>👥 Deelnemers</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>
            {laden ? '…' : `${actieveLeden.length} leden`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Gesorteerd op aantal goed — deze speelreeks</div>
        </div>

        {/* Tabbalk — "Administratief" alleen zichtbaar voor de
            beheerder, brengt naar de ledenbeheer-pagina. Voor leden
            en kashouder verschijnt deze rij niet — geen lege ruimte. */}
        {profile?.rol === 'beheerder' && (
          <>
            <div style={{ padding: '14px 20px 4px', display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700 }}>Deelnemers</div>
              <Link href="/leden" style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>👑 Administratief</Link>
            </div>
            <div style={{ padding: '2px 20px 6px', fontSize: 11, color: 'var(--muted)' }}>Alleen zichtbaar voor de beheerder</div>
          </>
        )}

        <div style={{ padding: '0 20px', paddingBottom: 32 }}>
          {laden && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!laden && actieveLeden.length === 0 && (
            <div className="card" style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nog geen deelnemers.
            </div>
          )}

          {ledenMetData.map(({ lid, ticket, aantalGoed, matchedNumbers, betaald }) => {
            const isJij = lid.id === user?.uid;
            return (
              <Link
                key={lid.id}
                href={`/deelnemers/${lid.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
                  background: 'var(--surface)',
                  border: `1px solid ${isJij ? 'rgba(74,158,255,0.4)' : 'var(--border)'}`,
                  borderRadius: 16, padding: '13px 16px', marginBottom: 9,
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--white)', border: `2px solid ${betaald ? 'var(--success)' : 'var(--warning)'}`, flexShrink: 0, overflow: 'hidden' }}>
                  {lid.foto ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : lid.naam.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lid.naam}</span>
                    {isJij && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>JIJ</span>}
                  </div>
                  {ticket ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {ticket.nummers.map(n => {
                        const isHit = matchedNumbers.includes(n);
                        return <div key={n} className={`bal ${isHit ? 'bal-hit' : 'bal-normal'}`} style={{ width: 22, height: 22, fontSize: 9.5 }}>{n}</div>;
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Geen ticket ingesteld</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {ticket && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: aantalGoed > 0 ? 'var(--gold)' : 'var(--muted)', marginBottom: 4 }}>{aantalGoed}/6</div>
                  )}
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: betaald ? 'var(--success)' : 'var(--warning)', background: betaald ? 'var(--success-soft)' : 'var(--warning-soft)', borderRadius: 8, padding: '2px 7px' }}>
                    {betaald ? '✓ Betaald' : '⏳ Nog niet'}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function DeelnemersPage() {
  return (
    <ProtectedRoute>
      <DeelnemersContent />
    </ProtectedRoute>
  );
}
