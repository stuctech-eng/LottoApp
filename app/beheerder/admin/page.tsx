'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeAuditLog } from '@/lib/firestore-audit';
import { subscribePaymentConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/firestore-payment-config';
import { subscribeSpelConfig, DEFAULT_SPELCONFIG } from '@/lib/firestore-spelconfig';
import { subscribeVerenigingConfig, updateVerenigingConfig, DEFAULT_VERENIGING_CONFIG } from '@/lib/firestore-vereniging';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { subscribeAlleSeizoenen, subscribeSeizoen, maakSeizoen, sluitSeizoen } from '@/lib/firestore-seizoenen';
import { herberekenHuidigeSpeelreeks, vulHistorischPrijsBedragIn, bekijkPrijzenpotDetails } from '@/lib/firestore-herberekening';
import { PAYMENT_PROVIDERS } from '@/lib/providers/payments';
import { AuditLogEntry, PaymentConfig, SpelConfig, Seizoen, User, GeplandeNotificatie, NotificatieDoelgroep, NotificatieHerhaling } from '@/lib/types';
import { subscribeGeplandeNotificaties, maakGeplandeNotificatie, updateGeplandeNotificatie, verwijderGeplandeNotificatie } from '@/lib/firestore-geplande-notificaties';
import { httpsCallable } from 'firebase/functions';
import { functionsInstance } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/kashouder/financieel', icon: '💸', label: 'Financieel' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer', active: true },
];

type Tab = 'instellingen'|'spel'|'prijzen'|'seizoen'|'notificaties'|'audit';

function AdminPageContent() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('instellingen');
  const [toggles, setToggles] = useState({ bewijs:true, notif:true, herinner:true, winnaar:true });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  // Geplande notificaties
  const [geplandeNotificaties, setGeplandeNotificaties] = useState<GeplandeNotificatie[]>([]);
  const [notifFormOpen, setNotifFormOpen] = useState(false);
  const [notifBewerkId, setNotifBewerkId] = useState<string | null>(null);
  const [notifTitel, setNotifTitel] = useState('');
  const [notifBericht, setNotifBericht] = useState('');
  const [notifDoelgroep, setNotifDoelgroep] = useState<NotificatieDoelgroep>('alleLeden');
  const [notifHerhaling, setNotifHerhaling] = useState<NotificatieHerhaling>('eenmalig');
  const [notifDatum, setNotifDatum] = useState('');
  const [notifTijd, setNotifTijd] = useState('12:00');
  const [notifOpslaanBezig, setNotifOpslaanBezig] = useState(false);
  const [notifTestBezig, setNotifTestBezig] = useState<string | null>(null);
  const [notifTestResultaat, setNotifTestResultaat] = useState<string | null>(null);

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [spelConfig, setSpelConfig] = useState<SpelConfig>(DEFAULT_SPELCONFIG);
  const [seizoenen, setSeizoenen] = useState<Seizoen[]>([]);
  const [actiefsSeizoen, setActiefSeizoen] = useState<Seizoen | null>(null);
  const [nieuwSeizoenNaam, setNieuwSeizoenNaam] = useState('');
  const [spelBezig, setSpelBezig] = useState(false);
  const [spelOk, setSpelOk] = useState(false);
  const [herberekenBezig, setHerberekenBezig] = useState(false);
  const [herberekenResultaat, setHerberekenResultaat] = useState<string | null>(null);
  const [herberekenError, setHerberekenError] = useState<string | null>(null);
  const [prijsBedragBezig, setPrijsBedragBezig] = useState(false);
  const [prijsBedragResultaat, setPrijsBedragResultaat] = useState<string | null>(null);
  const [prijsBedragError, setPrijsBedragError] = useState<string | null>(null);
  const [detailsBezig, setDetailsBezig] = useState(false);
  const [detailsResultaat, setDetailsResultaat] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [tikkieLink, setTikkieLink] = useState('');
  const [tikkieBezig, setTikkieBezig] = useState(false);
  const [tikkieOk, setTikkieOk] = useState(false);
  const [tikkieError, setTikkieError] = useState<string | null>(null);

  const [leden, setLeden] = useState<User[]>([]);

  const [verenigingNaam, setVerenigingNaam] = useState(DEFAULT_VERENIGING_CONFIG.naam);
  const [naamBewerken, setNaamBewerken] = useState(false);
  const [naamInvoer, setNaamInvoer] = useState('');
  const [naamBezig, setNaamBezig] = useState(false);
  const [naamOk, setNaamOk] = useState(false);
  const [naamError, setNaamError] = useState<string | null>(null);

  const [standaardInleg, setStandaardInleg] = useState(DEFAULT_VERENIGING_CONFIG.standaardInleg);
  const [inlegBewerken, setInlegBewerken] = useState(false);
  const [inlegInvoer, setInlegInvoer] = useState('');
  const [inlegBezig, setInlegBezig] = useState(false);
  const [inlegOk, setInlegOk] = useState(false);
  const [inlegError, setInlegError] = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeAuditLog(setAuditLog, 50);
    const u2 = subscribePaymentConfig((config) => {
      setPaymentConfig(config);
      setTikkieLink(config.tikkieLink ?? '');
    });
    const u3 = subscribeSpelConfig(setSpelConfig);
    const u5 = subscribeAlleSeizoenen(setSeizoenen);
    const u6 = subscribeSeizoen(setActiefSeizoen);
    const u7 = subscribeVerenigingConfig((config) => {
      setVerenigingNaam(config.naam);
      setStandaardInleg(config.standaardInleg);
    });
    const u8 = subscribeAllUsers(setLeden);
    const u9 = subscribeGeplandeNotificaties(setGeplandeNotificaties);
    return () => { u1(); u2(); u3(); u5(); u6(); u7(); u8(); u9(); };
  }, []);

  const handleSpelConfigSave = async () => {
    setSpelBezig(true);
    try {
      await setDoc(doc(db, 'spelConfig', 'default'), spelConfig, { merge: true });
      setSpelOk(true);
      setTimeout(() => setSpelOk(false), 2000);
    } finally {
      setSpelBezig(false);
    }
  };

  const handleHerbereken = async () => {
    if (!actiefsSeizoen) return;
    const bevestigd = window.confirm(
      'Dit verwijdert alle resultaten van de HUIDIGE speelreeks en berekent ze opnieuw vanaf de eerste trekking van die speelreeks. Oudere, al afgesloten speelreeksen blijven ongewijzigd. Doorgaan?'
    );
    if (!bevestigd) return;

    setHerberekenBezig(true);
    setHerberekenError(null);
    setHerberekenResultaat(null);
    try {
      const result = await herberekenHuidigeSpeelreeks(actiefsSeizoen.id);
      if (result.herberekend === 0) {
        setHerberekenResultaat(result.bericht ?? 'Geen trekkingen om te herberekenen.');
      } else {
        const winnaarsTekst = result.winnaars && result.winnaars.length > 0
          ? ` Winnaar(s): ${result.winnaars.join(', ')}.`
          : ' Nog geen winnaar.';
        setHerberekenResultaat(`✓ ${result.herberekend} trekking(en) opnieuw verwerkt.${winnaarsTekst}`);
      }
    } catch (err) {
      setHerberekenError(err instanceof Error ? err.message : 'Herberekenen mislukt.');
    } finally {
      setHerberekenBezig(false);
    }
  };

  const handleVulPrijsBedragIn = async () => {
    setPrijsBedragBezig(true);
    setPrijsBedragError(null);
    setPrijsBedragResultaat(null);
    try {
      const result = await vulHistorischPrijsBedragIn();
      if (result.bijgewerkt === 0) {
        setPrijsBedragResultaat('Niets om bij te werken — alle winnaars hebben al een vastgelegd prijsbedrag.');
      } else {
        const regels = result.details.map(d => `${d.userNaam}: €${d.prijsBedrag.toFixed(0)}`).join(', ');
        setPrijsBedragResultaat(`✓ ${result.bijgewerkt} winnaar-resultaat(en) bijgewerkt. ${regels}`);
      }
    } catch (err) {
      setPrijsBedragError(err instanceof Error ? err.message : 'Bijwerken mislukt.');
    } finally {
      setPrijsBedragBezig(false);
    }
  };

  const handleHerberekenPrijsBedrag = async () => {
    const bevestigd = window.confirm(
      'Dit berekent het prijsbedrag van ALLE winnaars opnieuw, ook degenen die al een bedrag hebben — bijv. na het corrigeren van een foutieve betaling. Doorgaan?'
    );
    if (!bevestigd) return;
    setPrijsBedragBezig(true);
    setPrijsBedragError(null);
    setPrijsBedragResultaat(null);
    try {
      const result = await vulHistorischPrijsBedragIn(true);
      if (result.bijgewerkt === 0) {
        setPrijsBedragResultaat('Geen winnaars gevonden om te herberekenen.');
      } else {
        const regels = result.details.map(d => `${d.userNaam}: €${d.prijsBedrag.toFixed(0)}`).join(', ');
        setPrijsBedragResultaat(`✓ (herberekend) ${result.bijgewerkt} winnaar-resultaat(en). ${regels}`);
      }
    } catch (err) {
      setPrijsBedragError(err instanceof Error ? err.message : 'Herberekenen mislukt.');
    } finally {
      setPrijsBedragBezig(false);
    }
  };

  const handleBekijkDetails = async () => {
    setDetailsBezig(true);
    setDetailsError(null);
    setDetailsResultaat(null);
    try {
      const result = await bekijkPrijzenpotDetails();
      const regels = result.items
        .map(i => `${i.trekkingWeek} · ${i.userNaam}: €${i.bedrag.toFixed(2)}`)
        .join('\n');
      setDetailsResultaat(
        `Trekkingweek ${result.trekkingWeek} · vanaf ${result.vanafWeek ?? '(begin)'} · ${result.aantalWinnaars} winnaar(s)\n` +
        `Totaal: €${result.totaal.toFixed(2)}\n\n${regels || '(geen betalingen gevonden)'}`
      );
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Ophalen mislukt.');
    } finally {
      setDetailsBezig(false);
    }
  };

  function valideerTikkieUrl(input: string): string | null {
    const waarde = input.trim();
    if (!waarde) return null;
    try {
      const url = new URL(waarde);
      if (url.protocol !== 'https:') return 'Link moet beginnen met https://';
      if (waarde.includes(' ')) return 'Link mag geen spaties bevatten — plak alleen de URL, niet de hele Tikkie-tekst';
      return null;
    } catch {
      return 'Dit is geen geldige link. Plak alleen de URL (bijv. https://tikkie.me/pay/...), niet de hele Tikkie-berichttekst';
    }
  }

  const handleTikkie = async () => {
    const fout = valideerTikkieUrl(tikkieLink);
    if (fout) { setTikkieError(fout); return; }
    setTikkieError(null);
    setTikkieBezig(true);
    try {
      await setDoc(doc(db, 'paymentConfig', 'main'), { tikkieLink: tikkieLink.trim(), tikkieLinkBijgewerkt: serverTimestamp() }, { merge: true });
      setTikkieOk(true);
      setTimeout(() => setTikkieOk(false), 2000);
    } finally {
      setTikkieBezig(false);
    }
  };

  const handleOpenNaamBewerken = () => {
    setNaamInvoer(verenigingNaam);
    setNaamError(null);
    setNaamBewerken(true);
  };

  const handleOpslaanNaam = async () => {
    const nieuweNaam = naamInvoer.trim();
    if (!nieuweNaam) { setNaamError('Naam mag niet leeg zijn'); return; }
    if (nieuweNaam.length > 40) { setNaamError('Maximaal 40 tekens'); return; }
    setNaamError(null);
    setNaamBezig(true);
    try {
      await updateVerenigingConfig({ naam: nieuweNaam });
      setNaamOk(true);
      setTimeout(() => { setNaamOk(false); setNaamBewerken(false); }, 1200);
    } catch {
      setNaamError('Opslaan mislukt, probeer opnieuw');
    } finally {
      setNaamBezig(false);
    }
  };

  const handleOpenInlegBewerken = () => {
    setInlegInvoer(String(standaardInleg).replace('.', ','));
    setInlegError(null);
    setInlegBewerken(true);
  };

  const handleOpslaanInleg = async () => {
    const bedrag = parseFloat(inlegInvoer.replace(',', '.'));
    if (isNaN(bedrag) || bedrag <= 0) { setInlegError('Vul een geldig bedrag groter dan €0 in'); return; }
    if (bedrag > 1000) { setInlegError('Dat lijkt niet te kloppen — controleer het bedrag'); return; }
    setInlegError(null);
    setInlegBezig(true);
    try {
      await updateVerenigingConfig({ standaardInleg: bedrag });
      setInlegOk(true);
      setTimeout(() => { setInlegOk(false); setInlegBewerken(false); }, 1200);
    } catch {
      setInlegError('Opslaan mislukt, probeer opnieuw');
    } finally {
      setInlegBezig(false);
    }
  };

  const actieveKashouders = leden.filter(l => l.actief && l.rol === 'kashouder');
  const kashouderNamen = actieveKashouders.length > 0
    ? actieveKashouders.map(l => l.naam).join(', ')
    : 'Niet toegewezen';

  const handleMaakSeizoen = async () => {
    const naam = nieuwSeizoenNaam.trim() || `Seizoen ${new Date().getFullYear()}`;
    await maakSeizoen(naam);
    setNieuwSeizoenNaam('');
  };

  const auditIcon: Record<string, string> = {
    gebruiker_aangemaakt: '👤', gebruiker_verwijderd: '🗑️',
    ticket_toegevoegd: '🎱', ticket_gewijzigd: '🎱', ticket_verwijderd: '🎱',
    rol_gewijzigd: '🔑', profiel_gewijzigd: '✏️',
    betaling_gemeld: '💬', betaling_bevestigd: '✅', betaling_afgewezen: '❌',
    uitbetaling_geregistreerd: '💸', kascorrectie: '⚖️',
    trekking_ingevoerd: '🎱', trekking_gewijzigd: '🎱',
    seizoen_gestart: '🚀', seizoen_gesloten: '⛔',
  };

  const formatAuditDatum = (ts: AuditLogEntry['datum']): string => {
    if (!ts) return '—';
    const d = ts.toDate();
    const vandaag = new Date();
    const isVandaag = d.toDateString() === vandaag.toDateString();
    if (isVandaag) return `${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} · vandaag`;
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  };

  const Toggle = ({ k }: { k: keyof typeof toggles }) => (
    <button onClick={() => setToggles(t => ({...t,[k]:!t[k]}))} style={{ width: 44, height: 26, borderRadius: 13, border: 'none', position: 'relative', cursor: 'pointer', background: toggles[k]?'var(--accent)':'var(--navy-mid)', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: toggles[k]?'translateX(18px)':'translateX(0)' }} />
    </button>
  );

  const tabs: {id:Tab,label:string}[] = [{id:'instellingen',label:'⚙️ Instellingen'},{id:'spel',label:'🎱 Spel'},{id:'prijzen',label:'💰 Prijzen'},{id:'seizoen',label:'🏆 Seizoen'},{id:'notificaties',label:'🔔 Notificaties'},{id:'audit',label:'📋 Audit log'}];

  const resetNotifForm = () => {
    setNotifBewerkId(null);
    setNotifTitel('');
    setNotifBericht('');
    setNotifDoelgroep('alleLeden');
    setNotifHerhaling('eenmalig');
    setNotifDatum('');
    setNotifTijd('12:00');
    setNotifFormOpen(false);
  };

  const handleNotifBewerken = (n: GeplandeNotificatie) => {
    setNotifBewerkId(n.id);
    setNotifTitel(n.titel);
    setNotifBericht(n.bericht);
    setNotifDoelgroep(n.doelgroep);
    setNotifHerhaling(n.herhaling);
    const d = n.geplandOp.toDate();
    setNotifDatum(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setNotifTijd(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setNotifFormOpen(true);
  };

  const handleNotifOpslaan = async () => {
    if (!user || !profile || !notifTitel.trim() || !notifBericht.trim() || !notifDatum) return;
    setNotifOpslaanBezig(true);
    try {
      const [uur, minuut] = notifTijd.split(':').map(Number);
      const [jaar, maand, dag] = notifDatum.split('-').map(Number);
      const geplandOp = new Date(jaar, maand - 1, dag, uur, minuut);
      const actieUser = { uid: user.uid, naam: profile.naam };

      if (notifBewerkId) {
        await updateGeplandeNotificatie(notifBewerkId, {
          titel: notifTitel.trim(),
          bericht: notifBericht.trim(),
          doelgroep: notifDoelgroep,
          herhaling: notifHerhaling,
          geplandOp,
        }, actieUser);
      } else {
        await maakGeplandeNotificatie({
          titel: notifTitel.trim(),
          bericht: notifBericht.trim(),
          doelgroep: notifDoelgroep,
          herhaling: notifHerhaling,
          geplandOp,
        }, actieUser);
      }
      resetNotifForm();
    } finally {
      setNotifOpslaanBezig(false);
    }
  };

  const handleNotifVerwijderen = async (n: GeplandeNotificatie) => {
    if (!user || !profile) return;
    const bevestigd = window.confirm(`"${n.titel}" verwijderen? Dit kan niet ongedaan worden gemaakt.`);
    if (!bevestigd) return;
    await verwijderGeplandeNotificatie(n.id, n.titel, { uid: user.uid, naam: profile.naam });
  };

  const handleNotifToggleActief = async (n: GeplandeNotificatie) => {
    if (!user || !profile) return;
    await updateGeplandeNotificatie(n.id, { actief: !n.actief }, { uid: user.uid, naam: profile.naam });
  };

  const handleNotifTestNu = async () => {
    setNotifTestBezig('bezig');
    setNotifTestResultaat(null);
    try {
      const fn = httpsCallable<Record<string, never>, { succes: boolean; foutmelding?: string; verwerkt?: number }>(functionsInstance, 'testVerwerkGeplandeNotificatiesNu');
      const result = await fn({});
      if (result.data.succes) {
        setNotifTestResultaat(`✅ Verwerkt: ${result.data.verwerkt} notificatie(s) verstuurd (alleen die daadwerkelijk aan de beurt waren volgens hun schema).`);
      } else {
        setNotifTestResultaat(`⚠️ ${result.data.foutmelding}`);
      }
    } catch (e: unknown) {
      setNotifTestResultaat(`❌ Mislukt: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setNotifTestBezig(null);
    }
  };

  const doelgroepLabel: Record<NotificatieDoelgroep, string> = {
    alleLeden: 'Alle leden',
    spelendeLeden: 'Alleen spelende leden',
    beheerderKashouder: 'Beheerder + kashouder',
  };

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 2 }}>👑 Beheerder</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 6 }}>Admin</div>
            <span className="badge badge-gold">⚙️ Systeembeheer</span>
          </div>
          <Link href="/beheerder" style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)', flexShrink: 0 }}>←</Link>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', overflowX: 'auto', marginBottom: 20 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: '9px 16px', fontSize: 13, fontWeight: 500, color: tab===t.id?'var(--gold)':'var(--muted)', border: 'none', borderBottom: `2px solid ${tab===t.id?'var(--gold)':'transparent'}`, background: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </div>

        {/* INSTELLINGEN */}
        {tab==='instellingen' && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Vereniging</div>
              <div className="card" style={{ overflow: 'hidden' }}>

                {/* Naam vereniging */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(74,158,255,0.06)' }}>
                  {!naamBewerken ? (
                    <div onClick={handleOpenNaamBewerken} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎱</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>Naam vereniging</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{verenigingNaam}</div>
                      </div>
                      <span style={{ fontSize: 16, color: 'var(--muted)' }}>›</span>
                    </div>
                  ) : (
                    <div>
                      <label className="form-label">Naam vereniging</label>
                      <input
                        type="text" className="form-input" value={naamInvoer}
                        onChange={e => { setNaamInvoer(e.target.value); setNaamError(null); }}
                        maxLength={40}
                        style={{ marginBottom: 8, borderColor: naamError ? 'var(--error)' : undefined }}
                        autoFocus
                      />
                      {naamError && <div style={{ fontSize: 11, color: 'var(--error)', marginBottom: 8 }}>⚠️ {naamError}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setNaamBewerken(false)} style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>Annuleren</button>
                        <button onClick={handleOpslaanNaam} disabled={naamBezig} style={{ flex: 1, background: naamOk ? 'var(--success)' : 'var(--accent)', border: 'none', color: 'white', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: naamBezig ? 0.6 : 1 }}>
                          {naamOk ? '✓ Opgeslagen' : naamBezig ? 'Bezig…' : 'Opslaan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Standaard inleg */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(74,158,255,0.06)' }}>
                  {!inlegBewerken ? (
                    <div onClick={handleOpenInlegBewerken} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>💶</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>Standaard inleg</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>€{standaardInleg.toFixed(2).replace('.', ',')}</div>
                      </div>
                      <span style={{ fontSize: 16, color: 'var(--muted)' }}>›</span>
                    </div>
                  ) : (
                    <div>
                      <label className="form-label">Standaard inleg</label>
                      <input
                        type="text" inputMode="decimal" className="form-input" value={inlegInvoer}
                        onChange={e => { setInlegInvoer(e.target.value); setInlegError(null); }}
                        placeholder="Bedrag in euro's"
                        style={{ marginBottom: 8, borderColor: inlegError ? 'var(--error)' : undefined }}
                        autoFocus
                      />
                      {inlegError && <div style={{ fontSize: 11, color: 'var(--error)', marginBottom: 8 }}>⚠️ {inlegError}</div>}
                      <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 10, padding: '8px 10px', marginBottom: 8, fontSize: 11, color: 'var(--warning)', lineHeight: 1.5 }}>
                        ⚠️ Geldt vanaf de eerstvolgende trekking — al aangemaakte betalingen voor de huidige week wijzigen niet met terugwerkende kracht.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setInlegBewerken(false)} style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>Annuleren</button>
                        <button onClick={handleOpslaanInleg} disabled={inlegBezig} style={{ flex: 1, background: inlegOk ? 'var(--success)' : 'var(--accent)', border: 'none', color: 'white', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: inlegBezig ? 0.6 : 1 }}>
                          {inlegOk ? '✓ Opgeslagen' : inlegBezig ? 'Bezig…' : 'Opslaan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kashouder — alleen-lezen, afgeleid uit de Leden-pagina */}
                <Link href="/leden" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>⚡</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Kashouder</div>
                    <div style={{ fontSize: 11, color: actieveKashouders.length > 0 ? 'var(--muted)' : 'var(--warning)', marginTop: 1 }}>{kashouderNamen}</div>
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--muted)' }}>›</span>
                </Link>
                <div style={{ padding: '0 16px 12px', fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Rol wordt toegewezen via Leden — tik hierboven om daarheen te gaan.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Betaalproviders</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {(Object.keys(PAYMENT_PROVIDERS) as (keyof typeof PAYMENT_PROVIDERS)[]).map((id, i, arr) => {
                  const info = PAYMENT_PROVIDERS[id];
                  const enabled = paymentConfig.providers[id]?.enabled;
                  const isActive = paymentConfig.activeProvider === id;
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i<arr.length-1?'1px solid rgba(74,158,255,0.06)':'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: isActive ? 'var(--success-soft)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{info.icoon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{info.naam}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{info.beschrijving}</div>
                      </div>
                      {isActive && <span className="badge badge-green">Actief</span>}
                      {!isActive && <span className="badge badge-muted">{enabled ? 'Beschikbaar' : 'Uit'}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5, padding: '0 4px' }}>
                Wijzigen van de actieve provider gebeurt via Firestore Console (`/paymentConfig/main`) totdat Tikkie, Stripe of Mollie volledig geïmplementeerd zijn.
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Tikkie-link</div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Voeg hier de Tikkie-link in van de kashouder. Deze wordt automatisch toegevoegd aan WhatsApp-herinneringen zodat leden direct kunnen betalen.
                </div>
                <label className="form-label">Tikkie-link</label>
                <input
                  type="url" inputMode="url" className="form-input"
                  placeholder="https://tikkie.me/pay/..."
                  value={tikkieLink}
                  onChange={e => { setTikkieLink(e.target.value); setTikkieError(null); }}
                  style={{ marginBottom: 12, borderColor: tikkieError ? 'var(--error)' : undefined }}
                />
                {tikkieError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--error-soft)', border: '1px solid rgba(255,90,90,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                    <span style={{ color: 'var(--error)', fontSize: 12, lineHeight: 1.5 }}>{tikkieError}</span>
                  </div>
                )}
                {tikkieLink && !tikkieError && (
                  <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 12, wordBreak: 'break-all' }}>
                    ✓ Link ingesteld: {tikkieLink}
                  </div>
                )}
                {(() => {
                  const bijgewerkt = paymentConfig.tikkieLinkBijgewerkt;
                  if (!bijgewerkt) return null;
                  const dagenGeleden = Math.floor((Date.now() - bijgewerkt.toDate().getTime()) / 86400000);
                  const kleur = dagenGeleden >= 12 ? 'var(--error)' : dagenGeleden >= 8 ? 'var(--warning)' : 'var(--muted)';
                  const waarschuwing = dagenGeleden >= 12;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: waarschuwing ? 'var(--error-soft)' : 'transparent', border: waarschuwing ? '1px solid rgba(255,90,90,0.2)' : 'none', borderRadius: 10, padding: waarschuwing ? '8px 10px' : 0, marginBottom: 12, fontSize: 11, color: kleur, lineHeight: 1.5 }}>
                      {waarschuwing ? '⚠️' : '🕓'} Laatst bijgewerkt: {dagenGeleden === 0 ? 'vandaag' : `${dagenGeleden} ${dagenGeleden === 1 ? 'dag' : 'dagen'} geleden`}
                      {waarschuwing && ' — Tikkie-links verlopen doorgaans na 14 dagen. Ververs deze link.'}
                    </div>
                  );
                })()}
                <button onClick={handleTikkie} disabled={tikkieBezig} style={{ width: '100%', background: tikkieOk ? 'linear-gradient(135deg,var(--success),#1a8a50)' : 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: tikkieBezig ? 0.6 : 1 }}>
                  {tikkieOk ? '✓ Opgeslagen' : tikkieBezig ? 'Opslaan…' : '💳 Tikkie-link opslaan'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Notificaties</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {[{k:'notif' as const,icon:'🔔',label:'Betaalverzoeken versturen'},{k:'herinner' as const,icon:'📩',label:'Herinneringen'},{k:'winnaar' as const,icon:'🏆',label:'Winnaar notificatie'}].map((r,i,arr) => (
                  <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i<arr.length-1?'1px solid rgba(74,158,255,0.06)':'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{r.icon}</div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                    <Toggle k={r.k} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SPEL */}
        {tab==='spel' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Spelconfiguratie</div>
            <div className="card" style={{ padding: 18, marginBottom: 16 }}>
              <label className="form-label">Naam spel</label>
              <input type="text" className="form-input" value={spelConfig.naam} onChange={e => setSpelConfig(s => ({...s, naam: e.target.value}))} />
              <label className="form-label">Aantal getallen</label>
              <input type="number" className="form-input" value={spelConfig.aantalGetallen} onChange={e => setSpelConfig(s => ({...s, aantalGetallen: parseInt(e.target.value) || s.aantalGetallen}))} />
              <label className="form-label">Min. getal</label>
              <input type="number" className="form-input" value={spelConfig.minGetal} onChange={e => setSpelConfig(s => ({...s, minGetal: parseInt(e.target.value) || s.minGetal}))} />
              <label className="form-label">Max. getal</label>
              <input type="number" className="form-input" value={spelConfig.maxGetal} onChange={e => setSpelConfig(s => ({...s, maxGetal: parseInt(e.target.value) || s.maxGetal}))} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Bonusbal</label>
                <button onClick={() => setSpelConfig(s => ({...s, bonusBal: !s.bonusBal}))} style={{ width: 44, height: 26, borderRadius: 13, border: 'none', position: 'relative', cursor: 'pointer', background: spelConfig.bonusBal ? 'var(--accent)' : 'var(--navy-mid)', transition: 'background 0.2s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: spelConfig.bonusBal ? 'translateX(18px)' : 'translateX(0)' }} />
                </button>
              </div>
              <button onClick={handleSpelConfigSave} disabled={spelBezig} style={{ width:'100%', background: spelOk ? 'linear-gradient(135deg,var(--success),#1a8a50)' : 'linear-gradient(135deg,var(--gold),#c08820)', color: spelOk ? 'white' : 'var(--navy)', border:'none', borderRadius:13, padding:14, fontSize:14, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:'pointer', opacity: spelBezig ? 0.6 : 1 }}>
                {spelOk ? '✓ Opgeslagen' : spelBezig ? 'Opslaan…' : '💾 Opslaan in Firestore'}
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                Wijzigingen worden direct toegepast op nieuwe trekkingen. Bestaande resultaten blijven ongewijzigd.
              </div>
            </div>
          </div>
        )}

        {/* PRIJZEN */}
        {tab==='prijzen' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Spelregel</div>
            <div className="card" style={{ padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🎯 6 goed is winnaar (vaste spelmodus)</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                Iedere trekking worden de getrokken nummers vergeleken met elk ticket.
                Elk nummer dat een speler goed heeft, wordt permanent bijgeschreven voor
                dat ticket binnen de huidige speelreeks — een nummer telt maar één keer
                mee, ook als het later nogmaals valt. Zodra een ticket alle {spelConfig.aantalGetallen}{' '}
                nummers heeft verzameld, is dat ticket winnaar. Er kunnen meerdere
                winnaars tegelijk zijn. Na een trekking met winnaar(s) sluit de
                speelreeks automatisch en begint een nieuwe.
              </div>
              <div style={{ background: 'var(--accent-soft)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 10, padding: '10px 12px', marginTop: 14, fontSize: 11, color: 'var(--accent)', lineHeight: 1.5 }}>
                💡 Is er geen winnaar deze trekking, dan blijft de pot staan (rollover) en telt iedereen zijn cumulatieve matches gewoon door naar de volgende trekking.
              </div>
            </div>

            <div className="section-title">Herberekenen</div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                Verwijdert alle resultaten van de <strong>huidige, nog lopende speelreeks</strong> en
                berekent ze opnieuw vanaf de eerste trekking daarvan. Handig als er ooit
                een fout wordt ontdekt of tijdens het testen. Al afgesloten speelreeksen
                (met een eerdere winnaar) blijven ongewijzigd.
              </div>
              <button
                onClick={handleHerbereken}
                disabled={herberekenBezig || !actiefsSeizoen}
                style={{ width: '100%', background: 'linear-gradient(135deg,var(--warning),#c07000)', color: 'var(--navy)', border: 'none', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: herberekenBezig || !actiefsSeizoen ? 0.6 : 1 }}
              >
                {herberekenBezig ? '⏳ Bezig met herberekenen…' : '🔄 Herbereken huidige speelreeks'}
              </button>
              {!actiefsSeizoen && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Geen actief seizoen — start eerst een seizoen bij het tabblad Seizoen.</div>
              )}
              {herberekenResultaat && (
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 10, lineHeight: 1.5 }}>{herberekenResultaat}</div>
              )}
              {herberekenError && (
                <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 10, lineHeight: 1.5 }}>⚠️ {herberekenError}</div>
              )}
            </div>

            <div className="section-title">Historisch prijsbedrag</div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                Eenmalige actie: vult het gewonnen bedrag met terugwerkende kracht
                in bij winnaars van vóórdat dit werd vastgelegd. Reconstrueert de
                prijzenpot zoals die stond op het moment van die winst. Veilig om
                vaker te draaien — raakt alleen winnaars waar het bedrag nog ontbreekt.
              </div>
              <button
                onClick={handleVulPrijsBedragIn}
                disabled={prijsBedragBezig}
                style={{ width: '100%', background: 'linear-gradient(135deg,var(--gold),#c08820)', color: 'var(--navy)', border: 'none', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: prijsBedragBezig ? 0.6 : 1 }}
              >
                {prijsBedragBezig ? '⏳ Bezig…' : '💰 Historisch prijsbedrag invullen'}
              </button>
              <button
                onClick={handleHerberekenPrijsBedrag}
                disabled={prijsBedragBezig}
                style={{ width: '100%', background: 'var(--surface2)', color: 'var(--white)', border: '1px solid var(--border)', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: prijsBedragBezig ? 0.6 : 1, marginTop: 10 }}
              >
                {prijsBedragBezig ? '⏳ Bezig…' : '♻️ Alle winnaars herberekenen (na correctie)'}
              </button>
              {prijsBedragResultaat && (
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 10, lineHeight: 1.5 }}>{prijsBedragResultaat}</div>
              )}
              {prijsBedragError && (
                <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 10, lineHeight: 1.5 }}>⚠️ {prijsBedragError}</div>
              )}
            </div>

            <div className="section-title">Prijzenpot-berekening bekijken</div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                Alleen-lezen: toont per betaling welk bedrag is meegeteld
                in de prijzenpot van de meest recente winnende trekking —
                handig om een onverwacht bedrag te controleren zonder
                door het auditlog te hoeven scrollen. Wijzigt niets.
              </div>
              <button
                onClick={handleBekijkDetails}
                disabled={detailsBezig}
                style={{ width: '100%', background: 'var(--surface2)', color: 'var(--white)', border: '1px solid var(--border)', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: detailsBezig ? 0.6 : 1 }}
              >
                {detailsBezig ? '⏳ Bezig…' : '🔍 Bekijk berekening laatste winnaar'}
              </button>
              {detailsResultaat && (
                <div style={{ fontSize: 12, color: 'var(--white)', marginTop: 10, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{detailsResultaat}</div>
              )}
              {detailsError && (
                <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 10, lineHeight: 1.5 }}>⚠️ {detailsError}</div>
              )}
            </div>
          </div>
        )}

        {/* SEIZOEN */}
        {tab==='seizoen' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Actief seizoen</div>
            {actiefsSeizoen ? (
              <div style={{ background:'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border:'1px solid rgba(240,192,96,0.2)', borderRadius:18, padding:'16px 18px', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:16, fontWeight:700 }}>🏆 {actiefsSeizoen.naam}</span>
                  <span className="badge badge-green">● Actief</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                  {actiefsSeizoen.startDatum ? `Gestart: ${actiefsSeizoen.startDatum.toDate().toLocaleDateString('nl-NL')}` : 'Startdatum onbekend'}
                </div>
                <button onClick={() => sluitSeizoen(actiefsSeizoen.id)} style={{ width:'100%', background:'linear-gradient(135deg,#ff5a5a,#aa0000)', color:'white', border:'none', borderRadius:13, padding:13, fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>⛔ Seizoen afsluiten</button>
              </div>
            ) : (
              <div className="card" style={{ padding: '20px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
                Geen actief seizoen. Maak een nieuw seizoen aan.
              </div>
            )}

            <div className="section-title">Nieuw seizoen</div>
            <div className="card" style={{ padding: 18, marginBottom: 16 }}>
              <label className="form-label">Naam</label>
              <input type="text" className="form-input" placeholder={`Seizoen ${new Date().getFullYear()}`} value={nieuwSeizoenNaam} onChange={e => setNieuwSeizoenNaam(e.target.value)} />
              <button onClick={handleMaakSeizoen} disabled={!!actiefsSeizoen} style={{ width:'100%', background:'linear-gradient(135deg,var(--success),#1a8a50)', color:'white', border:'none', borderRadius:13, padding:13, fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor: actiefsSeizoen ? 'not-allowed' : 'pointer', opacity: actiefsSeizoen ? 0.4 : 1 }}>🚀 Nieuw seizoen starten</button>
              {actiefsSeizoen && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Sluit het huidige seizoen eerst af voordat je een nieuw seizoen start.</div>}
            </div>

            {seizoenen.filter(s => s.status === 'gesloten').length > 0 && (
              <>
                <div className="section-title">Afgesloten seizoenen</div>
                {seizoenen.filter(s => s.status === 'gesloten').map(s => (
                  <div key={s.id} className="card" style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{s.naam}</span>
                    <span className="badge badge-muted">Gesloten</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* AUDIT */}
        {tab==='notificaties' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Geplande notificaties</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Maak zelf eenmalige of wekelijkse meldingen, zonder dat daar een nieuwe app-update voor nodig is. Een lid ontvangt dit alleen als de eigen "Herinneringen"-instelling aan staat.
            </div>

            <button
              onClick={handleNotifTestNu}
              disabled={notifTestBezig !== null}
              style={{ width: '100%', padding: 12, background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, marginBottom: 10, opacity: notifTestBezig ? 0.6 : 1 }}
            >
              {notifTestBezig ? '⏳ Bezig...' : '▶ Nu checken wat er aan de beurt is'}
            </button>
            {notifTestResultaat && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, color: notifTestResultaat.startsWith('✅') ? 'var(--success)' : 'var(--error)', lineHeight: 1.5 }}>
                {notifTestResultaat}
              </div>
            )}

            {!notifFormOpen && (
              <button
                onClick={() => setNotifFormOpen(true)}
                style={{ width: '100%', padding: 14, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, marginBottom: 20 }}
              >
                ➕ Nieuwe notificatie
              </button>
            )}

            {notifFormOpen && (
              <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{notifBewerkId ? 'Notificatie bewerken' : 'Nieuwe notificatie'}</div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Titel</label>
                  <input value={notifTitel} onChange={e => setNotifTitel(e.target.value)} placeholder="Bijv. 🎱 Vergeet je inleg niet" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--navy-mid)', color: 'var(--white)', fontSize: 14 }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Bericht</label>
                  <textarea value={notifBericht} onChange={e => setNotifBericht(e.target.value)} rows={3} placeholder="De tekst van de melding" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--navy-mid)', color: 'var(--white)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Doelgroep</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['alleLeden', 'spelendeLeden', 'beheerderKashouder'] as NotificatieDoelgroep[]).map(dg => (
                      <button key={dg} onClick={() => setNotifDoelgroep(dg)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${notifDoelgroep === dg ? 'var(--accent)' : 'var(--border)'}`, background: notifDoelgroep === dg ? 'var(--accent-soft)' : 'transparent', color: notifDoelgroep === dg ? 'var(--accent)' : 'var(--muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {doelgroepLabel[dg]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Herhaling</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setNotifHerhaling('eenmalig')} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${notifHerhaling === 'eenmalig' ? 'var(--accent)' : 'var(--border)'}`, background: notifHerhaling === 'eenmalig' ? 'var(--accent-soft)' : 'transparent', color: notifHerhaling === 'eenmalig' ? 'var(--accent)' : 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Eenmalig</button>
                    <button onClick={() => setNotifHerhaling('wekelijks')} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${notifHerhaling === 'wekelijks' ? 'var(--accent)' : 'var(--border)'}`, background: notifHerhaling === 'wekelijks' ? 'var(--accent-soft)' : 'transparent', color: notifHerhaling === 'wekelijks' ? 'var(--accent)' : 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Elke week</button>
                  </div>
                  {notifHerhaling === 'wekelijks' && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Herhaalt elke week op dezelfde dag-van-de-week en hetzelfde tijdstip als hieronder gekozen.</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{notifHerhaling === 'wekelijks' ? 'Datum (bepaalt de dag)' : 'Datum'}</label>
                    <input type="date" value={notifDatum} onChange={e => setNotifDatum(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--navy-mid)', color: 'var(--white)', fontSize: 14 }} />
                  </div>
                  <div style={{ width: 110 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Tijd</label>
                    <input type="time" value={notifTijd} onChange={e => setNotifTijd(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--navy-mid)', color: 'var(--white)', fontSize: 14 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={resetNotifForm} style={{ flex: 1, padding: 12, background: 'var(--navy-mid)', color: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>Annuleren</button>
                  <button
                    onClick={handleNotifOpslaan}
                    disabled={notifOpslaanBezig || !notifTitel.trim() || !notifBericht.trim() || !notifDatum}
                    style={{ flex: 1, padding: 12, background: 'var(--success)', color: 'var(--navy)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, opacity: (notifOpslaanBezig || !notifTitel.trim() || !notifBericht.trim() || !notifDatum) ? 0.6 : 1 }}
                  >
                    {notifOpslaanBezig ? 'Opslaan...' : notifBewerkId ? 'Wijzigingen opslaan' : 'Aanmaken'}
                  </button>
                </div>
              </div>
            )}

            <div className="section-title">Overzicht</div>
            {geplandeNotificaties.length === 0 && (
              <div className="card" style={{ padding: '20px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Nog geen geplande notificaties.
              </div>
            )}
            {geplandeNotificaties.map(n => (
              <div key={n.id} className="card" style={{ padding: 14, marginBottom: 8, opacity: n.actief ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{n.titel}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{n.bericht}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span>{doelgroepLabel[n.doelgroep]}</span>
                      <span>·</span>
                      <span>{n.herhaling === 'eenmalig' ? `Eenmalig — ${n.geplandOp.toDate().toLocaleString('nl-NL')}` : `Elke week — ${n.geplandOp.toDate().toLocaleDateString('nl-NL', { weekday: 'long' })} ${n.geplandOp.toDate().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`}</span>
                    </div>
                    {n.laatstVerstuurdOp && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Laatst verstuurd: {n.laatstVerstuurdOp.toDate().toLocaleString('nl-NL')}</div>
                    )}
                    {!n.actief && n.herhaling === 'eenmalig' && n.laatstVerstuurdOp && (
                      <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✅ Verstuurd</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => handleNotifBewerken(n)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--white)', fontSize: 12, fontWeight: 600 }}>✎ Bewerken</button>
                  <button onClick={() => handleNotifToggleActief(n)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: n.actief ? 'var(--warning)' : 'var(--success)', fontSize: 12, fontWeight: 600 }}>{n.actief ? 'Pauzeren' : 'Activeren'}</button>
                  <button onClick={() => handleNotifVerwijderen(n)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='audit' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Alle systeem activiteit</div>
            {auditLog.length === 0 && (
              <div className="card" style={{ padding: '20px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Nog geen activiteit gelogd.
              </div>
            )}
            {auditLog.map(a => (
              <div key={a.id} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{auditIcon[a.actie] ?? '📋'}</span>
                <div style={{ flex:1, minWidth: 0 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{a.omschrijving}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{a.userNaam}</div>
                </div>
                <span style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap', flexShrink:0 }}>{formatAuditDatum(a.datum)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 8 }} />
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

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['beheerder']}>
      <AdminPageContent />
    </ProtectedRoute>
  );
}
