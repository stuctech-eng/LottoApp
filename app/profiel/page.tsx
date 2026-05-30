'use client';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomNav } from '@/components/ui/BottomNav';
import { TicketCard } from '@/components/lotto/TicketCard';
import { mockUser } from '@/lib/mock-data';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

export default function ProfielPage() {
  return (
    <PageWrapper>
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1a3a5c] to-[#0d1b2a] px-6 pt-[max(16px,env(safe-area-inset-top))] pb-7">
        <Link href="/dashboard" className="w-9 h-9 rounded-[11px] bg-[rgba(255,255,255,0.08)] border border-[rgba(74,158,255,0.13)] flex items-center justify-center text-lg mb-5">←</Link>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#4a9eff] to-[#2070cc] flex items-center justify-center text-[30px] border-[3px] border-[rgba(74,158,255,0.3)]">👩‍🦱</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full bg-[#f0c060] flex items-center justify-center text-[11px] font-bold text-[#0d1b2a] border-2 border-[#0d1b2a]">2</div>
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-[26px] tracking-[-0.5px] mb-1">{mockUser.naam}</h1>
            <p className="text-[13px] text-[#7a9ab8] mb-2">Lid sinds {mockUser.lidSinds} · 22 rondes</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="blue">🎱 Lid</Badge>
              <Badge variant="green">✓ Betaald</Badge>
              <Badge variant="gold">🏆 #2 Ranglijst</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-[10px] mt-6">
          {[
            { value: '3×', label: 'Gewonnen', color: 'text-[#f0c060]' },
            { value: '€75', label: 'Verdiend', color: 'text-[#34c97a]' },
            { value: '3.4', label: 'Gem. goed', color: 'text-white' },
            { value: '48', label: 'Punten', color: 'text-white' },
          ].map((s) => (
            <div key={s.label} className="bg-[rgba(255,255,255,0.05)] border border-[rgba(74,158,255,0.13)] rounded-[13px] p-3 text-center">
              <div className={`text-[18px] font-bold tracking-[-0.5px] ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-[#7a9ab8] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-6" />

      {/* Tickets */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8]">Lotto tickets</div>
          <span className="text-[13px] text-[#4a9eff] font-medium cursor-pointer">Bewerken</span>
        </div>
        {mockUser.tickets.map((ticket, i) => (
          <TicketCard key={ticket.naam} ticket={ticket} index={i} />
        ))}
      </div>

      {/* Betaalstatus */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Betaalstatus ronde 22</div>
        <Link href="/betalen">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-[13px] bg-[#0d2a1a] flex items-center justify-center text-[19px]">✅</div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">Ronde 22 — €4,00</div>
              <div className="text-[12px] text-[#7a9ab8]">30 mei 2026 · 11:43 · iDEAL</div>
            </div>
            <Badge variant="green">Betaald</Badge>
          </Card>
        </Link>
      </div>

      {/* Statistieken */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Seizoen statistieken</div>
        <div className="grid grid-cols-2 gap-[10px]">
          {[
            { icon: '🎯', value: '3.4', label: 'Gem. goed per ronde', sub: '↑ Beter dan 68% leden', color: 'text-[#4a9eff]' },
            { icon: '🏆', value: '5', label: 'Beste resultaat ooit', sub: 'Ronde 14 · 5 goed', color: 'text-[#f0c060]' },
            { icon: '📊', value: '22', label: 'Deelnames totaal', sub: '', color: 'text-white' },
            { icon: '💶', value: '€75', label: 'Totaal gewonnen', sub: '', color: 'text-[#34c97a]' },
            { icon: '🔥', value: '4', label: 'Huidige reeks', sub: '4 rondes ≥3 goed', color: 'text-white' },
            { icon: '📈', value: '#2', label: 'Positie ranglijst', sub: '↑ Was #3 vorige week', color: 'text-[#4a9eff]' },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-[20px] mb-[10px]">{s.icon}</div>
              <div className={`font-serif text-[24px] tracking-[-0.8px] ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-[#7a9ab8] mt-0.5">{s.label}</div>
              {s.sub && <div className="text-[11px] text-[#34c97a] mt-1 font-medium">{s.sub}</div>}
            </Card>
          ))}
        </div>
      </div>

      {/* Recente resultaten */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8]">Recente resultaten</div>
          <Link href="/trekkingen" className="text-[13px] text-[#4a9eff] font-medium">Alle →</Link>
        </div>
        {[
          { datum: '24 mei', nummers: [6,16,19,23,24,31], hits: [6,19,31], score: '3 goed 🥈' },
          { datum: '17 mei', nummers: [10,12,15,27,34,40], hits: [10,15,34,40], score: '4 goed 🥇' },
          { datum: '10 mei', nummers: [3,11,22,28,31,38], hits: [31], score: '1 goed' },
        ].map((r) => (
          <Link key={r.datum} href="/trekkingen/21">
            <Card className="p-[14px_16px] flex items-center gap-3 mb-2">
              <span className="text-[12px] text-[#7a9ab8] w-14 flex-shrink-0">{r.datum}</span>
              <div className="flex gap-1 flex-1 flex-wrap">
                {r.nummers.map(n => (
                  <div key={n} className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${r.hits.includes(n) ? 'bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white' : 'bg-[#1a2f45] text-[#7a9ab8] border border-[rgba(74,158,255,0.13)]'}`}>{n}</div>
                ))}
              </div>
              <span className="text-[13px] font-semibold whitespace-nowrap">{r.score}</span>
            </Card>
          </Link>
        ))}
      </div>

      <BottomNav items={navItems} />
    </PageWrapper>
  );
}
