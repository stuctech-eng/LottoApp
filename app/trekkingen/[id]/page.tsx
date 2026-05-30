'use client';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { BottomNav } from '@/components/ui/BottomNav';
import { mockUser } from '@/lib/mock-data';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

const getrokken = [6, 16, 19, 23, 24, 31];
const bonusBal = 12;

export default function TrekkingDetailPage() {
  return (
    <PageWrapper>
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1a3a5c] to-[#0d1b2a] px-6 pt-[max(16px,env(safe-area-inset-top))] pb-8">
        <Link href="/trekkingen" className="w-9 h-9 rounded-[11px] bg-[rgba(255,255,255,0.08)] border border-[rgba(74,158,255,0.13)] flex items-center justify-center text-lg mb-5">←</Link>
        <div className="text-[12px] font-semibold tracking-[1.5px] uppercase text-[#4a9eff] mb-1">Trekking resultaat</div>
        <h1 className="font-serif text-[32px] tracking-[-0.8px] mb-1">Ronde 21</h1>
        <p className="text-[14px] text-[#7a9ab8] mb-7">Zaterdag 24 mei 2026 · Nederlandse Lotto</p>

        {/* Ballen */}
        <div className="flex gap-[10px] flex-wrap mb-5">
          {getrokken.map((n, i) => (
            <div key={n} className="w-[52px] h-[52px] rounded-full bg-[#1a2f45] border-2 border-[rgba(74,158,255,0.2)] flex items-center justify-center text-[17px] font-bold"
              style={{ animation: `ballDrop 0.4s ease ${0.1 + i * 0.1}s both` }}>
              {n}
            </div>
          ))}
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#f0c060] to-[#d4a030] text-[#0d1b2a] flex items-center justify-center text-[13px] font-bold"
            style={{ animation: 'ballDrop 0.4s ease 0.7s both' }}>
            B·{bonusBal}
          </div>
        </div>

        {/* Winnaar banner */}
        <div className="bg-[linear-gradient(135deg,rgba(240,192,96,0.15)_0%,rgba(240,192,96,0.05)_100%)] border border-[rgba(240,192,96,0.25)] rounded-[16px] p-4 flex items-center gap-3">
          <div className="text-[32px]">🏆</div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold tracking-[1px] uppercase text-[#f0c060] mb-1">Winnaar</div>
            <div className="text-[18px] font-bold">Jenny Smit</div>
            <div className="text-[12px] text-[#7a9ab8] mt-0.5">Formulier A · 4 goed</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[22px] font-bold text-[#f0c060]">€25</div>
            <div className="text-[11px] text-[#7a9ab8]">Uitbetaald</div>
          </div>
        </div>
      </div>

      <div className="h-6" />

      {/* Jouw resultaten */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Jouw resultaten</div>
        {mockUser.tickets.map((ticket, ti) => {
          const hits = ticket.nummers.filter(n => getrokken.includes(n));
          return (
            <Card key={ticket.naam} className="p-[18px_20px] mb-[10px]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[15px] font-semibold">🎱 {ticket.naam}</span>
                <div className={`text-[13px] font-bold px-[14px] py-[6px] rounded-full ${hits.length >= 3 ? 'bg-[#1e3a5f] text-[#4a9eff] border border-[rgba(74,158,255,0.25)]' : 'bg-[#0f1e2e] text-[#7a9ab8] border border-[rgba(74,158,255,0.13)]'}`}>
                  {hits.length} goed {hits.length >= 4 ? '🥇' : hits.length >= 3 ? '🥈' : ''}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {ticket.nummers.map(n => {
                  const hit = getrokken.includes(n);
                  return (
                    <div key={n} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0 ${hit ? 'bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white shadow-[0_3px_10px_rgba(74,158,255,0.3)]' : 'bg-[#1a2f45] border border-[rgba(74,158,255,0.13)] text-[#7a9ab8]'}`}>{n}</div>
                      <span className={`text-[14px] font-medium flex-1 ${hit ? 'text-white' : 'text-[#7a9ab8]'}`}>{n} — {hit ? 'getrokken ✅' : 'niet getrokken'}</span>
                      <span>{hit ? '✅' : '❌'}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Alle spelers */}
      <div className="px-5 mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Alle deelnemers</div>
        {[
          { pos: '1', emoji: '👩', naam: 'Jenny Smit', ticket: 'Formulier A', hits: [6,19,24,31], score: '4 🏆', isMe: false, posColor: 'text-[#f0c060]' },
          { pos: '2', emoji: '👩‍🦱', naam: 'Neeltje Visser', ticket: 'Formulier A', hits: [6,19,31], score: '3 🥈', isMe: true, posColor: 'text-[#c0c8d0]' },
          { pos: '3', emoji: '🧔', naam: 'Peter Janssen', ticket: 'Formulier A', hits: [16,23,31], score: '3 🥉', isMe: false, posColor: 'text-[#c08050]' },
          { pos: '4', emoji: '👨', naam: 'Jan de Boer', ticket: 'Formulier A', hits: [6,19], score: '2', isMe: false, posColor: 'text-[#7a9ab8]' },
          { pos: '5', emoji: '👩‍🦰', naam: 'Lisa van Dam', ticket: 'Formulier A', hits: [24], score: '1', isMe: false, posColor: 'text-[#7a9ab8]' },
        ].map((s) => (
          <div key={s.naam} className={`rounded-[14px] p-[14px_16px] flex items-center gap-3 mb-2 ${s.isMe ? 'bg-[#1e3a5f] border border-[rgba(74,158,255,0.3)]' : 'bg-[#132233] border border-[rgba(74,158,255,0.13)]'}`}>
            <span className={`text-[14px] font-bold w-[22px] text-center flex-shrink-0 ${s.posColor}`}>{s.pos}</span>
            <div className="w-[34px] h-[34px] rounded-full bg-[#1a2f45] flex items-center justify-center text-[14px] flex-shrink-0">{s.emoji}</div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-white">{s.naam}{s.isMe && <span className="text-[12px] text-[#4a9eff] font-normal"> (jij)</span>}</div>
              <div className="flex gap-1 mt-1">
                {getrokken.map(n => (
                  <div key={n} className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${s.hits.includes(n) ? 'bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white' : 'bg-[#1a2f45] text-[#7a9ab8] border border-[rgba(74,158,255,0.13)]'}`}>{n}</div>
                ))}
              </div>
            </div>
            <span className="text-[16px] font-bold text-white">{s.score}</span>
          </div>
        ))}
      </div>

      <BottomNav items={navItems} />
    </PageWrapper>
  );
}
