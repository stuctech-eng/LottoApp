'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { BottomNav } from '@/components/ui/BottomNav';
import { mockKasmutaties } from '@/lib/mock-data';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const typeIcon: Record<string, string> = { inleg: '💳', uitbetaling: '🏆', correctie: '⚖️' };
const typeColor: Record<string, string> = { inleg: 'bg-[#0d2a1a]', uitbetaling: 'bg-[#2a0d0d]', correctie: 'bg-[#2a1c00]' };

export default function KasPage() {
  const [activeTab, setActiveTab] = useState('kasboek');
  const [activeFilter, setActiveFilter] = useState('Alles');

  const tabs = ['📒 Kasboek', '💳 Inleg', '💸 Uitbetalingen'];
  const filters = ['Alles', 'Mei 2026', 'April 2026', 'Maart 2026'];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-5">
        <h1 className="font-serif text-[28px] tracking-[-0.5px]">Kas & Kasboek</h1>
        <button className="w-10 h-10 rounded-[13px] bg-[#132233] border border-[rgba(74,158,255,0.13)] flex items-center justify-center text-lg">⬇️</button>
      </div>

      {/* Pot card */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-br from-[#1a3a5c] to-[#0f2438] border border-[rgba(74,158,255,0.22)] rounded-[22px] p-6 relative overflow-hidden">
          <div className="absolute top-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)' }} />
          <div className="text-[12px] font-semibold tracking-[1.5px] uppercase text-[#4a9eff] mb-2">💰 Huidige pot</div>
          <div className="font-serif text-[52px] tracking-[-2px] leading-none mb-1">€1.247</div>
          <div className="text-[13px] text-[#7a9ab8] mb-5">Seizoen 2026 · Ronde 22</div>
          <div className="flex gap-5">
            <div><div className="text-[16px] font-semibold text-[#34c97a]">+€136</div><div className="text-[11px] text-[#7a9ab8]">Ontvangen mei</div></div>
            <div><div className="text-[16px] font-semibold text-[#ff5a5a]">−€50</div><div className="text-[11px] text-[#7a9ab8]">Uitbetaald mei</div></div>
            <div><div className="text-[16px] font-semibold">17</div><div className="text-[11px] text-[#7a9ab8]">Deelnemers</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(74,158,255,0.13)] px-5 mb-1">
        {tabs.map((t) => {
          const key = t.includes('Kasboek') ? 'kasboek' : t.includes('Inleg') ? 'inleg' : 'uitbetaling';
          return (
            <button key={t} onClick={() => setActiveTab(key)}
              className={`flex-1 py-[10px] text-[14px] font-medium border-b-2 transition-colors ${activeTab === key ? 'text-[#4a9eff] border-[#4a9eff]' : 'text-[#7a9ab8] border-transparent'}`}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-5 py-4 overflow-x-auto scrollbar-none">
        {filters.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 px-[14px] py-[6px] rounded-full text-[12px] font-medium border ${activeFilter === f ? 'bg-[#1e3a5f] border-[rgba(74,158,255,0.35)] text-[#4a9eff]' : 'bg-[#132233] border-[rgba(74,158,255,0.13)] text-[#7a9ab8]'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Saldo bar */}
      <div className="mx-5 mb-5 bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[14px] p-[14px_18px] flex items-center justify-between">
        <span className="text-[13px] text-[#7a9ab8]">Huidig saldo digitale kas</span>
        <span className="text-[18px] font-bold text-[#f0c060]">€1.247,00</span>
      </div>

      {/* Mutaties */}
      <div className="px-5">
        <div className="text-[11px] font-semibold tracking-[1.2px] uppercase text-[#7a9ab8] mb-2 mt-2">Mei 2026</div>
        {mockKasmutaties.filter(m => m.datum.startsWith('2026-05')).map((m, i, arr) => (
          <div key={m.id}
            className={`bg-[#132233] px-5 py-[14px] flex items-center gap-[14px] ${i === 0 ? 'rounded-t-[16px]' : ''} ${i === arr.length - 1 ? 'rounded-b-[16px] mb-2' : 'border-b border-[rgba(74,158,255,0.06)]'}`}>
            <div className={`w-10 h-10 rounded-[12px] ${typeColor[m.type]} flex items-center justify-center text-[18px] flex-shrink-0`}>{typeIcon[m.type]}</div>
            <div className="flex-1">
              <div className="text-[14px] font-medium">{m.omschrijving}</div>
              <div className="text-[11px] text-[#7a9ab8] mt-0.5">{m.datum}</div>
            </div>
            <span className={`text-[16px] font-bold ${m.bedrag > 0 ? 'text-[#34c97a]' : 'text-[#ff5a5a]'}`}>{m.bedrag > 0 ? '+' : ''}€{Math.abs(m.bedrag)}</span>
          </div>
        ))}

        <div className="text-[11px] font-semibold tracking-[1.2px] uppercase text-[#7a9ab8] mb-2 mt-4">April 2026</div>
        {mockKasmutaties.filter(m => m.datum.startsWith('2026-04')).map((m, i, arr) => (
          <div key={m.id}
            className={`bg-[#132233] px-5 py-[14px] flex items-center gap-[14px] ${i === 0 ? 'rounded-t-[16px]' : ''} ${i === arr.length - 1 ? 'rounded-b-[16px] mb-2' : 'border-b border-[rgba(74,158,255,0.06)]'}`}>
            <div className={`w-10 h-10 rounded-[12px] ${typeColor[m.type]} flex items-center justify-center text-[18px] flex-shrink-0`}>{typeIcon[m.type]}</div>
            <div className="flex-1">
              <div className="text-[14px] font-medium">{m.omschrijving}</div>
              <div className="text-[11px] text-[#7a9ab8] mt-0.5">{m.datum}</div>
            </div>
            <span className={`text-[16px] font-bold ${m.bedrag > 0 ? 'text-[#34c97a]' : 'text-[#ff5a5a]'}`}>{m.bedrag > 0 ? '+' : ''}€{Math.abs(m.bedrag)}</span>
          </div>
        ))}
      </div>

      <div className="h-4" />
      <BottomNav items={navItems} />
    </PageWrapper>
  );
}
