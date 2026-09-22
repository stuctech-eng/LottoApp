'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { subscribeAllUsers, formatLidSinds } from '@/lib/firestore-users';
import { subscribeAlleTrekkingen, subscribeResultaten, subscribeUserResultaten } from '@/lib/firestore-trekkingen';
import { subscribeBetalingen, relevanteTrekkingWeek } from '@/lib/firestore-payments';
import { whatsappLink } from '@/lib/providers/notifications';
import { User, Trekking, Resultaat, Betaling } from '@/lib/types';

const rolLabel: Record<string, string> = {
  lid: '🎱 Lid',
  kashouder: '⚡ Kashouder',
  beheerder: '👑 Beheerder',
};

function formatKort(ts: Trekking['datum']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function DeelnemerDetailContent() {
  const params = useParams();
  const id = params?.id as string;

  const [leden, setLeden] = useState<User[]>([]);
  const [trekkingen, setTrekkingen] = useState<Trekking[]>([]);
  const [resultatenLaatsteTrekking, setResultatenLaatsteTrekking] = useState<Resultaat[]>([]);
  const [ditLidResultaten, setDitLidResultaten] = useState<Resultaat[]>([]);
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

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeUserResultaten(id, setDitLidResultaten);
    return unsub;
  }, [id]);

  const laatsteTrekking = trekkingen[0] ?? null;

  useEffect(() => {
    if (!laatsteTrekking) { setResultatenLaatsteTrekking([]); return; }
    const unsub = subscribeResultaten(laatsteTrekking.id, setResultatenLaatsteTrekking);
    return unsub;
  }, [laatsteTrekking?.id]);

  const lid = leden.find(l => l.id === id) ?? null;
  const actieveLeden = leden.filter(l => l.actief);

  // Rangorde — zelfde sortering (op aantal goed, laatste trekking) als
  // de deelnemerslijst, zodat de nummers overal kloppen met elkaar.
  const resultaatPerLid = new Map(resultatenLaatsteTrekking.map(r => [r.userId, r]));
  const gesorteerdeLeden = [...actieveLeden].sort((a, b) => {
    const aGoed = resultaatPerLid.get(a.id)?.aantalGoed ?? 0;
    const bGoed = resultaatPerLid.get(b.id)?.aantalGoed ?? 0;
    return bGoed - aGoed;
  });
  const rangorde = gesorteerdeLeden.findIndex(l => l.id === id) + 1;

  // Betaalstatus deze week — club-brede week-bepaling (architectuurregel
  // 12), gefilterd op dit ene lid.
  const huidigeWeek = relevanteTrekkingWeek(betalingen);
  const mijnBetalingDezeWeek = betalingen.find(b => b.userId === id && b.trekkingWeek === huidigeWeek);
  const betaald = mijnBetalingDezeWeek?.status === 'betaald';

  // Trekking-datum opzoeken per resultaat, voor sortering en weergave.
  const trekkingMap = new Map(trekkingen.map(t => [t.id, t]));
  const resultatenMetDatum = ditLidResultaten
    .map(r => ({ resultaat: r, trekking: trekkingMap.get(r.trekkingId) ?? null }))
    .filter(x => x.trekking !== null) as { resultaat: Resultaat; trekking: Trekking }[];
  resultatenMetDatum.sort((a, b) => {
    const da = a.trekking.datum?.toMillis?.() ?? 0;
    const db_ = b.trekking.datum?.toMillis?.() ?? 0;
    return db_ - da;
  });

  const gewonnenResultaten = resultatenMetDatum.filter(x => x.resultaat.isWinnaar);
  const gewonnenCount = gewonnenResultaten.length;
  const totaalWinst = gewonnenResultaten.reduce((som, x) => som + (x.resultaat.prijsBedrag ?? 0), 0);
  const laatsteWin = gewonnenResultaten[0] ?? null; // al gesorteerd nieuwste eerst

  const ticket = lid?.tickets?.[0] ?? null;
  const mijnResultaatLaatste = resultaatPerLid.get(id);
  const matchedNumbers = mijnResultaatLaatste?.matchedNumbers ?? [];
  const aantalGoed = mijnResultaatLaatste?.aantalGoed ?? 0;

  const recenteResultaten = resultatenMetDatum.slice(0, 5);

  if (laden) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!lid) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: 'var(--muted)' }}>Dit lid bestaat niet (meer).</div>
        <Link href="/deelnemers" style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Terug naar Deelnemers</Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Header */}
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/deelnemers" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)', flexShrink: 0 }}>←</Link>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Lid details</div>
          <div style={{ width: 36, flexShrink: 0 }} />
        </div>

        <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Naam + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a2f45', border: `2px solid ${betaald ? 'var(--success)' : 'var(--warning)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
              {lid.foto ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : lid.naam.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 6 }}>{lid.naam}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: betaald ? 'var(--success)' : 'var(--warning)', background: betaald ? 'var(--success-soft)' : 'var(--warning-soft)', borderRadius: 20, padding: '4px 10px' }}>
                {betaald ? `✓ Betaald — doet mee` : `⏳ Nog niet betaald deze week`}
              </div>
            </div>
          </div>

          {/* Stat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
            <div className="card" style={{ padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, marginBottom: 6 }}>🏆</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17 }}>{gewonnenCount === 0 ? 'Nog niet' : `${gewonnenCount} keer`}</div>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 3 }}>Gewonnen</div>
            </div>
            <div className="card" style={{ padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, marginBottom: 6 }}>💰</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, color: 'var(--gold)' }}>€{totaalWinst.toFixed(0)}</div>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 3 }}>Totaal winst</div>
            </div>
            <div className="card" style={{ padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, marginBottom: 6 }}>📅</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: laatsteWin ? 13 : 15 }}>{laatsteWin ? formatKort(laatsteWin.trekking.datum) : 'Nog niet'}</div>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 3 }}>Laatst gewonnen</div>
            </div>
          </div>

          {/* Kerngegevens */}
          <div>
            <div className="section-title">Kerngegevens</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Rol</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{rolLabel[lid.rol] ?? lid.rol}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Lid sinds</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatLidSinds(lid.lidSinds)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Rangorde</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ticket ? `#${rangorde} van de ${actieveLeden.length}` : '—'}</div>
              </div>
            </div>
          </div>

          {/* Ticket */}
          <div>
            <div className="section-title">{ticket ? `Ticket — ${aantalGoed}/6 goed deze speelreeks` : 'Ticket'}</div>
            {ticket ? (
              <div style={{ display: 'flex', gap: 8 }}>
                {ticket.nummers.map(n => {
                  const isHit = matchedNumbers.includes(n);
                  return <div key={n} className={`bal ${isHit ? 'bal-hit' : 'bal-normal'}`} style={{ width: 42, height: 42, fontSize: 14 }}>{n}</div>;
                })}
              </div>
            ) : (
              <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted)' }}>Nog geen ticket ingesteld.</div>
            )}
          </div>

          {/* Recente resultaten */}
          <div>
            <div className="section-title">Recente resultaten</div>
            {recenteResultaten.length === 0 ? (
              <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted)' }}>Nog geen trekkingen meegemaakt.</div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {recenteResultaten.map(({ resultaat, trekking }, i) => (
                  <div key={resultaat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < recenteResultaten.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: resultaat.isWinnaar ? 'var(--gold-soft)' : resultaat.nummersGoed.length > 0 ? 'var(--success-soft)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                      {resultaat.isWinnaar ? '🏆' : resultaat.nummersGoed.length > 0 ? '🎯' : '🎱'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{formatKort(trekking.datum)}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: resultaat.isWinnaar ? 'var(--gold)' : resultaat.nummersGoed.length > 0 ? 'var(--success)' : 'var(--white)' }}>
                        {resultaat.isWinnaar
                          ? 'Gewonnen! 🎉'
                          : resultaat.nummersGoed.length > 0
                            ? `${resultaat.nummersGoed.length} nieuw goed (${resultaat.nummersGoed.join(', ')})`
                            : 'Geen nieuwe match'}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                      {resultaat.isWinnaar && resultaat.prijsBedrag != null ? `€${resultaat.prijsBedrag.toFixed(0)}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bericht sturen */}
          {lid.telefoon ? (
            <a
              href={whatsappLink(lid.telefoon, `Hoi ${lid.naam.split(' ')[0]}!`)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: 'var(--accent)', color: 'white', borderRadius: 14, padding: 15, textAlign: 'center', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              💬 Bericht sturen
            </a>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 14, padding: 15, textAlign: 'center', fontSize: 13 }}>
              Geen telefoonnummer bekend
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function DeelnemerDetailPage() {
  return (
    <ProtectedRoute>
      <DeelnemerDetailContent />
    </ProtectedRoute>
  );
}
