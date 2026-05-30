'use client';
import { Ticket } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bal } from './Bal';

interface TicketCardProps {
  ticket: Ticket;
  index: number;
  trekking?: number[];
}

export function TicketCard({ ticket, index, trekking }: TicketCardProps) {
  const hotNummers = [10, 19, 8, 44]; // mock hot numbers

  return (
    <Card className="p-[18px_20px] mb-[10px]">
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[15px] font-semibold text-white">🎱 {ticket.naam}</span>
        {index === 0
          ? <Badge variant="blue">Hoofdticket</Badge>
          : <Badge variant="gold">Extra</Badge>
        }
      </div>
      <div className="flex gap-2 flex-wrap">
        {ticket.nummers.map((n) => {
          const isHit = trekking ? trekking.includes(n) : false;
          const isHot = !trekking && hotNummers.includes(n);
          return (
            <div key={n}
              className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0
                ${trekking
                  ? isHit
                    ? 'bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white shadow-[0_3px_10px_rgba(74,158,255,0.3)]'
                    : 'bg-[#1a2f45] border border-[rgba(74,158,255,0.13)] text-[#7a9ab8]'
                  : isHot
                    ? 'bg-[#2a2010] border border-[rgba(240,192,96,0.4)] text-[#f0c060]'
                    : 'bg-[#1a2f45] border border-[rgba(74,158,255,0.13)] text-white'
                }`}
            >
              {n}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
