'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomNav } from '@/components/ui/BottomNav';
import { mockLeden } from '@/lib/mock-data';

const navItems = [
  { href: '/beheerder', icon: '🏠', label: 'Dashboard' },
  { href: '/leden', icon: '👥', label: 'Leden' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/beheerder/admin', icon: '⚙️', label: 'Beheer' },
];

const rolColors: Record<string, 'blue'|'green'|'gold'> = { lid: 'blue', kashouder: 'green', beheerder: 'gold' };
const emojis = ['👩‍🦱','👩','👨','👩‍🦰','🧔','👦','👴'];

export default function LedenPage() {
  const [zoek, setZoek] = useState('');
  const [filter, setFilter] = useState('Alle');

  const filters = ['Alle', 'Actief', 'Betaald', 'Niet betaald'];
  const gefilterd = mockLeden.filter(l => l.naam.toLowerCase().includes(zoek.toLowerCase()));

  return (
    <PageWrapper>
      <div className="flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4">
        <h1 className="font-serif text-[28px] tracking-[-0.5px]">Leden</h1>
        <button className="h-10 px-4 rounded-[13px] bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white text-[13px] font-semibold">+ Lid</button>
      </div>

      <div className="px-5 mb-4">
        <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="🔍 Zoek lid…"
          className="w-full bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[14px] px-4 py-[13px] text-[15px] text-white placeholder-[#7a9ab8] outline-none focus:border-[#4a9eff] transition-colors" />
      </div>

      <div className="flex gap-2 px-5 mb-5 overflow-x-auto scrollbar-none">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-[14px] py-[7px] rounded-full text-[12px] font-medium border ${filter === f ? 'bg-[#1e3a5f] border-[rgba(74,158,255,0.35)] text-[#4a9eff]' : 'bg-[#132233] border-[rgba(74,158,255,0.13)] text-[#7a9ab8]'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex gap-[10px] px-5 mb-5">
        {[['17','Totaal'],['14','Betaald'],['3','Open'],['2','Inactief']].map(([v,l],i) => (
          <div key={l} className={`flex-1 bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[13px] p-3 text-center`}>
            <div className={`text-[18px] font-bold ${i===1?'text-[#34c97a]':i===2?'text-[#ffaa33]':''}`}>{v}</div>
            <div className="text-[10px] text-[#7a9ab8] mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="px-5 flex flex-col gap-[10px] mb-4">
        {gefilterd.map((lid, i) => (
          <Link key={lid.id} href="/profiel">
            <div className={`bg-[#132233] border rounded-[16px] p-[14px_16px] flex items-center gap-3 ${i < 3 ? 'border-l-4' : 'border-[rgba(74,158,255,0.13)]'} ${i===0?'border-l-[#f0c060] border-[rgba(240,192,96,0.13)]':i===1?'border-l-[#c0c8d0] border-[rgba(192,200,208,0.13)]':i===2?'border-l-[#c08050] border-[rgba(192,128,80,0.13)]':'border-[rgba(74,158,255,0.13)]'}`}>
              <div className="relative flex-shrink-0">
                <div className="w-[42px] h-[42px] rounded-full bg-[#1a2f45] flex items-center justify-center text-[18px]">{emojis[i % emojis.length]}</div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-[#0d1b2a] ${i < 4 ? 'bg-[#34c97a]' : 'bg-[#ffaa33]'}`} />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold flex items-center gap-2">
                  {i < 3 && <span>{['🥇','🥈','🥉'][i]}</span>}
                  {lid.naam}
                </div>
                <div className="text-[11px] text-[#7a9ab8] mt-0.5">{lid.ranglijstPunten} pt · {lid.lidSinds}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={rolColors[lid.rol]}>{lid.rol}</Badge>
                <span className={`text-[11px] font-semibold ${i < 4 ? 'text-[#34c97a]' : 'text-[#ffaa33]'}`}>{i < 4 ? '✓ betaald' : '⏳ open'}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav items={navItems} accentColor="gold" />
    </PageWrapper>
  );
}
