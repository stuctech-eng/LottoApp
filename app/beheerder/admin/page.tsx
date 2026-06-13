'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import Link from 'next/link';

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
            {[{title:'Vereniging',rows:[{icon:'🎱',bg:'var(--gold-soft)',label:'Naam vereniging',sub:'LottoClub'},{icon:'💶',bg:'var(--accent-soft)',label:'Inleg per ronde',sub:'€4,00'},{icon:'⚡',bg:'var(--success-soft)',label:'Kashouder',sub:'Marco Visser'}]},{title:'Betalingen',rows:[{icon:'💳',bg:'var(--accent-soft)',label:'Mollie iDEAL',sub:'API gekoppeld'},{icon:'⏰',bg:'var(--warning-soft)',label:'Betalingsdeadline',sub:'Vrijdag 18:00'}]}].map(section => (
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
              {[['Naam spel','text','Nederlandse Lotto'],['Aantal getallen','number','6'],['Min. getal','number','1'],['Max. getal','number','45']].map(([l,t,v]) => (
                <div key={String(l)}>
                  <label className="form-label">{String(l)}</label>
                  <input type={String(t)} defaultValue={String(v)} className="form-input" />
                </div>
              ))}
              <button style={{ width:'100%', background:'linear-gradient(135deg,var(--gold),#c08820)', color:'var(--navy)', border:'none', borderRadius:13, padding:14, fontSize:14, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>💾 Opslaan</button>
            </div>
          </div>
        )}

        {/* PRIJZEN */}
        {tab==='prijzen' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Prijsverdeling</div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 13, overflow: 'hidden', marginBottom: 14 }}>
                {[[2,'€0'],[3,'€10'],[4,'€25'],[5,'€250'],[6,'Jackpot']].map(([g,b],i,arr) => (
                  <div key={String(g)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom: i<arr.length-1?'1px solid rgba(74,158,255,0.06)':'none' }}>
                    <span style={{ fontSize:14, fontWeight:600 }}>🎯 {g} goed</span>
                    <input defaultValue={String(b)} style={{ width:80, background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:10, padding:'7px 10px', fontSize:14, fontWeight:600, color:'var(--gold)', fontFamily:"'DM Sans',sans-serif", outline:'none', textAlign:'center' }} />
                  </div>
                ))}
              </div>
              <button style={{ width:'100%', background:'linear-gradient(135deg,var(--gold),#c08820)', color:'var(--navy)', border:'none', borderRadius:13, padding:14, fontSize:14, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>💾 Prijzen opslaan</button>
            </div>
          </div>
        )}

        {/* SEIZOEN */}
        {tab==='seizoen' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Seizoenen</div>
            <div style={{ background:'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border:'1px solid rgba(240,192,96,0.2)', borderRadius:18, padding:'16px 18px', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontSize:16, fontWeight:700 }}>🏆 Seizoen 2026</span>
                <span className="badge badge-green">● Actief</span>
              </div>
              <div style={{ display:'flex', gap:16, marginBottom:14 }}>
                {[['22','Rondes'],['17','Leden'],['€1.247','Pot']].map(([v,l]) => (
                  <div key={l}><div style={{ fontSize:14, fontWeight:600, color:'var(--gold)' }}>{v}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{l}</div></div>
                ))}
              </div>
              <button style={{ width:'100%', background:'linear-gradient(135deg,#ff5a5a,#aa0000)', color:'white', border:'none', borderRadius:13, padding:13, fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>⛔ Seizoen afsluiten</button>
            </div>
            <div style={{ background:'linear-gradient(135deg,rgba(52,201,122,0.06),var(--surface))', border:'1px solid rgba(52,201,122,0.18)', borderRadius:18, padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ fontSize:16, fontWeight:700 }}>✨ Seizoen 2027</span>
                <span className="badge badge-muted">Nog niet gestart</span>
              </div>
              <button style={{ width:'100%', background:'linear-gradient(135deg,var(--success),#1a8a50)', color:'white', border:'none', borderRadius:13, padding:13, fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>🚀 Nieuw seizoen starten</button>
            </div>
          </div>
        )}

        {/* AUDIT */}
        {tab==='audit' && (
          <div style={{ padding: '0 20px' }}>
            <div className="section-title">Alle systeem activiteit</div>
            {[{icon:'✅',actie:'Betaling goedgekeurd — Rob de Vries',meta:'Marco Visser · Kashouder',tijd:'14:22 · vandaag'},{icon:'🔔',actie:'Betaalverzoeken verstuurd — ronde 22',meta:'Systeem · 17 leden',tijd:'09:00 · vandaag'},{icon:'💸',actie:'Uitbetaling geregistreerd — Jenny Smit €25',meta:'Marco Visser · Kashouder',tijd:'24 mei'},{icon:'🎱',actie:'Trekking ronde 21 ingevoerd en verwerkt',meta:'Sandra Bakker · Beheerder',tijd:'24 mei'},{icon:'📈',actie:'Ranglijst bijgewerkt — ronde 21',meta:'Systeem · automatisch',tijd:'24 mei'},{icon:'👤',actie:'Lid toegevoegd — Tim Hoekstra',meta:'Sandra Bakker · Beheerder',tijd:'1 mei'},{icon:'⚖️',actie:'Kascorrectie +€4',meta:'Marco Visser · Kashouder',tijd:'20 apr'},{icon:'⚙️',actie:'Spelconfiguratie gewijzigd',meta:'Sandra Bakker · Beheerder',tijd:'1 jan'}].map(a => (
              <div key={a.actie} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{a.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{a.actie}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{a.meta}</div>
                </div>
                <span style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap', flexShrink:0 }}>{a.tijd}</span>
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
