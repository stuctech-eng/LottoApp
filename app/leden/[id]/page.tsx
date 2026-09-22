'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  subscribeAllUsers,
  formatLidSinds,
  updateUserRol,
  verwijderLid,
  heractiveerLid,
  verwijderLidDefinitief,
} from '@/lib/firestore-users';
import { subscribeAlleTrekkingen, subscribeResultaten, subscribeUserResultaten } from '@/lib/firestore-trekkingen';
import { subscribeUserBetalingen, corrigeerLottoSaldo } from '@/lib/firestore-payments';
import { logAudit } from '@/lib/firestore-audit';
import { whatsappLink } from '@/lib/providers/notifications';
import { User, Trekking, Resultaat, Betaling, Rol } from '@/lib/types';

const rolLabel: Record<string, string> = { lid: 'Lid', kashouder: 'Kashouder', beheerder: 'Beheerder' };

function formatKort(ts: Trekking['datum']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

type Tab = 'overzicht' | 'ticket' | 'betalingen' | 'acties';

function LidDetailContent() {
  const params = useParams();
  const id = params?.id as string;
  const { user, profile } = useAuth();
  const isBeheerder = profile?.rol === 'beheerder';

  const [tab, setTab] = useState<Tab>('overzicht');
  const [leden, setLeden] = useState<User[]>([]);
  const [trekkingen, setTrekkingen] = useState<Trekking[]>([]);
  const [resultatenLaatsteTrekking, setResultatenLaatsteTrekking] = useState<Resultaat[]>([]);
  const [ditLidResultaten, setDitLidResultaten] = useState<Resultaat[]>([]);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let geladen = 0;
    const klaar = () => { geladen++; if (geladen >= 2) setLaden(false); };
    const u1 = subscribeAllUsers((l) => { setLeden(l); klaar(); });
    const u2 = subscribeAlleTrekkingen((t) => { setTrekkingen(t); klaar(); });
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    if (!id) return;
    const u1 = subscribeUserResultaten(id, setDitLidResultaten);
    const u2 = subscribeUserBetalingen(id, setBetalingen);
    return () => { u1(); u2(); };
  }, [id]);

  const laatsteTrekking = trekkingen[0] ?? null;

  useEffect(() => {
    if (!laatsteTrekking) { setResultatenLaatsteTrekking([]); return; }
    const unsub = subscribeResultaten(laatsteTrekking.id, setResultatenLaatsteTrekking);
    return unsub;
  }, [laatsteTrekking?.id]);

  const lid = leden.find(l => l.id === id) ?? null;
  const actieveLeden = leden.filter(l => l.actief);
  const aantalBeheerders = leden.filter(l => l.rol === 'beheerder').length;

  const resultaatPerLid = new Map(resultatenLaatsteTrekking.map(r => [r.userId, r]));
  const gesorteerdeLeden = [...actieveLeden].sort((a, b) => {
    const aGoed = resultaatPerLid.get(a.id)?.aantalGoed ?? 0;
    const bGoed = resultaatPerLid.get(b.id)?.aantalGoed ?? 0;
    return bGoed - aGoed;
  });
  const rangorde = gesorteerdeLeden.findIndex(l => l.id === id) + 1;

  const trekkingMap = new Map(trekkingen.map(t => [t.id, t]));
  const resultatenMetDatum = ditLidResultaten
    .map(r => ({ resultaat: r, trekking: trekkingMap.get(r.trekkingId) ?? null }))
    .filter(x => x.trekking !== null) as { resultaat: Resultaat; trekking: Trekking }[];
  resultatenMetDatum.sort((a, b) => (b.trekking.datum?.toMillis?.() ?? 0) - (a.trekking.datum?.toMillis?.() ?? 0));

  const gewonnenResultaten = resultatenMetDatum.filter(x => x.resultaat.isWinnaar);
  const totaalWinst = gewonnenResultaten.reduce((som, x) => som + (x.resultaat.prijsBedrag ?? 0), 0);
  const laatsteWin = gewonnenResultaten[0] ?? null;

  const ticket = lid?.tickets?.[0] ?? null;
  const mijnResultaatLaatste = resultaatPerLid.get(id);
  const matchedNumbers = mijnResultaatLaatste?.matchedNumbers ?? [];
  const aantalGoed = mijnResultaatLaatste?.aantalGoed ?? 0;

  // ─────────────────────── Acties ───────────────────────

  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  const handleRolChange = async (nieuweRol: Rol) => {
    if (!user || !profile || !lid || nieuweRol === lid.rol) return;
    if (lid.rol === 'beheerder' && nieuweRol !== 'beheerder' && aantalBeheerders <= 1) {
      setFoutmelding(`${lid.naam} is de laatste beheerder — wijs eerst iemand anders aan als beheerder.`);
      setTimeout(() => setFoutmelding(null), 5000);
      return;
    }
    setBezig(true);
    try {
      await updateUserRol(lid.id, nieuweRol);
      await logAudit('rol_gewijzigd', `${profile.naam} wijzigde rol van ${lid.naam}: ${lid.rol} → ${nieuweRol}`, { uid: user.uid, naam: profile.naam }, { doelUserId: lid.id });
    } finally {
      setBezig(false);
    }
  };

  const handleVerwijderen = async () => {
    if (!user || !profile || !lid) return;
    const bevestigd = window.confirm(`${lid.naam} verwijderen uit de club? Het account en alle historische data blijven bewaard — je kunt dit altijd ongedaan maken via 'Heractiveren'.`);
    if (!bevestigd) return;
    setBezig(true);
    try {
      await verwijderLid({ id: lid.id, naam: lid.naam }, { uid: user.uid, naam: profile.naam });
    } finally {
      setBezig(false);
    }
  };

  const handleHeractiveren = async () => {
    if (!user || !profile || !lid) return;
    setBezig(true);
    try {
      await heractiveerLid({ id: lid.id, naam: lid.naam }, { uid: user.uid, naam: profile.naam });
    } finally {
      setBezig(false);
    }
  };

  const handleDefinitiefVerwijderen = async () => {
    if (!user || !profile || !lid) return;
    const bevestigd = window.confirm(`${lid.naam} DEFINITIEF verwijderen? Dit kan niet ongedaan worden gemaakt. Gebruik dit alleen voor test-accounts, nooit voor een lid dat echt heeft meegespeeld.`);
    if (!bevestigd) return;
    setBezig(true);
    try {
      await verwijderLidDefinitief({ id: lid.id, naam: lid.naam }, { uid: user.uid, naam: profile.naam });
    } finally {
      setBezig(false);
    }
  };

  // Saldo corrigeren — nieuw, hoort hier logisch bij de rest van de
  // acties voor dit ene lid, i.p.v. los op de Financieel-pagina.
  const [saldoInvoer, setSaldoInvoer] = useState('');
  const [saldoReden, setSaldoReden] = useState('');
  const [saldoBezig, setSaldoBezig] = useState(false);
  const [saldoOk, setSaldoOk] = useState(false);
  const [saldoFout, setSaldoFout] = useState<string | null>(null);

  const handleSaldoCorrigeren = async () => {
    if (!user || !profile || !lid) return;
    const bedrag = parseFloat(saldoInvoer.replace(',', '.'));
    if (isNaN(bedrag) || bedrag < 0) {
      setSaldoFout('Vul een geldig bedrag in (0 of hoger).');
      return;
    }
    if (!saldoReden.trim()) {
      setSaldoFout('Vul een reden in voor deze correctie.');
      return;
    }
    setSaldoFout(null);
    setSaldoBezig(true);
    setSaldoOk(false);
    try {
      await corrigeerLottoSaldo({ id: lid.id, naam: lid.naam }, bedrag, saldoReden.trim(), { uid: user.uid, naam: profile.naam });
      setSaldoOk(true);
      setSaldoInvoer('');
      setSaldoReden('');
      setTimeout(() => setSaldoOk(false), 4000);
    } catch (e) {
      setSaldoFout(e instanceof Error ? e.message : 'Corrigeren is mislukt.');
    } finally {
      setSaldoBezig(false);
    }
  };

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
        <Link href="/leden" style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Terug naar Leden</Link>
      </div>
    );
  }

  const wacht = lid.wachtOpNieuweSpeelreeks === true;

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/leden" style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)', flexShrink: 0 }}>←</Link>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Lid detail — beheerder</div>
          <div style={{ width: 36, flexShrink: 0 }} />
        </div>

        <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Naam + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a2f45', border: `2px solid ${wacht ? 'var(--warning)' : lid.actief ? 'var(--success)' : 'var(--muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
              {lid.foto ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : lid.naam.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 6 }}>{lid.naam}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>{rolLabel[lid.rol] ?? lid.rol}</span>
                {!lid.actief && <span className="badge" style={{ color: 'var(--muted)', background: 'rgba(255,255,255,0.06)' }}>Inactief</span>}
                {wacht && <span className="badge" style={{ color: 'var(--warning)', background: 'var(--warning-soft)' }}>⏳ Wacht op nieuwe speelreeks</span>}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: 4 }}>
            {([['overzicht', 'Overzicht'], ['ticket', 'Ticket'], ['betalingen', 'Betalingen'], ['acties', 'Acties']] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{ flex: 1, textAlign: 'center', padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: tab === key ? 'var(--accent)' : 'transparent', color: tab === key ? 'white' : 'var(--muted)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Overzicht */}
          {tab === 'overzicht' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                <div className="card" style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 17, marginBottom: 6 }}>🏆</div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17 }}>{gewonnenResultaten.length === 0 ? 'Nog niet' : `${gewonnenResultaten.length} keer`}</div>
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

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>✉️ E-mail</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{lid.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>📱 Telefoon</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: lid.telefoon ? 'var(--white)' : 'var(--warning)' }}>{lid.telefoon || '⚠️ ontbreekt'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>🕓 Lid sinds</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{formatLidSinds(lid.lidSinds)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>💰 LottoSaldo</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gold)' }}>€{(lid.lottoSaldo ?? 0).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Rangorde</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{ticket ? `#${rangorde} van de ${actieveLeden.length}` : '—'}</div>
                </div>
              </div>

              {wacht && (
                <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.25)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--warning)', lineHeight: 1.6 }}>
                  ⏳ Wacht nog op de eerstvolgende winnaar — trad toe terwijl de vorige speelreeks al liep. Wordt automatisch vrijgegeven zodra er gewonnen wordt.
                </div>
              )}

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
            </>
          )}

          {/* Ticket */}
          {tab === 'ticket' && (
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
          )}

          {/* Betalingen */}
          {tab === 'betalingen' && (
            <div>
              <div className="section-title">Betaalhistorie</div>
              {betalingen.length === 0 ? (
                <div className="card" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted)' }}>Nog geen betalingen.</div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {betalingen.slice(0, 12).map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < Math.min(betalingen.length, 12) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: b.status === 'betaald' ? 'var(--success-soft)' : b.status === 'verificatie' ? 'var(--warning-soft)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                        {b.status === 'betaald' ? '✓' : b.status === 'verificatie' ? '⏳' : '·'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{b.omschrijving} — €{b.bedrag.toFixed(2)}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.trekkingWeek ?? '—'} · {b.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acties */}
          {tab === 'acties' && isBeheerder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {foutmelding && (
                <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.25)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'var(--warning)' }}>⚠️ {foutmelding}</div>
              )}

              <div className="card" style={{ padding: 14 }}>
                <div className="section-title" style={{ marginBottom: 8 }}>Rol wijzigen</div>
                <select
                  value={lid.rol}
                  disabled={bezig}
                  onChange={(e) => handleRolChange(e.target.value as Rol)}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif" }}
                >
                  <option value="lid">Lid</option>
                  <option value="kashouder">Kashouder</option>
                  <option value="beheerder">Beheerder</option>
                </select>
              </div>

              {/* Saldo corrigeren — nieuw: hoort hier, niet meer alleen op Financieel */}
              <div className="card" style={{ padding: 14 }}>
                <div className="section-title" style={{ marginBottom: 4 }}>Saldo corrigeren</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
                  Huidig: €{(lid.lottoSaldo ?? 0).toFixed(2)}. Zet direct een nieuw bedrag — geen kasmutatie, dus geen invloed op de kas. Verrekent automatisch met een openstaande week als het nieuwe bedrag genoeg is.
                </div>
                <input
                  value={saldoInvoer}
                  onChange={e => setSaldoInvoer(e.target.value)}
                  placeholder="Nieuw bedrag in euro's"
                  inputMode="decimal"
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", marginBottom: 8 }}
                />
                <input
                  value={saldoReden}
                  onChange={e => setSaldoReden(e.target.value)}
                  placeholder="Reden voor deze correctie"
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", marginBottom: 10 }}
                />
                {saldoFout && <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 8 }}>⚠️ {saldoFout}</div>}
                <button
                  onClick={handleSaldoCorrigeren}
                  disabled={saldoBezig}
                  style={{ width: '100%', background: saldoOk ? 'var(--success)' : 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: saldoBezig ? 0.6 : 1 }}
                >
                  {saldoOk ? '✓ Opgeslagen' : saldoBezig ? 'Bezig…' : 'Saldo aanpassen'}
                </button>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div className="section-title" style={{ marginBottom: 8 }}>Status</div>
                {lid.id === user?.uid ? (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Je kunt jezelf niet verwijderen.</div>
                ) : lid.actief ? (
                  <button
                    onClick={handleVerwijderen}
                    disabled={bezig}
                    style={{ width: '100%', background: 'var(--error-soft)', color: 'var(--error)', border: '1px solid rgba(255,90,90,0.3)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: bezig ? 0.6 : 1 }}
                  >
                    🗑 Verwijder uit club
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={handleHeractiveren}
                      disabled={bezig}
                      style={{ width: '100%', background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(62,207,126,0.3)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: bezig ? 0.6 : 1 }}
                    >
                      ↺ Heractiveren
                    </button>
                    <button
                      onClick={handleDefinitiefVerwijderen}
                      disabled={bezig}
                      style={{ width: '100%', background: 'transparent', color: 'var(--error)', border: '1px solid rgba(255,90,90,0.3)', borderRadius: 10, padding: 12, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: bezig ? 0.6 : 1 }}
                    >
                      🗑️ Definitief verwijderen (kan niet ongedaan worden gemaakt)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function LidDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['kashouder', 'beheerder']}>
      <LidDetailContent />
    </ProtectedRoute>
  );
}
