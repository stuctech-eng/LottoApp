'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomNav } from '@/components/ui/BottomNav';

const navItems = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer' },
];

type Tab = 'instellingen' | 'spel' | 'prijzen' | 'seizoen' | 'audit';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('instellingen');
  const [toggles, setToggles] = useState({ bewijs: true, notif: true, herinner: true, winnaar: true });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'instellingen', label: '⚙️ Instellingen' },
    { id: 'spel', label: '🎱 Spel' },
    { id: 'prijzen', label: '💰 Prijzen' },
    { id: 'seizoen', label: '🏆 Seizoen' },
    { id: 'audit', label: '📋 Audit log' },
  ];

  const Toggle = ({ k }: { k: keyof typeof toggles }) => (
    <button onClick={() => setToggles(t => ({ ...t, [k]: !t[k] }))}
      className={`w-11 h-[26px] rounded-full border relative transition-colors flex-shrink-0 ${toggles[k] ? 'bg-[#4a9eff] border-[#4a9eff]' : 'bg-[#1a2f45] border-[rgba(74,158,255,0.13)]'}`}>
      <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform ${toggles[k] ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
    </button>
  );

  return (
    <PageWrapper>
      <div className="px-6 pt-[max(16px,env(safe-area-inset-top))] pb-5">
        <div className="text-[12px] text-[#f0c060] font-semibold mb-1">👑 Beheerder</div>
        <h1 className="font-serif text-[28px] tracking-[-0.5px] mb-1">Admin</h1>
        <div className="inline-flex items-center gap-1 bg-[#2a2010] border border-[rgba(240,192,96,0.3)] text-[#f0c060] text-[11px] font-semibold px-[10px] py-1 rounded-full">⚙️ Systeembeheer</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(74,158,255,0.13)] px-5 mb-5 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-[18px] py-[9px] text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'text-[#f0c060] border-[#f0c060]' : 'text-[#7a9ab8] border-transparent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* INSTELLINGEN */}
      {tab === 'instellingen' && (
        <div className="px-5 space-y-5">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Vereniging</div>
            <Card className="overflow-hidden">
              {[['🎱','gold','Naam vereniging','LottoClub'],['💶','blue','Inleg per ronde','€4,00'],['⚡','green','Kashouder','Marco Visser']].map(([icon,c,l,v]) => (
                <div key={String(l)} className="flex items-center gap-3 px-[18px] py-4 border-b border-[rgba(74,158,255,0.06)] last:border-0">
                  <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center text-[17px] ${c==='gold'?'bg-[#2a2010]':c==='blue'?'bg-[#1e3a5f]':'bg-[#0d2a1a]'}`}>{icon}</div>
                  <div className="flex-1"><div className="text-[14px] font-medium">{l}</div><div className="text-[11px] text-[#7a9ab8]">{v}</div></div>
                  <span className="text-[16px] text-[#7a9ab8]">›</span>
                </div>
              ))}
            </Card>
          </div>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Betalingen</div>
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 px-[18px] py-4 border-b border-[rgba(74,158,255,0.06)]">
                <div className="w-9 h-9 rounded-[11px] bg-[#1e3a5f] flex items-center justify-center text-[17px]">💳</div>
                <div className="flex-1"><div className="text-[14px] font-medium">Mollie iDEAL</div><div className="text-[11px] text-[#7a9ab8]">API gekoppeld</div></div>
                <Badge variant="green">✓ Actief</Badge>
              </div>
              <div className="flex items-center gap-3 px-[18px] py-4 border-b border-[rgba(74,158,255,0.06)]">
                <div className="w-9 h-9 rounded-[11px] bg-[#2a1c00] flex items-center justify-center text-[17px]">⏰</div>
                <div className="flex-1"><div className="text-[14px] font-medium">Betalingsdeadline</div><div className="text-[11px] text-[#7a9ab8]">Vrijdag 18:00</div></div>
                <span className="text-[16px] text-[#7a9ab8]">›</span>
              </div>
              <div className="flex items-center gap-3 px-[18px] py-4">
                <div className="w-9 h-9 rounded-[11px] bg-[#2a1c00] flex items-center justify-center text-[17px]">📷</div>
                <div className="flex-1"><div className="text-[14px] font-medium">Betaalbewijs toestaan</div><div className="text-[11px] text-[#7a9ab8]">Handmatige verificatie</div></div>
                <Toggle k="bewijs" />
              </div>
            </Card>
          </div>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Notificaties</div>
            <Card className="overflow-hidden">
              {[['🔔','purple','notif','Betaalverzoeken versturen'],['📩','purple','herinner','Herinneringen'],['🏆','blue','winnaar','Winnaar notificatie']].map(([icon,c,k,l]) => (
                <div key={k} className="flex items-center gap-3 px-[18px] py-4 border-b border-[rgba(74,158,255,0.06)] last:border-0">
                  <div className={`w-9 h-9 rounded-[11px] ${c==='purple'?'bg-[#1e1535]':'bg-[#1e3a5f]'} flex items-center justify-center text-[17px]`}>{icon}</div>
                  <div className="flex-1 text-[14px] font-medium">{l}</div>
                  <Toggle k={k as keyof typeof toggles} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* SPEL */}
      {tab === 'spel' && (
        <div className="px-5 space-y-5">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Spelconfiguratie</div>
            <Card className="p-5">
              {[['Naam spel','text','Nederlandse Lotto'],['Aantal getallen','number','6'],['Min. getal','number','1'],['Max. getal','number','45']].map(([l,t,v]) => (
                <div key={String(l)} className="mb-3">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">{l}</label>
                  <input type={String(t)} defaultValue={String(v)}
                    className="w-full bg-[#0f1e2e] border border-[rgba(74,158,255,0.13)] rounded-[13px] px-4 py-[13px] text-[15px] text-white outline-none focus:border-[#f0c060] transition-colors" />
                </div>
              ))}
              <button className="w-full text-[#0d1b2a] font-bold rounded-[13px] py-[15px] text-[14px]" style={{ background: 'linear-gradient(135deg,#f0c060 0%,#c08820 100%)' }}>💾 Opslaan</button>
            </Card>
          </div>
        </div>
      )}

      {/* PRIJZEN */}
      {tab === 'prijzen' && (
        <div className="px-5 space-y-5">
          <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Prijsverdeling</div>
          <Card className="p-5">
            <div className="bg-[#0f1e2e] rounded-[13px] overflow-hidden mb-4">
              {[[2,'€0'],[3,'€10'],[4,'€25'],[5,'€250'],[6,'Jackpot']].map(([g,b]) => (
                <div key={g} className="flex items-center justify-between px-4 py-3 border-b border-[rgba(74,158,255,0.06)] last:border-0">
                  <span className="text-[14px] font-semibold">🎯 {g} goed</span>
                  <input defaultValue={String(b)} className="w-20 bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[10px] py-2 px-[10px] text-[14px] font-semibold text-[#f0c060] text-center outline-none" />
                </div>
              ))}
            </div>
            <button className="w-full text-[#0d1b2a] font-bold rounded-[13px] py-[15px] text-[14px]" style={{ background: 'linear-gradient(135deg,#f0c060 0%,#c08820 100%)' }}>💾 Prijzen opslaan</button>
          </Card>
        </div>
      )}

      {/* SEIZOEN */}
      {tab === 'seizoen' && (
        <div className="px-5 space-y-3">
          <Card variant="gold" className="p-[18px_20px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[16px] font-bold">🏆 Seizoen 2026</span>
              <Badge variant="green">● Actief</Badge>
            </div>
            <div className="flex gap-4 mb-4">
              {[['22','Rondes'],['17','Leden'],['€1.247','Pot']].map(([v,l]) => (
                <div key={l}><div className="text-[15px] font-semibold text-[#f0c060]">{v}</div><div className="text-[11px] text-[#7a9ab8]">{l}</div></div>
              ))}
            </div>
            <button className="w-full text-white font-semibold rounded-[13px] py-[14px] text-[14px]" style={{ background: 'linear-gradient(135deg,#ff5a5a 0%,#aa0000 100%)' }}>⛔ Seizoen afsluiten</button>
          </Card>
          <Card className="p-[18px_20px] opacity-60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[16px] font-bold">🏆 Seizoen 2025</span>
              <Badge variant="muted">Gesloten</Badge>
            </div>
            <div className="flex gap-4">
              {[['52','Rondes'],['Jenny','Winnaar'],['€475','Uitbetaald']].map(([v,l]) => (
                <div key={l}><div className="text-[14px] font-semibold">{v}</div><div className="text-[11px] text-[#7a9ab8]">{l}</div></div>
              ))}
            </div>
          </Card>
          <div className="bg-[linear-gradient(135deg,rgba(52,201,122,0.06)_0%,#132233_100%)] border border-[rgba(52,201,122,0.18)] rounded-[18px] p-[18px_20px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[16px] font-bold">✨ Seizoen 2027</span>
              <Badge variant="muted">Nog niet gestart</Badge>
            </div>
            <button className="w-full text-white font-semibold rounded-[13px] py-[14px] text-[14px]" style={{ background: 'linear-gradient(135deg,#34c97a 0%,#1a8a50 100%)' }}>🚀 Nieuw seizoen starten</button>
          </div>
        </div>
      )}

      {/* AUDIT LOG */}
      {tab === 'audit' && (
        <div className="px-5 space-y-2">
          <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Alle systeem activiteit</div>
          {[
            { icon: '✅', actie: 'Betaling goedgekeurd — Rob de Vries', meta: 'Marco Visser · Kashouder', tijd: '14:22 · vandaag' },
            { icon: '🔔', actie: 'Betaalverzoeken verstuurd — ronde 22', meta: 'Systeem · 17 leden', tijd: '09:00 · vandaag' },
            { icon: '💸', actie: 'Uitbetaling geregistreerd — Jenny Smit €25', meta: 'Marco Visser · Kashouder', tijd: '24 mei' },
            { icon: '🎱', actie: 'Trekking ronde 21 ingevoerd en verwerkt', meta: 'Sandra Bakker · Beheerder', tijd: '24 mei' },
            { icon: '📈', actie: 'Ranglijst bijgewerkt — ronde 21', meta: 'Systeem · automatisch', tijd: '24 mei' },
            { icon: '👤', actie: 'Lid toegevoegd — Tim Hoekstra', meta: 'Sandra Bakker · Beheerder', tijd: '1 mei' },
            { icon: '⚖️', actie: 'Kascorrectie +€4', meta: 'Marco Visser · Kashouder', tijd: '20 apr' },
            { icon: '⚙️', actie: 'Spelconfiguratie gewijzigd', meta: 'Sandra Bakker · Beheerder', tijd: '1 jan' },
          ].map((a) => (
            <Card key={a.actie} className="p-[13px_16px] flex items-center gap-3">
              <span className="text-[16px] flex-shrink-0">{a.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-medium">{a.actie}</div>
                <div className="text-[11px] text-[#7a9ab8] mt-0.5">{a.meta}</div>
              </div>
              <span className="text-[11px] text-[#7a9ab8] whitespace-nowrap flex-shrink-0">{a.tijd}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="h-6" />
      <BottomNav items={navItems} accentColor="gold" />
    </PageWrapper>
  );
}
