'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

interface BottomNavProps {
  items: NavItem[];
  accentColor?: 'blue' | 'green' | 'gold';
}

const colors = {
  blue: 'text-[#4a9eff]',
  green: 'text-[#34c97a]',
  gold: 'text-[#f0c060]',
};

const dotColors = {
  blue: 'bg-[#4a9eff]',
  green: 'bg-[#34c97a]',
  gold: 'bg-[#f0c060]',
};

export function BottomNav({ items, accentColor = 'blue' }: BottomNavProps) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[rgba(74,158,255,0.13)]"
      style={{ background: 'rgba(13,27,42,0.92)', backdropFilter: 'blur(20px)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center gap-1 py-2 cursor-pointer">
            <span className="text-[22px] leading-none">{item.icon}</span>
            <span className={`text-[10px] font-medium ${active ? colors[accentColor] : 'text-[#7a9ab8]'}`}>{item.label}</span>
            <span className={`w-1 h-1 rounded-full ${active ? dotColors[accentColor] : 'opacity-0'}`} />
          </Link>
        );
      })}
    </nav>
  );
}
