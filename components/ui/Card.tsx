import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'gold' | 'accent' | 'success' | 'warning';
  onClick?: () => void;
}

const variants = {
  default: 'bg-[#132233] border border-[rgba(74,158,255,0.13)]',
  gold: 'bg-[linear-gradient(135deg,rgba(240,192,96,0.08)_0%,#132233_100%)] border border-[rgba(240,192,96,0.2)]',
  accent: 'bg-[linear-gradient(135deg,#1a3a5c_0%,#0f2438_100%)] border border-[rgba(74,158,255,0.22)]',
  success: 'bg-[#0d2a1a] border border-[rgba(52,201,122,0.2)]',
  warning: 'bg-[#2a1c00] border border-[rgba(255,170,51,0.2)]',
};

export function Card({ children, className, variant = 'default', onClick }: CardProps) {
  return (
    <div
      className={clsx('rounded-[18px]', variants[variant], onClick && 'cursor-pointer active:opacity-80 transition-opacity', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
