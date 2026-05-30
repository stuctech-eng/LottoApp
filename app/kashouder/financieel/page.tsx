'use client';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { BottomNav } from '@/components/ui/BottomNav';

const navItems = [
  { href: '/kashouder', icon: '🏠', label: 'Dashboard' },
  { href: '/kas', icon: '📒', label: 'Kasboek' },
  { href: '/kashouder/financieel', icon: '💰', label: 'Financieel' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/leden', icon: '👥', label: 'Leden' },
];

export default function FinancieelPage() {
  return (
    <PageWrapper>
      <div className="flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-5">
        <div>
          <div className="text-[12px] text-[#34c97a] font-semibold mb-1">⚡ Kashouder</div>
          <h1 className="font-serif text-[28px] tracking-[-0.5px]">Financieel</h1>
        </div>
        <Link href="/kashouder">
          <button className="w-10 h-10 rounded-[13px] bg-[#132233] border border-[rgba(74,158,255,0.13)] flex items-center justify-center text-lg">←</button>
        </Link>
      </div>

      {/* Overzicht */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Overzicht deze maand</div>
        <div className="grid grid-cols-2 gap-[10px]">
          {[
            { label: 'Totale pot', value: '€1.247', color: 'text-[#f0c060]', sub: 'Seizoen 2026' },
            { label: 'Ontvangen mei', value: '+€136', color: 'text-[#34c97a]', sub: '2 rondes' },
            { label: 'Uitbetaald mei', value: '−€50', color: 'text-[#ff5a5a]', sub: '2 winnaars' },
            { label: 'Openstaand', value: '€12', color: 'text-white', sub: '3 leden' },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-[11px] uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">{s.label}</div>
              <div className={`font-serif text-[26px] tracking-[-0.8px] ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-[#7a9ab8] mt-1">{s.sub}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Uitbetaling */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Uitbetaling registreren</div>
        <Card className="p-5">
          {[['Winnaar','select'],['Bedrag','number'],['Ronde','select'],['Opmerking','text']].map(([l,t]) => (
            <div key={String(l)} className="mb-3">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">{l}</label>
              {t === 'select'
                ? <select className="w-full bg-[#0f1e2e] border border-[rgba(74,158,255,0.13)] rounded-[13px] px-4 py-[13px] text-[15px] text-white outline-none">
                    <option>{l === 'Winnaar' ? 'Selecteer lid…' : 'Ronde 22 — 31 mei 2026'}</option>
                    {l === 'Winnaar' && <><option>Jenny Smit</option><option>Neeltje Visser</option></>}
                  </select>
                : <input type={String(t)} placeholder={l === 'Bedrag' ? '€25,00' : 'Bijv. contant uitbetaald'}
                    className="w-full bg-[#0f1e2e] border border-[rgba(74,158,255,0.13)] rounded-[13px] px-4 py-[13px] text-[15px] text-white outline-none focus:border-[#34c97a] transition-colors" />
              }
            </div>
          ))}
          <button className="w-full text-white font-semibold rounded-[14px] py-4 text-[15px]" style={{ background: 'linear-gradient(135deg,#34c97a 0%,#1a8a50 100%)' }}>💸 Uitbetaling registreren</button>
        </Card>
      </div>

      {/* Correctie */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Kascorrectie</div>
        <Card className="p-5">
          {[['Type correctie','select'],['Bedrag','number'],['Reden','text']].map(([l,t]) => (
            <div key={String(l)} className="mb-3">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">{l}</label>
              {t === 'select'
                ? <select className="w-full bg-[#0f1e2e] border border-[rgba(74,158,255,0.13)] rounded-[13px] px-4 py-[13px] text-[15px] text-white outline-none"><option>+ Toevoeging</option><option>− Aftrek</option></select>
                : <input type={String(t)} placeholder={l === 'Bedrag' ? '€0,00' : 'Omschrijving correctie…'}
                    className="w-full bg-[#0f1e2e] border border-[rgba(74,158,255,0.13)] rounded-[13px] px-4 py-[13px] text-[15px] text-white outline-none focus:border-[#ffaa33] transition-colors" />
              }
            </div>
          ))}
          <button className="w-full text-[#0d1b2a] font-bold rounded-[14px] py-4 text-[15px]" style={{ background: 'linear-gradient(135deg,#ffaa33 0%,#c07000 100%)' }}>⚖️ Correctie doorvoeren</button>
        </Card>
      </div>

      <BottomNav items={navItems} accentColor="green" />
    </PageWrapper>
  );
}
