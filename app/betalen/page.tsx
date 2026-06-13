'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeUserBetalingen, meldBetaling } from '@/lib/firestore-payments';
import { subscribePaymentConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/firestore-payment-config';
import { STANDAARD_INLEG, STANDAARD_OMSCHRIJVING } from '@/lib/constants';
import { Betaling, PaymentConfig } from '@/lib/types';

type Stap = 'laden' | 'overzicht' | 'bezig' | 'gemeld' | 'wachten' | 'betaald';

function BetalenPageContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [stap, setStap] = useState<Stap>('laden');
  const [omschrijving, setOmschrijving] = useState(STANDAARD_OMSCHRIJVING);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribePaymentConfig(setConfig);
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserBetalingen(user.uid, (data) => {
      setBetalingen(data);
      const laatste = data[0];
      if (laatste?.status === 'verificatie') setStap('wachten');
      else if (laatste?.status === 'betaald') setStap('betaald');
      else setStap('overzicht');
    });
    return unsub;
  }, [user]);

  const handleMelden = async () => {
    if (!user || !profile) return;
    setStap('bezig');
    setError(null);
    try {
      await meldBetaling({ uid: user.uid, naam: profile.naam }, STANDAARD_INLEG, omschrijving.trim() || STANDAARD_OMSCHRIJVING);
      setStap('gemeld');
    } catch (e) {
      setError('Melden mislukt, probeer opnieuw');
      setStap('overzicht');
    }
  };

  if (stap === 'laden') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (stap === 'bezig') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 64, height: 64, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24 }}>Bezig met melden…</div>
      </div>
    );
  }

  if (stap === 'gemeld' || stap === 'wachten') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>📤</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Betaling gemeld!</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>De kashouder verifieert<br />dit zo snel mogelijk.</div>
        <div style={{ width: '100%', maxWidth: 380, background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Status</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>⏳ In verificatie</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Bedrag</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>€{STANDAARD_INLEG.toFixed(2)}</span>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ width: '100%', maxWidth: 380, background: 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>← Terug naar dashboard</button>
      </div>
    );
  }

  if (stap === 'betaald') {
    const laatste = betalingen[0];
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>✅</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Betaling bevestigd!</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>Je bent klaar voor de<br />volgende ronde.</div>
        <div style={{ width: '100%', maxWidth: 380, background: 'var(--success-soft)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Bedrag</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>€{laatste.bedrag.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Status</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>✓ Bevestigd</span>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ width: '100%', maxWidth: 380, background: 'linear-gradient(135deg,var(--success),#1a8a50)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>← Terug naar dashboard</button>
      </div>
    );
  }

  // stap === 'overzicht'
  return (
    <>
      <div className="bg-grid" />
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 20px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: 'var(--white)', flexShrink: 0 }}>←</button>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.3 }}>Betalen</div>
        </div>

        <div style={{ margin: '0 20px 20px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Te betalen</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 52, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>€{STANDAARD_INLEG}</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>LottoClub</div>
          </div>
        </div>

        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div className="section-title">Omschrijving</div>
          <input
            type="text"
            className="form-input"
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder={STANDAARD_OMSCHRIJVING}
          />
        </div>

        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{config.activeProvider === 'offline' ? '💬' : '💳'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                {config.activeProvider === 'offline' ? 'Offline melden' : 'Online betalen'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                {config.activeProvider === 'offline'
                  ? 'Betaal contant of via overschrijving, en meld dit hieronder. De kashouder bevestigt je betaling.'
                  : 'Online betalen is nog niet beschikbaar — meld je betaling handmatig.'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0 20px', marginBottom: 12, color: 'var(--error)', fontSize: 13, fontWeight: 500 }}>⚠️ {error}</div>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
          <button onClick={handleMelden} className="btn-primary">✓ Ik heb betaald — €{STANDAARD_INLEG}</button>
        </div>
      </div>
    </>
  );
}

export default function BetalenPage() {
  return (
    <ProtectedRoute>
      <BetalenPageContent />
    </ProtectedRoute>
  );
}
