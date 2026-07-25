'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeUserBetalingen, huidigTrekkingWeek, markeerLottoSaldoIntroGezien } from '@/lib/firestore-payments';
import { subscribePaymentConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/firestore-payment-config';
import { subscribeVerenigingConfig, DEFAULT_VERENIGING_CONFIG } from '@/lib/firestore-vereniging';
import { Betaling, PaymentConfig } from '@/lib/types';

/**
 * Sinds 25 juli 2026: puur informatieve pagina. Leden melden hun
 * storting niet meer zelf in de app — dat werd structureel vergeten.
 * In plaats daarvan: lid stort via de Tikkie-link, de kashouder ziet
 * dat zelf in Tikkie en registreert het direct (Financieel →
 * Storting registreren). Geen "ik heb gestort"-stap, geen
 * verificatie-wachtrij meer voor leden. Zie docs/changelog.md.
 */

function BetalenPageContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [standaardInleg, setStandaardInleg] = useState(DEFAULT_VERENIGING_CONFIG.standaardInleg);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [laden, setLaden] = useState(true);
  const [introGezien, setIntroGezien] = useState(false);

  const tikkieLink = config.tikkieLink || undefined;

  useEffect(() => {
    const unsub = subscribePaymentConfig(setConfig);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeVerenigingConfig(cfg => setStandaardInleg(cfg.standaardInleg));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserBetalingen(user.uid, (data) => {
      setBetalingen(data);
      setLaden(false);
    });
    return unsub;
  }, [user]);

  if (laden) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const week = huidigTrekkingWeek();
  const huidigeBetaling = betalingen.find(b => b.trekkingWeek === week);

  if (huidigeBetaling?.status === 'betaald') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>✅</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Betaling bevestigd!</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>Je doet mee aan de<br />trekking van deze week.</div>
        <div style={{ width: '100%', maxWidth: 380, background: 'var(--success-soft)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Bedrag</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>€{huidigeBetaling.bedrag.toFixed(2)}</span>
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

  const lottoSaldo = profile?.lottoSaldo ?? 0;
  const heeftIntroGezien = introGezien || profile?.lottoSaldoIntroSeen;
  const wekenTegoed = Math.floor(lottoSaldo / standaardInleg);

  const handleIntroBegrepen = async () => {
    setIntroGezien(true);
    if (user) {
      try {
        await markeerLottoSaldoIntroGezien(user.uid);
      } catch (e) { /* niet blokkerend */ }
    }
  };

  return (
    <>
      <div className="bg-grid" />
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 20px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: 'var(--white)', flexShrink: 0 }}>←</button>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.3 }}>Betalen</div>
        </div>

        {/* Eenmalige uitleg */}
        {!heeftIntroGezien && (
          <div style={{ margin: '0 20px 16px', background: 'linear-gradient(135deg,rgba(74,158,255,0.12),rgba(74,158,255,0.04))', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>🆕 Hoe betalen werkt</div>
            <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, marginBottom: 14 }}>
              Stort een bedrag naar keuze via Tikkie (minimaal €{standaardInleg.toFixed(2)}). De kashouder ziet je storting en verwerkt 'm — jij hoeft verder niks te melden in de app. Bij elke nieuwe speelweek wordt automatisch €{standaardInleg.toFixed(2)} van je saldo afgeschreven, zolang er saldo is.
            </div>
            <button
              onClick={handleIntroBegrepen}
              style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              Begrepen
            </button>
          </div>
        )}

        {/* LottoSaldo */}
        <div style={{ margin: '0 20px 12px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>LottoSaldo</div>

            {lottoSaldo <= 0 ? (
              <>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 6 }}>Je hebt nog geen saldo</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>Stort minimaal €{standaardInleg.toFixed(2)} via Tikkie om mee te doen.</div>
              </>
            ) : lottoSaldo < standaardInleg ? (
              <>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 40, letterSpacing: -1.5, marginBottom: 4 }}>€{lottoSaldo.toFixed(2)}</div>
                <div style={{ fontSize: 13, color: 'var(--warning)', marginBottom: 20, fontWeight: 600 }}>Nog €{(standaardInleg - lottoSaldo).toFixed(2)} nodig voor deze week</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 40, letterSpacing: -1.5, marginBottom: 4 }}>€{lottoSaldo.toFixed(2)}</div>
                <div style={{ fontSize: 13, color: 'var(--success)', marginBottom: 20 }}>Nog {wekenTegoed} {wekenTegoed === 1 ? 'week' : 'weken'} speelplezier</div>
              </>
            )}

            {tikkieLink ? (
              <a
                href={tikkieLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', width: '100%', background: 'linear-gradient(135deg,#34c97a,#1a8a50)', color: 'white', border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", textDecoration: 'none', boxShadow: '0 6px 20px rgba(52,201,122,0.3)' }}
              >
                💳 Open Tikkie om te storten
              </a>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                Vraag de kashouder om de Tikkie-link.
              </div>
            )}
          </div>
        </div>

        <div style={{ margin: '0 20px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            💡 Je hoeft je storting nergens te melden. De kashouder ziet het bedrag in Tikkie binnenkomen en verwerkt het zelf — jouw saldo wordt dan automatisch bijgewerkt.
          </div>
        </div>

        <div style={{ margin: '0 20px 20px', background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '12px 14px', fontSize: 12, color: 'var(--warning)', lineHeight: 1.6 }}>
          ⚠️ Nog geen saldo en niet gestort vóór de trekking? Dan tellen de getrokken nummers van deze week niet mee voor jouw verzameling richting 6 goed.
        </div>

        <div style={{ height: 24 }} />
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
