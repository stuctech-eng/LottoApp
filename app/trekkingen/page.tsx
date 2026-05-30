'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BottomNav } from '@/components/ui/BottomNav';
import { mockTrekkingen } from '@/lib/mock-data';

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen' },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

export default function TrekkingPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4">
        <h1 className="font-serif text-[28px] tracking-[-0.5px]">Trekkingen</h1>
        <button onClick={() => setModalOpen(true)}
          className="h-10 px-4 rounded-[13px] bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white text-[13px] font-semibold shadow-[0_4px_14px_rgba(74,158,255,0.3)]">
          + Invoeren
        </button>
      </div>

      {/* Next banner */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-br from-[#1a3a5c] to-[#0f2438] border border-[rgba(74,158,255,0.22)] rounded-[20px] p-5 flex items-center gap-4">
          <div className="text-[36px]">🎱</div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold tracking-[1.2px] uppercase text-[#4a9eff] mb-1">Volgende trekking</div>
            <div className="font-serif text-[22px] tracking-[-0.3px] mb-1">Zaterdag 31 mei</div>
            <div className="text-[12px] text-[#7a9ab8]">Ronde 22 · Nederlandse Lotto</div>
          </div>
          <div className="bg-[#1e3a5f] border border-[rgba(74,158,255,0.25)] rounded-[12px] p-[10px_14px] text-center flex-shrink-0">
            <div className="text-[22px] font-bold text-[#4a9eff] tracking-[-0.5px]">1</div>
            <div className="text-[10px] text-[#7a9ab8] mt-0.5">dag</div>
          </div>
        </div>
      </div>

      <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] px-5 mb-3">Recente trekkingen</div>

      <div className="px-5 flex flex-col gap-[10px]">
        {/* Ronde 22 - verwacht */}
        <Card className="p-[18px_20px] border-[rgba(255,170,51,0.2)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-semibold">Ronde 22</div>
              <div className="text-[12px] text-[#7a9ab8]">Zaterdag 31 mei 2026</div>
            </div>
            <Badge variant="warning">⏳ Verwacht</Badge>
          </div>
          <div className="text-[13px] text-[#7a9ab8]">Trekking vindt vanavond plaats.</div>
        </Card>

        {/* Ronde 21 - winnaar */}
        <Link href="/trekkingen/21">
          <Card variant="gold" className="p-[18px_20px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-semibold">Ronde 21</div>
                <div className="text-[12px] text-[#7a9ab8]">Zaterdag 24 mei 2026</div>
              </div>
              <Badge variant="gold">🏆 Winnaar</Badge>
            </div>
            <div className="flex gap-[7px] flex-wrap mb-3">
              {[6,16,19,23,24,31].map(n => (
                <div key={n} className="w-9 h-9 rounded-full bg-[#1a2f45] border border-[rgba(74,158,255,0.2)] flex items-center justify-center text-[12px] font-bold">{n}</div>
              ))}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f0c060] to-[#d4a030] text-[#0d1b2a] flex items-center justify-center text-[11px] font-bold">B·12</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[26px] h-[26px] rounded-full bg-[#2a2010] flex items-center justify-center text-[13px]">👩</div>
                <span className="text-[13px] font-medium">Jenny Smit · <span className="text-[#f0c060]">4 goed</span></span>
              </div>
              <span className="text-[13px] text-[#7a9ab8]">Jij: 3 goed ›</span>
            </div>
          </Card>
        </Link>

        {/* Ronde 20 - jij gewonnen */}
        <Link href="/trekkingen/20">
          <Card className="p-[18px_20px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-semibold">Ronde 20</div>
                <div className="text-[12px] text-[#7a9ab8]">Zaterdag 17 mei 2026</div>
              </div>
              <Badge variant="gold">🥇 Jij gewonnen!</Badge>
            </div>
            <div className="flex gap-[7px] flex-wrap mb-3">
              {[10,12,15,27,34,40].map((n,i) => (
                <div key={n} className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${[10,15,34,40].includes(n) ? 'bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white' : 'bg-[#1a2f45] border border-[rgba(74,158,255,0.2)] text-white'}`}>{n}</div>
              ))}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f0c060] to-[#d4a030] text-[#0d1b2a] flex items-center justify-center text-[11px] font-bold">B·8</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">Neeltje Visser · <span className="text-[#f0c060]">4 goed</span> 🎉</span>
              <span className="text-[16px] text-[#7a9ab8]">›</span>
            </div>
          </Card>
        </Link>

        {/* Ronde 19 */}
        <Link href="/trekkingen/19">
          <Card className="p-[18px_20px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-semibold">Ronde 19</div>
                <div className="text-[12px] text-[#7a9ab8]">Zaterdag 10 mei 2026</div>
              </div>
            </div>
            <div className="flex gap-[7px] flex-wrap mb-3">
              {[3,11,22,28,31,38].map(n => (
                <div key={n} className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${n===31 ? 'bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white' : 'bg-[#1a2f45] border border-[rgba(74,158,255,0.2)] text-white'}`}>{n}</div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">Jan de Boer · <span className="text-[#f0c060]">3 goed</span></span>
              <span className="text-[13px] text-[#7a9ab8]">Jij: 1 goed ›</span>
            </div>
          </Card>
        </Link>
      </div>

      <div className="h-4" />

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="w-full bg-[#1a2f45] rounded-[24px_24px_0_0] border-t border-[rgba(74,158,255,0.13)] p-6" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="w-10 h-1 bg-[rgba(74,158,255,0.2)] rounded mx-auto mb-5" />
            <h2 className="font-serif text-[22px] mb-5">🎱 Trekking invoeren</h2>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">Ronde</label>
            <select className="w-full bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[13px] px-4 py-[13px] text-[15px] text-white mb-4 outline-none">
              <option>Ronde 22 — 31 mei 2026</option>
            </select>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">Getrokken nummers</label>
            <div className="flex gap-2 flex-wrap mb-4">
              {[1,2,3,4,5,6].map(i => (
                <input key={i} type="number" placeholder={String(i)} min={1} max={45}
                  className="w-[52px] h-[52px] rounded-full bg-[#132233] border border-[rgba(74,158,255,0.13)] text-center text-[15px] font-semibold text-white outline-none focus:border-[#4a9eff]" />
              ))}
            </div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">Bonusbal</label>
            <input type="number" placeholder="Bonusnummer" min={1} max={45}
              className="w-full bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[13px] px-4 py-[13px] text-[15px] text-white mb-4 outline-none" />
            <button onClick={() => setModalOpen(false)}
              className="w-full bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white rounded-[14px] py-4 text-[15px] font-semibold shadow-[0_6px_20px_rgba(74,158,255,0.3)]">
              ✓ Trekking opslaan & verwerken
            </button>
          </div>
        </div>
      )}

      <BottomNav items={navItems} />
    </PageWrapper>
  );
}
