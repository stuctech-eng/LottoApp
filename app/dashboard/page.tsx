'use client';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomNav } from '@/components/ui/BottomNav';
import { mockUser, mockTrekkingen, mockLeden } from '@/lib/mock-data';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

export default function DashboardPage() {
  const lasteTrekking = mockTrekkingen[0];

  return (
    <PageWrapper>
      {/* Header */}
      <div className="px-6 pt-[max(16px,env(safe-area-inset-top))] pb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-semibold text-[#4a9eff] tracking-[0.5px]">Goedemorgen 👋</span>
          <Link href="/profiel">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a9eff] to-[#2070cc] flex items-center justify-center text-lg border-2 border-[rgba(74,158,255,0.3)]">👩‍🦱</div>
          </Link>
        </div>
        <h1 className="font-serif text-[32px] tracking-[-1px]">{mockUser.naam.split(' ')[0]}</h1>
      </div>

      {/* Pot hero card */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-br from-[#1a3a5c] to-[#0f2438] border border-[rgba(74,158,255,0.22)] rounded-[22px] p-6 relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(74,158,255,0.15)_0%,transparent_70%)] rounded-full" />
          <div className="text-[12px] font-semibold tracking-[1.5px] uppercase text-[#4a9eff] mb-2">💰 Huidige pot</div>
          <div className="font-serif text-[56px] tracking-[-2px] leading-none mb-1">€1.247</div>
          <div className="text-[13px] text-[#7a9ab8] mb-5">Seizoen 2026 · Ronde 22 · 17 deelnemers</div>
          <div className="flex gap-3">
            <Link href="/betalen" className="flex-1 bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white rounded-[14px] py-[14px] text-[14px] font-semibold text-center shadow-[0_6px_20px_rgba(74,158,255,0.3)]">
              💳 Betaal €4
            </Link>
            <Link href="/trekkingen" className="flex-1 bg-[rgba(255,255,255,0.08)] border border-[rgba(74,158,255,0.2)] text-white rounded-[14px] py-[14px] text-[14px] font-semibold text-center">
              🎱 Trekkingen
            </Link>
          </div>
        </div>
      </div>

      {/* Betaalstatus */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Betaalstatus</div>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#0d2a1a] flex items-center justify-center text-[18px]">✅</div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">Ronde 22 — €4,00</div>
            <div className="text-[12px] text-[#7a9ab8]">Betaald · 30 mei 2026 · iDEAL</div>
          </div>
          <Badge variant="green">Betaald</Badge>
        </Card>
      </div>

      {/* Stats */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Dit seizoen</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🎯', value: '3.4', label: 'Gem. goed', color: 'text-[#4a9eff]' },
            { icon: '🏆', value: '3×', label: 'Gewonnen', color: 'text-[#f0c060]' },
            { icon: '💶', value: '€75', label: 'Verdiend', color: 'text-[#34c97a]' },
            { icon: '📊', value: '#2', label: 'Positie', color: 'text-[#4a9eff]' },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-[18px] mb-2">{s.icon}</div>
              <div className={`font-serif text-[26px] tracking-[-0.8px] ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-[#7a9ab8] mt-1">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Laatste trekking */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8]">Laatste trekking</div>
          <Link href="/trekkingen" className="text-[13px] text-[#4a9eff] font-medium">Alle →</Link>
        </div>
        <Link href="/trekkingen/21">
          <Card variant="gold" className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold">Ronde 21 · 24 mei</span>
              <Badge variant="gold">🏆 Winnaar</Badge>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              {lasteTrekking.nummers.map(n => (
                <div key={n} className="w-9 h-9 rounded-full bg-[#1a2f45] border border-[rgba(74,158,255,0.2)] flex items-center justify-center text-[12px] font-bold">{n}</div>
              ))}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f0c060] to-[#d4a030] text-[#0d1b2a] flex items-center justify-center text-[11px] font-bold">B·12</div>
            </div>
            <div className="text-[13px] text-[#7a9ab8]">Jenny Smit · 4 goed · Jij: 3 goed</div>
          </Card>
        </Link>
      </div>

      {/* Deelnemers betaalstatus */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8]">Deelnemers ronde 22</div>
          <Link href="/leden" className="text-[13px] text-[#4a9eff] font-medium">Alle →</Link>
        </div>
        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            {mockLeden.slice(0, 6).map((lid, i) => (
              <div key={lid.id} className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${i < 4 ? 'border-[#34c97a]' : 'border-[#ffaa33]'}`}
                  style={{ background: '#1a2f45' }}>
                  {['👩‍🦱','👩','👨','👩‍🦰','🧔','👦'][i]}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-[#0d1b2a] ${i < 4 ? 'bg-[#34c97a]' : 'bg-[#ffaa33]'}`} />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full bg-[#132233] border border-[rgba(74,158,255,0.13)] flex items-center justify-center text-[11px] font-semibold text-[#7a9ab8]">+11</div>
          </div>
          <div className="mt-3 text-[12px] text-[#7a9ab8]">14 betaald · 3 open · sluiting vrijdag</div>
        </Card>
      </div>

      {/* Volgende ronde */}
      <div className="px-5 mb-6">
        <Card variant="warning" className="p-4 flex items-center gap-3">
          <div className="text-[28px]">⏰</div>
          <div>
            <div className="text-[14px] font-semibold">Volgende trekking morgen</div>
            <div className="text-[12px] text-[#7a9ab8]">Zaterdag 31 mei 2026 · Ronde 22</div>
          </div>
        </Card>
      </div>

      <BottomNav items={navItems} />
    </PageWrapper>
  );
}
