'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomNav } from '@/components/ui/BottomNav';

const navItems = [
  { href: '/kashouder', icon: '🏠', label: 'Dashboard' },
  { href: '/kas', icon: '📒', label: 'Kasboek' },
  { href: '/kashouder/financieel', icon: '💰', label: 'Financieel' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/leden', icon: '👥', label: 'Leden' },
];

export default function KashouderPage() {
  const [approved, setApproved] = useState<string[]>([]);

  return (
    <PageWrapper>
      <div className="px-6 pt-[max(16px,env(safe-area-inset-top))] pb-5">
        <div className="text-[12px] text-[#34c97a] font-semibold mb-1">⚡ Kashouder</div>
        <h1 className="font-serif text-[32px] tracking-[-1px] mb-1">Dashboard</h1>
        <div className="inline-flex items-center gap-1 bg-[#0d2a1a] border border-[rgba(52,201,122,0.25)] text-[#34c97a] text-[11px] font-semibold px-[10px] py-1 rounded-full">💳 Kas beheer</div>
      </div>

      {/* Kas hero */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-br from-[#0d2a1a] to-[#0d1b2a] border border-[rgba(52,201,122,0.2)] rounded-[22px] p-6">
          <div className="text-[12px] font-semibold tracking-[1.5px] uppercase text-[#34c97a] mb-2">💰 Totale pot</div>
          <div className="font-serif text-[52px] tracking-[-2px] leading-none mb-1">€1.247</div>
          <div className="text-[13px] text-[#7a9ab8] mb-5">Seizoen 2026 · Ronde 22</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/kashouder/financieel">
              <div className="bg-[rgba(52,201,122,0.1)] border border-[rgba(52,201,122,0.2)] rounded-[13px] p-3 text-center">
                <div className="text-[16px] font-bold text-[#34c97a]">💸 Uitbetalen</div>
              </div>
            </Link>
            <Link href="/kas">
              <div className="bg-[rgba(52,201,122,0.1)] border border-[rgba(52,201,122,0.2)] rounded-[13px] p-3 text-center">
                <div className="text-[16px] font-bold text-[#34c97a]">📒 Kasboek</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Betaalvoortgang */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Betaalvoortgang ronde 22</div>
        <Card className="p-[18px_20px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold">14 van 17 leden betaald</span>
            <span className="text-[14px] font-bold text-[#34c97a]">82%</span>
          </div>
          <div className="h-2 bg-[#1a2f45] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full bg-gradient-to-r from-[#34c97a] to-[#20a050]" style={{ width: '82%' }} />
          </div>
          <div className="flex justify-between text-[11px] text-[#7a9ab8]">
            <span>€0</span><span>€56 van €68</span><span>€68</span>
          </div>
        </Card>
      </div>

      {/* Betaalbewijzen */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8]">Betaalbewijzen</div>
          <span className="text-[12px] bg-[#2a1c00] text-[#ffaa33] px-[10px] py-[3px] rounded-full font-semibold">2 open</span>
        </div>
        {[{ id: 'rob', naam: 'Rob de Vries' }, { id: 'els', naam: 'Els Bakker' }].map(b => (
          !approved.includes(b.id) && (
            <Card key={b.id} variant="warning" className="p-4 flex items-center gap-3 mb-[10px]">
              <div className="w-12 h-12 rounded-[12px] bg-[#2a1c00] flex items-center justify-center text-[22px] flex-shrink-0">📷</div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold">{b.naam}</div>
                <div className="text-[12px] text-[#7a9ab8]">€4,00 · Ronde 22</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setApproved(a => [...a, b.id])} className="bg-[#34c97a] text-[#0d1b2a] rounded-[10px] px-[14px] py-2 text-[12px] font-bold">✓</button>
                <button className="bg-[#2a0d0d] text-[#ff5a5a] border border-[rgba(255,90,90,0.2)] rounded-[10px] px-[12px] py-2 text-[12px] font-semibold">✕</button>
              </div>
            </Card>
          )
        ))}
        {approved.length === 2 && <div className="text-center text-[13px] text-[#34c97a] py-4">✓ Alle bewijzen verwerkt</div>}
      </div>

      {/* Openstaand */}
      <div className="px-5 mb-5">
        <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Openstaand</div>
        <Card variant="warning" className="p-4 flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-full bg-[#2a1c00] flex items-center justify-center text-[16px] flex-shrink-0">👦</div>
          <div className="flex-1">
            <div className="text-[14px] font-medium">Tim Hoekstra</div>
            <div className="text-[11px] text-[#7a9ab8]">€4,00 · Ronde 22</div>
          </div>
          <button className="bg-[#2a1c00] text-[#ffaa33] border border-[rgba(255,170,51,0.2)] rounded-[10px] px-3 py-[7px] text-[12px] font-semibold">🔔 Herinner</button>
        </Card>
      </div>

      <BottomNav items={navItems} accentColor="green" />
    </PageWrapper>
  );
}
