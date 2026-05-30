'use client';
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

export default function BeheerderPage() {
  return (
    <PageWrapper>
      <div className="px-6 pt-[max(16px,env(safe-area-inset-top))] pb-5">
        <div className="text-[12px] text-[#f0c060] font-semibold tracking-[0.5px] mb-1">👑 Beheerder</div>
        <h1 className="font-serif text-[32px] tracking-[-1px] mb-1">Dashboard</h1>
        <div className="inline-flex items-center gap-1 bg-[#2a2010] border border-[rgba(240,192,96,0.3)] text-[#f0c060] text-[11px] font-semibold px-[10px] py-1 rounded-full">⚙️ Systeembeheer</div>
      </div>

      {/* Systeem overzicht */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-br from-[#2a1c00] to-[#0d1b2a] border border-[rgba(240,192,96,0.18)] rounded-[22px] p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#34c97a] animate-pulse" />
            <span className="text-[12px] font-semibold tracking-[1.5px] uppercase text-[#f0c060]">Systeem operationeel</span>
          </div>
          <div className="font-serif text-[28px] tracking-[-0.5px] mb-4">LottoClub 2026</div>
          <div className="grid grid-cols-3 gap-3">
            {[['17','Actieve leden'],['22','Huidige ronde'],['€1.247','Pot']].map(([v,l]) => (
              <div key={l} className="bg-[rgba(240,192,96,0.08)] border border-[rgba(240,192,96,0.12)] rounded-[12px] p-3 text-center">
                <div className="text-[17px] font-bold text-[#f0c060]">{v}</div>
                <div className="text-[10px] text-[#7a9ab8] mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acties */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Snelle acties</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🎱', label: 'Trekking invoeren', href: '/trekkingen', color: 'bg-[#1e3a5f]' },
            { icon: '👥', label: 'Leden beheren', href: '/leden', color: 'bg-[#2a2010]' },
            { icon: '💰', label: 'Kasboek', href: '/kas', color: 'bg-[#0d2a1a]' },
            { icon: '⚙️', label: 'Instellingen', href: '/beheerder/admin', color: 'bg-[#1e1535]' },
          ].map((a) => (
            <Link key={a.label} href={a.href}>
              <div className={`${a.color} border border-[rgba(74,158,255,0.13)] rounded-[16px] p-4 flex items-center gap-3`}>
                <span className="text-[24px]">{a.icon}</span>
                <span className="text-[14px] font-semibold">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Vereist aandacht</div>
        <Card variant="warning" className="p-4 mb-[10px] flex items-start gap-3">
          <span className="text-[20px]">⚠️</span>
          <div>
            <div className="text-[14px] font-semibold mb-1">3 leden niet betaald</div>
            <div className="text-[12px] text-[#7a9ab8]">Ronde 22 · Sluiting vrijdag</div>
          </div>
        </Card>
        <Card variant="warning" className="p-4 flex items-start gap-3">
          <span className="text-[20px]">📷</span>
          <div>
            <div className="text-[14px] font-semibold mb-1">2 betaalbewijzen wachten</div>
            <div className="text-[12px] text-[#7a9ab8]">Rob de Vries, Els Bakker</div>
          </div>
        </Card>
      </div>

      {/* Seizoen */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Seizoen 2026</div>
        <Card variant="gold" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[15px] font-semibold">Seizoen 2026</span>
            <Badge variant="green">● Actief</Badge>
          </div>
          <div className="flex gap-4">
            {[['22','Rondes'],['17','Leden'],['€1.247','Pot']].map(([v,l]) => (
              <div key={l}><div className="text-[15px] font-semibold text-[#f0c060]">{v}</div><div className="text-[11px] text-[#7a9ab8]">{l}</div></div>
            ))}
          </div>
        </Card>
      </div>

      <BottomNav items={navItems} accentColor="gold" />
    </PageWrapper>
  );
}
