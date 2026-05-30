'use client';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { BottomNav } from '@/components/ui/BottomNav';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

export default function HallOfFamePage() {
  return (
    <PageWrapper>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(240,192,96,0.10) 0%,transparent 70%)' }} />
      </div>

      {/* Hero */}
      <div className="relative z-10 px-6 pt-[max(16px,env(safe-area-inset-top))] pb-8 text-center">
        <Link href="/ranglijst" className="w-9 h-9 rounded-[11px] bg-[rgba(255,255,255,0.08)] border border-[rgba(74,158,255,0.13)] flex items-center justify-center text-lg mb-6">←</Link>
        <div className="text-[56px] mb-4">🏆</div>
        <h1 className="font-serif text-[36px] tracking-[-1px] text-[#f0c060] mb-2">Hall of Fame</h1>
        <p className="text-[14px] text-[#7a9ab8]">De legendarische prestaties van LottoClub</p>
      </div>

      {/* Records */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">All-time records</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: '💰', cat: 'Hoogste uitbetaling', naam: 'Jenny Smit', value: '€250', sub: 'Ronde 8 · 2025' },
            { emoji: '🎯', cat: 'Meeste goed ooit', naam: 'Jan de Boer', value: '5 goed', sub: 'Ronde 14 · 2025' },
            { emoji: '🔥', cat: 'Langste reeks', naam: 'Neeltje Visser', value: '8 rondes', sub: '≥3 goed op rij' },
            { emoji: '🏆', cat: 'Meeste overwinningen', naam: 'Jenny Smit', value: '12 keer', sub: '2024 + 2025' },
          ].map((r) => (
            <Card key={r.cat} variant="gold" className="p-[18px] text-center">
              <div className="text-[28px] mb-[10px]">{r.emoji}</div>
              <div className="text-[10px] font-semibold tracking-[1px] uppercase text-[#7a9ab8] mb-1">{r.cat}</div>
              <div className="text-[16px] font-bold text-white mb-1">{r.naam}</div>
              <div className="text-[13px] font-semibold text-[#f0c060]">{r.value}</div>
              <div className="text-[11px] text-[#7a9ab8] mt-0.5">{r.sub}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Beste moment */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Legendarisch moment</div>
        <Card variant="accent" className="p-5">
          <div className="text-[11px] font-semibold tracking-[1px] uppercase text-[#4a9eff] mb-3">🌟 Grootste trekking ooit</div>
          <h3 className="font-serif text-[20px] tracking-[-0.3px] mb-2">Jenny Smit · 5 goed · Ronde 8</h3>
          <p className="text-[13px] text-[#7a9ab8] leading-relaxed mb-4">Op 22 maart 2025 raadde Jenny Smit 5 van de 6 getrokken nummers correct. De pot stond op €312 — de grootste uitbetaling ooit.</p>
          <div className="flex gap-[6px] flex-wrap">
            {[7,14,19,23,31,38].map((n,i) => (
              <div key={n} className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11px] font-bold ${i!==2 ? 'bg-gradient-to-br from-[#f0c060] to-[#d4a030] text-[#0d1b2a]' : 'bg-[#1a2f45] border border-[rgba(74,158,255,0.2)] text-white'}`}>{n}</div>
            ))}
          </div>
        </Card>
      </div>

      {/* HOF lijst */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">All-time top deelnemers</div>
        {[
          { medal: '🥇', emoji: '👩', naam: 'Jenny Smit', wins: 12, verdiend: '€475', gem: '3.8', punten: 124, gold: true },
          { medal: '🥈', emoji: '👩‍🦱', naam: 'Neeltje Visser', wins: 7, verdiend: '€225', gem: '3.4', punten: 108, gold: false },
          { medal: '🥉', emoji: '👨', naam: 'Jan de Boer', wins: 5, verdiend: '€150', gem: '3.1', punten: 96, gold: false },
        ].map((h) => (
          <Link key={h.naam} href="/profiel">
            <div className={`rounded-[18px] p-[16px_18px] flex items-center gap-3 mb-[10px] ${h.gold ? 'bg-[linear-gradient(135deg,rgba(240,192,96,0.08)_0%,#132233_100%)] border border-[rgba(240,192,96,0.2)]' : 'bg-[#132233] border border-[rgba(74,158,255,0.13)]'}`}>
              <span className="text-[24px] w-9 text-center flex-shrink-0">{h.medal}</span>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[22px] border-2 flex-shrink-0 ${h.gold ? 'border-[rgba(240,192,96,0.4)]' : 'border-[rgba(74,158,255,0.13)]'} bg-[#1a2f45]`}>{h.emoji}</div>
              <div className="flex-1">
                <div className="text-[15px] font-bold mb-1">{h.naam}</div>
                <div className="flex gap-[10px] flex-wrap">
                  <span className="text-[11px] text-[#7a9ab8]">🏆 <span className="text-white font-semibold">{h.wins}</span> overwinningen</span>
                  <span className="text-[11px] text-[#7a9ab8]">💶 <span className="text-white font-semibold">{h.verdiend}</span></span>
                  <span className="text-[11px] text-[#7a9ab8]">🎯 gem. <span className="text-white font-semibold">{h.gem}</span></span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[20px] font-black text-[#f0c060] tracking-[-0.5px]">{h.punten}</div>
                <div className="text-[10px] text-[#7a9ab8]">all-time pt</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Club stats */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Club statistieken all-time</div>
        <div className="grid grid-cols-3 gap-[10px]">
          {[
            { value: '87', label: 'Rondes' },
            { value: '€3.480', label: 'Ingelegd', color: 'text-[#f0c060]' },
            { value: '€850', label: 'Uitbetaald', color: 'text-[#34c97a]' },
            { value: '3', label: 'Seizoenen', color: 'text-[#4a9eff]' },
            { value: '19', label: 'Max. leden' },
            { value: '5', label: 'Hoogste score', color: 'text-[#f0c060]' },
          ].map((s) => (
            <Card key={s.label} className="p-[14px_10px] text-center">
              <div className={`text-[20px] font-bold tracking-[-0.5px] ${s.color || 'text-white'}`}>{s.value}</div>
              <div className="text-[10px] text-[#7a9ab8] mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav items={navItems} />
    </PageWrapper>
  );
}
