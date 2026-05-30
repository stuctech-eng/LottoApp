'use client';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { BottomNav } from '@/components/ui/BottomNav';
import { mockLeden } from '@/lib/mock-data';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const rangData = [
  { pos: 1, emoji: '👩', naam: 'Jenny Smit', rondes: 22, wins: 5, punten: 52, trend: '= stabiel', trendColor: 'text-[#7a9ab8]', isMe: false },
  { pos: 2, emoji: '👩‍🦱', naam: 'Neeltje Visser', rondes: 22, wins: 3, punten: 48, trend: '↑ +1', trendColor: 'text-[#34c97a]', isMe: true },
  { pos: 3, emoji: '👨', naam: 'Jan de Boer', rondes: 21, wins: 2, punten: 43, trend: '= stabiel', trendColor: 'text-[#7a9ab8]', isMe: false },
  { pos: 4, emoji: '👩‍🦰', naam: 'Lisa van Dam', rondes: 20, wins: 1, punten: 38, trend: '↑ +2', trendColor: 'text-[#34c97a]', isMe: false },
  { pos: 5, emoji: '🧔', naam: 'Peter Janssen', rondes: 19, wins: 1, punten: 35, trend: '↓ −1', trendColor: 'text-[#ff5a5a]', isMe: false },
  { pos: 6, emoji: '👵', naam: 'Mia Koster', rondes: 22, wins: 0, punten: 33, trend: '= stabiel', trendColor: 'text-[#7a9ab8]', isMe: false },
  { pos: 7, emoji: '👴', naam: 'Henk Smeets', rondes: 22, wins: 0, punten: 31, trend: '↓ −2', trendColor: 'text-[#ff5a5a]', isMe: false },
  { pos: 8, emoji: '🧑', naam: 'Marco Visser', rondes: 22, wins: 0, punten: 29, trend: '= stabiel', trendColor: 'text-[#7a9ab8]', isMe: false },
];

const podiumColors = ['text-[#f0c060]', 'text-[#c0c8d0]', 'text-[#c08050]'];
const podiumBorder = ['border-[#f0c060]', 'border-[#c0c8d0]', 'border-[#c08050]'];
const podiumBg = ['bg-[rgba(240,192,96,0.2)]', 'bg-[rgba(192,200,208,0.12)]', 'bg-[rgba(192,128,80,0.12)]'];
const podiumH = ['h-16', 'h-12', 'h-9'];
const podiumOrder = [1, 0, 2]; // silver, gold, bronze

export default function RanglijstPage() {
  return (
    <PageWrapper>
      <div className="flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4">
        <h1 className="font-serif text-[28px] tracking-[-0.5px]">Ranglijst</h1>
        <Link href="/hall-of-fame">
          <button className="h-[38px] px-[14px] rounded-[13px] bg-[#2a2010] border border-[rgba(240,192,96,0.25)] text-[#f0c060] text-[13px] font-semibold">🏆 Hall of Fame</button>
        </Link>
      </div>

      {/* Seizoen chips */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto scrollbar-none">
        {['Seizoen 2026', 'Seizoen 2025', 'Seizoen 2024', 'All-time'].map((s, i) => (
          <div key={s} className={`flex-shrink-0 px-4 py-[7px] rounded-full text-[13px] font-medium cursor-pointer border ${i === 0 ? 'bg-[#1e3a5f] border-[rgba(74,158,255,0.35)] text-[#4a9eff]' : 'bg-[#132233] border-[rgba(74,158,255,0.13)] text-[#7a9ab8]'}`}>
            {s}
          </div>
        ))}
      </div>

      {/* Podium */}
      <div className="px-5 pb-7 flex items-end justify-center gap-[10px]">
        {podiumOrder.map((idx) => {
          const d = rangData[idx];
          const p = idx; // 0=gold,1=silver,2=bronze
          return (
            <div key={d.naam} className="flex flex-col items-center gap-2 flex-1">
              <div className={`rounded-full flex items-center justify-center text-[${p===0?'26':'22'}px] border-[3px] ${podiumBorder[p]} bg-[#1a2f45] relative ${p===0?'w-[72px] h-[72px]':p===1?'w-[60px] h-[60px]':'w-[56px] h-[56px]'}`}>
                {['👩','👩‍🦱','👨'][p]}
                {p === 0 && <div className="absolute -top-[14px] text-[18px]">👑</div>}
              </div>
              <div className="text-[13px] font-semibold text-center">{d.naam.split(' ')[0]}</div>
              <div className="text-[12px] text-[#7a9ab8] text-center">{d.punten} pt</div>
              <div className={`w-full ${podiumBg[p]} border border-[${podiumBorder[p].replace('border-','').replace('[','').replace(']','')}] rounded-[12px_12px_0_0] ${podiumH[p]} flex items-center justify-center`}>
                <span className={`text-[16px] font-black ${podiumColors[p]}`}>{p+1}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] px-5 mb-3">Volledige ranglijst</div>

      <div className="px-5 flex flex-col gap-2 mb-4">
        {rangData.map((d) => (
          <Link key={d.naam} href="/profiel">
            <div className={`rounded-[16px] p-[14px_16px] flex items-center gap-3 ${d.isMe ? 'bg-[#1e3a5f] border border-[rgba(74,158,255,0.3)]' : 'bg-[#132233] border border-[rgba(74,158,255,0.13)]'}`}>
              <span className={`text-[14px] font-bold w-6 text-center flex-shrink-0 ${d.pos===1?'text-[#f0c060]':d.pos===2?'text-[#c0c8d0]':d.pos===3?'text-[#c08050]':'text-[#7a9ab8]'}`}>{d.pos}</span>
              <div className="w-[38px] h-[38px] rounded-full bg-[#1a2f45] flex items-center justify-center text-[17px] flex-shrink-0">{d.emoji}</div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-white">{d.naam}{d.isMe && <span className="text-[12px] text-[#4a9eff] font-normal"> (jij)</span>}</div>
                <div className="text-[11px] text-[#7a9ab8] mt-0.5">{d.rondes} rondes · {d.wins}× gewonnen</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[17px] font-bold">{d.punten}</span>
                <span className={`text-[11px] font-semibold ${d.trendColor}`}>{d.trend}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav items={navItems} />
    </PageWrapper>
  );
}
