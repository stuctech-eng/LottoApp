'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { User } from '@/lib/types';

function DeelnemersContent() {
  const [leden, setLeden] = useState<User[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    const unsub = subscribeAllUsers((l) => {
      setLeden(l.filter(lid => lid.actief));
      setLaden(false);
    });
    return unsub;
  }, []);

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <Link href="/dashboard" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>👥 Deelnemers</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>
            {laden ? '…' : `${leden.length} leden`}
          </div>
        </div>

        <div style={{ padding: '0 20px', paddingBottom: 32 }}>
          {laden && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!laden && leden.length === 0 && (
            <div className="card" style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nog geen deelnemers.
            </div>
          )}

          {leden.map((lid, i) => (
            <div key={lid.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--accent)', border: '2px solid rgba(74,158,255,0.2)', flexShrink: 0, overflow: 'hidden' }}>
                {lid.foto
                  ? <img src={lid.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : lid.naam.charAt(0).toUpperCase()
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)' }}>{lid.naam}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>#{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function DeelnemersPage() {
  return (
    <ProtectedRoute>
      <DeelnemersContent />
    </ProtectedRoute>
  );
}
