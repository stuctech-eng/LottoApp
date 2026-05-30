import { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <>
      <div className="bg-grid" />
      <div className="relative z-10 safe-bottom">
        {children}
      </div>
    </>
  );
}
