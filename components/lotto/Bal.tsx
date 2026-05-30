import { clsx } from 'clsx';

interface BalProps {
  nummer: number;
  variant?: 'normal' | 'hit' | 'bonus' | 'miss';
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-[26px] h-[26px] text-[10px]',
  md: 'w-[38px] h-[38px] text-[13px]',
  lg: 'w-[52px] h-[52px] text-[17px]',
};

const variants = {
  normal: 'bg-[#1a2f45] border border-[rgba(74,158,255,0.2)] text-white',
  hit: 'bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white shadow-[0_3px_10px_rgba(74,158,255,0.3)]',
  bonus: 'bg-gradient-to-br from-[#f0c060] to-[#d4a030] text-[#0d1b2a]',
  miss: 'bg-[#1a2f45] border border-[rgba(74,158,255,0.13)] text-[#7a9ab8]',
};

export function Bal({ nummer, variant = 'normal', size = 'md' }: BalProps) {
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizes[size], variants[variant])}>
      {nummer}
    </div>
  );
}

export function BonusBal({ nummer, size = 'md' }: { nummer: number; size?: 'sm' | 'md' | 'lg' }) {
  const s = sizes[size];
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-bold flex-shrink-0 bg-gradient-to-br from-[#f0c060] to-[#d4a030] text-[#0d1b2a]', s, size === 'lg' ? 'text-[13px]' : 'text-[10px]')}>
      B·{nummer}
    </div>
  );
}
