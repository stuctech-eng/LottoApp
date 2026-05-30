import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: ReactNode;
  variant?: 'blue' | 'green' | 'gold' | 'warning' | 'muted';
  className?: string;
}

const variants = {
  blue: 'bg-[#1e3a5f] text-[#4a9eff] border border-[rgba(74,158,255,0.2)]',
  green: 'bg-[#0d2a1a] text-[#34c97a] border border-[rgba(52,201,122,0.2)]',
  gold: 'bg-[#2a2010] text-[#f0c060] border border-[rgba(240,192,96,0.2)]',
  warning: 'bg-[#2a1c00] text-[#ffaa33] border border-[rgba(255,170,51,0.2)]',
  muted: 'bg-[#0f1e2e] text-[#7a9ab8] border border-[rgba(74,158,255,0.13)]',
};

export function Badge({ children, variant = 'blue', className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold px-[10px] py-1 rounded-full', variants[variant], className)}>
      {children}
    </span>
  );
}
