'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeAuditLog } from '@/lib/firestore-audit';
import { subscribePaymentConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/firestore-payment-config';
import { subscribeSpelConfig, subscribePrijsConfig, DEFAULT_SPELCONFIG, DEFAULT_PRIJSCONFIG } from '@/lib/firestore-spelconfig';
import { subscribeAlleSeizoenen, subscribeSeizoen, maakSeizoen, sluitSeizoen } from '@/lib/firestore-seizoenen';
import { PAYMENT_PROVIDERS } from '@/lib/providers/payments';
import { AuditLogEntry, PaymentConfig, SpelConfig, PrijsConfig, Seizoen } from '@/lib/types';

const NAV = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer', active: true },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

type Tab = 'instellingen'|'spel'|'prijzen'|'seizoen'|'audit';

function AdminPageContent() {
  const [tab, setTab] = useState<Tab>('instellingen');
  const [toggles, setToggles] = useState({ bewijs:true, notif:true, herinner:true, winnaar:true });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [spelConfig, setSpelConfig] = useState<SpelConfig>(DEFAULT_SPELCONFIG);
  const [prijsConfig, setPrijsConfig] = useState<PrijsConfig>(DEFAULT_PRIJSCONFIG);
  const [seizoenen, setSeizoenen] = useState<Seizoen[]>([]);
  const [actiefsSeizoen, setActiefSeizoen] = useState<Seizoen | null>(null);
  const [nieuwSeizoenNaam, setNieuwSeizoenNaam] = useState('');
  const [spelBezig, setSpelBezig] = useState(false);
  const [spelOk, setSpelOk] = useState(false);

  // Tikkie-link state
  const [tikkieLink, setTikkieLink] = useState('');
  const [tikkieBezig, setTikkieBezig] = useState(false);
  const [tikkieOk, setTikkieOk] = useState(false);
  const [tikkieError, setTikkieError] = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeAuditLog(setAuditLog, 50);
    const u2 = subscribePaymentConfig((config) => {
      setPaymentConfig(config);
      // Laad Tikkie-link uit paymentConfig indien aanwezig
      const cfg = config as PaymentConfig & { tikkieLink?: string };
      setTikkieLink(cfg.tikkieLink ?? '');
    });
    const u3 = subscribeSpelConfig(setSpelConfig);
    const u4 = subscribePrijsConfig(setPrijsConfig);
    const u5 = subscribeAlleSeizoenen(setSeizoenen);
    const u6 = subscribeSeizoen(setActiefSeizoen);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
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

  /**
   * Valideert of de ingevoerde tekst een kale, geldige URL is.
   *
   * BELANGRIJK — waarom dit nodig is:
   * Bij het kopiëren vanuit Tikkie wordt vaak de hele berichttekst
   * meegekopieerd ("Wil je mij alsjeblieft €4.00 betalen voor... via
   * https://tikkie.me/pay/xxx. Deze link is geldig t/m..."), niet
   * alleen de URL zelf. Als die hele tekst wordt opgeslagen, geeft de
   * Tikkie-knop op /betalen een 404 omdat de browser probeert te
   * navigeren naar een ongeldige "URL" die met platte tekst begint.
   * Deze validatie vangt dat af voordat het wordt opgeslagen.
   */
  function valideerTikkieUrl(input: string): string | null {
    const waarde = input.trim();
    if (!waarde) return null; // leeg is toegestaan (link uitschakelen)
    try {
      const url = new URL(waarde);
      if (url.protocol !== 'https:') {
        return 'Link moet beginnen met https://';
      }
      if (waarde.includes(' ')) {
        return 'Link mag geen spaties bevatten — plak alleen de URL, niet de hele Tikkie-tekst';
      }
      return null; // geldig
    } catch {
      return 'Dit is geen geldige link. Plak alleen de URL (bijv. https://tikkie.me/pay/...), niet de hele Tikkie-berichttekst';
    }
  }

  const handleTikkie = async () => {
    const fout = valideerTikkieUrl(tikkieLink);
    if (fout) {
      setTikkieError(fout);
      return;
    }
    setTikkieError(null);
    setTikkieBezig(true);
    try {
      await setDoc(doc(db, 'paymentConfig', 'main'), { tikkieLink: tikkieLink.trim() }, { merge: true });
      setTikkieOk(true);
      setTimeout(() => setTikkieOk(false), 2000);
    } finally {
      setTikkieBezig(false);
    }
  };

  const handleMaakSeizoen = async () => {
    const naam = nieuwSeizoenNaam.trim() || `Seizoen ${new Date().getFullYear()}`;
    await maakSeizoen(naam);
    setNieuwSeizoenNaam('');
  };

  const auditIcon: Record<string, string> = {
    gebruiker_aangemaakt: '👤', gebruiker_verwijderd: '🗑️',
    ticket_toegevoegd: '🎱', ticket_gewijzigd: '🎱', ticket_verwijderd: '🎱',
    rol_gewijzigd: '🔑',
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

  const tabs: {id:Tab,label:string}[] = [{id:'instellingen',label:'⚙️ Instellingen'},{id:'spel',label:'🎱 Spel'},{id:'prijzen',label:'💰 Prijzen'},{id:'seizoen',label:'🏆 Seizoen'},{id:'audit',label:'📋 Audit log'}];

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 2 }}>👑 Beheerder</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 6 }}>Admin</div>
          <span className="badge badge-gold">⚙️ Systeembeheer</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', overflowX: 'auto', marginBottom: 20 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: '9px 16px', fontSize: 13, fontWeight: 500, color: tab===t.id?'var(--gold)':'var(--muted)', border: 'none', borderBottom: `2px solid ${tab===t.id?'var(--gold)':'transparent'}`, background: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </div>

        {/* INSTELLINGEN */}
        {tab==='instellingen' && (
          <div style={{ padding: '0 20px' }}>
            {[{title:'Vereniging',rows:[{icon:'🎱',bg:'var(--gold-soft)',label:'Naam vereniging',sub:'LottoClub'},{icon:'💶',bg:'var(--accent-soft)',label:'Standaard inleg',sub:'€4,00'},{icon:'⚡',bg:'var(--success-soft)',label:'Kashouder',sub:'—'}]}].map(section => (
              <div key={section.title} style={{ marginBottom: 20 }}>
                <div className="section-title">{section.title}</div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {section.rows.map((r,i,arr) => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i<arr.length-1?'1px solid rgba(74,158,255,0.06)':'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{r.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{r.sub}</div>
                      </div>
                      <span style={{ fontSize: 16, color: 'var(--muted)' }}>›</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

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

            {/* Tikkie-link instelling */}
            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Tikkie-link</div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Voeg hier de Tikkie-link in van de kashouder. Deze wordt automatisch toegevoegd aan WhatsApp-herinneringen zodat leden direct kunnen betalen.
                </div>
                <label className="form-label">Tikkie-link</label>
                <input
                  type="url"
                  inputMode="url"
                  className="form-input"
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
                {tikkieLink && (
                  <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 12, wordBreak: 'break-all' }}>
                    ✓ Link ingesteld: {tikkieLink}
                  </div>
                )}
                <button
                  onClick={handleTikkie}
                  disabled={tikkieBezig}
                  style={{ width: '100%', background: tikkieOk ? 'linear-gradient(135deg,var(--success),#1a8a50)' : 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: tikkieBezig ? 0.6 : 1 }}
                >
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
            <div className="section-title">Prijsverdeling</div>
            <div className="card" style={{ padding: 18 }}>
              <label className="form-label">Modus</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {([['hoogste_score_wint','🏆 Hoogste score wint (standaard)'],['meerdere_winnaars','👥 Meerdere winnaars'],['vaste_prijzen','💰 Vaste prijzen per score']] as const).map(([modus, label]) => (
                  <div key={modus} onClick={() => setPrijsConfig(p => ({...p, modus}))} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${prijsConfig.modus === modus ? 'var(--accent)' : 'var(--border)'}`, background: prijsConfig.modus === modus ? 'var(--accent-soft)' : 'var(--surface2)', cursor: 'pointer' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--white)' }}>{label}</span>
                    {prijsConfig.modus === modus && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                Prijsconfiguratie wordt opgeslagen via de spelConfig. Neem contact op met de beheerder voor geavanceerde prijsinstellingen.
              </div>
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
