'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeUserBetalingen, meldBetaling, huidigTrekkingWeek } from '@/lib/firestore-payments';
import { subscribePaymentConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/firestore-payment-config';
import { STANDAARD_INLEG, STANDAARD_OMSCHRIJVING } from '@/lib/constants';
import { Betaling, PaymentConfig } from '@/lib/types';

type Stap = 'laden' | 'overzicht' | 'geblokkeerd' | 'bezig' | 'gemeld' | 'wachten' | 'betaald';

/**
 * Bepaalt of betalen geblokkeerd is op basis van dag en tijd.
 *
 * Geblokkeerd:
 * - Zaterdag vanaf 18:00 — ballen zijn gevallen
 * - Zondag — nieuwe week begint pas maandag
 *
 * Reden: de Nederlandse Lotto trekt om 19:00 op zaterdag.
 * We blokkeren vanaf 18:00 als buffer. Op zondag is de oude
 * week voorbij maar de nieuwe week (ISO-W) begint pas maandag.
 * Betalen op zondag zou de betaling koppelen aan de verkeerde week.
 */
function getBetaalStatus(): { geblokkeerd: boolean; bericht: string } {
  const nu = new Date();
  const dag = nu.getDay(); // 0=zo, 6=za
  const uur = nu.getHours();

  if (dag === 0) {
    return {
      geblokkeerd: true,
      bericht: 'Zondag — betalen kan weer vanaf maandag. De nieuwe week begint dan.',
    };
  }

  if (dag === 6 && uur >= 18) {
    return {
      geblokkeerd: true,
      bericht: 'De ballen zijn gevallen 🎱 — betalen voor deze week is niet meer mogelijk. Betaal vanaf maandag mee voor de volgende trekking.',
    };
  }

  return { geblokkeerd: false, bericht: '' };
}

function BetalenPageContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [stap, setStap] = useState<Stap>('laden');
  const [omschrijving, setOmschrijving] = useState(STANDAARD_OMSCHRIJVING);
  const [error, setError] = useState<string | null>(null);
  const [tikkieGeopend, setTikkieGeopend] = useState(false);

  const tikkieLink = (config as PaymentConfig & { tikkieLink?: string }).tikkieLink || undefined;
  const betaalStatus = getBetaalStatus();

  useEffect(() => {
    const unsub = subscribePaymentConfig(setConfig);
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserBetalingen(user.uid, (data) => {
      setBetalingen(data);

      const week = huidigTrekkingWeek();
      const huidigeBetaling = data.find(
        b => (b as Betaling & { trekkingWeek?: string }).trekkingWeek === week
      );

      if (huidigeBetaling?.status === 'betaald') setStap('betaald');
      else if (huidigeBetaling?.status === 'verificatie') setStap('wachten');
      else if (betaalStatus.geblokkeerd) setStap('geblokkeerd');
      else setStap('overzicht');
    });
    return unsub;
  }, [user]);

  const handleMelden = async () => {
    if (!user || !profile) return;
    setStap('bezig');
    setError(null);
    try {
      await meldBetaling(
        { uid: user.uid, naam: profile.naam },
        STANDAARD_INLEG,
        omschrijving.trim() || STANDAARD_OMSCHRIJVING
      );
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

  if (stap === 'geblokkeerd') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎱</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 12 }}>Betalen niet mogelijk</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.7, maxWidth: 320 }}>{betaalStatus.bericht}</div>
        <button onClick={() => router.push('/dashboard')} style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>← Terug naar dashboard</button>
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
    const week = huidigTrekkingWeek();
    const huidigeBetaling = betalingen.find(
      b => (b as Betaling & { trekkingWeek?: string }).trekkingWeek === week
    );
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>✅</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Betaling bevestigd!</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>Je doet mee aan de<br />trekking van deze week.</div>
        <div style={{ width: '100%', maxWidth: 380, background: 'var(--success-soft)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Bedrag</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>€{huidigeBetaling?.bedrag.toFixed(2) ?? '4.00'}</span>
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
  const geblokkeerd = tikkieLink ? !tikkieGeopend : false;

  return (
    <>
      <div className="bg-grid" />
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 20px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: 'var(--white)', flexShrink: 0 }}>←</button>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.3 }}>Betalen</div>
        </div>

        {/* Bedrag hero */}
        <div style={{ margin: '0 20px 20px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Te betalen</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 52, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>€{STANDAARD_INLEG}</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>LottoClub · {huidigTrekkingWeek()}</div>
          </div>
        </div>

        {/* Stap 1 — Tikkie */}
        {tikkieLink && (
          <div style={{ padding: '0 20px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Stap 1 — Betaal via Tikkie</div>
            <a
              href={tikkieLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setTikkieGeopend(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', borderRadius: 16, padding: 16,
                fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                textDecoration: 'none',
                background: tikkieGeopend ? 'linear-gradient(135deg,#1a8a50,#0d5a30)' : 'linear-gradient(135deg,#34c97a,#1a8a50)',
                color: 'white',
                boxShadow: tikkieGeopend ? 'none' : '0 6px 20px rgba(52,201,122,0.3)',
                border: tikkieGeopend ? '1px solid rgba(52,201,122,0.3)' : 'none',
              }}
            >
              {tikkieGeopend ? '✓ Tikkie geopend' : '💳 Betaal nu via Tikkie'}
            </a>
          </div>
        )}

        {/* Stap 2 — Melden */}
        <div style={{ padding: '0 20px', marginBottom: 20, marginTop: tikkieLink ? 16 : 0 }}>
          {tikkieLink && (
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Stap 2 — Meld je betaling</div>
          )}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              {tikkieLink
                ? 'Na het betalen via Tikkie, meld je betaling hier zodat de kashouder het kan bevestigen.'
                : 'Betaal via overboeking en meld je betaling hier. De kashouder bevestigt zo snel mogelijk.'}
            </div>
          </div>
          <label className="form-label">Omschrijving</label>
          <input
            type="text"
            className="form-input"
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder={STANDAARD_OMSCHRIJVING}
          />
        </div>

        {error && (
          <div style={{ padding: '0 20px', marginBottom: 12, color: 'var(--error)', fontSize: 13, fontWeight: 500 }}>⚠️ {error}</div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
          <button
            onClick={handleMelden}
            disabled={geblokkeerd}
            className="btn-primary"
            style={{ opacity: geblokkeerd ? 0.4 : 1, cursor: geblokkeerd ? 'not-allowed' : 'pointer' }}
          >
            {geblokkeerd ? '🔒 Betaal eerst via Tikkie hierboven' : `✓ Ik heb betaald — €${STANDAARD_INLEG}`}
          </button>
          {geblokkeerd && (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
              Tik op "Betaal nu via Tikkie" om de betaling te starten
            </div>
          )}
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
