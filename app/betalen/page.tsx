'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  subscribeUserBetalingen,
  meldLottoSaldoStorting,
  markeerLottoSaldoIntroGezien,
  huidigTrekkingWeek,
} from '@/lib/firestore-payments';
import { subscribePaymentConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/firestore-payment-config';
import { subscribeVerenigingConfig, DEFAULT_VERENIGING_CONFIG } from '@/lib/firestore-vereniging';
import { Betaling, PaymentConfig } from '@/lib/types';

type Stap =
  | 'laden' | 'overzicht' | 'geblokkeerd' | 'betaald'
  | 'saldo_kiezen' | 'saldo_bezig' | 'saldo_gemeld' | 'saldo_wachten';

/**
 * Sinds 25 juli 2026: er bestaat geen apart "gewoon €4 betalen"-pad
 * meer naast dit scherm. Alles gaat via storting — ook het kleinste
 * bedrag (minimaal de standaard inleg). Dat verrekent automatisch met
 * een openstaande week als die er is, en de rest blijft als
 * LottoSaldo staan voor de weken erna. Eén route, geen twee systemen
 * die elkaar niet kennen — dat leidde herhaaldelijk tot dubbele of
 * inconsistente boekingen. Zie docs/changelog.md.
 */

/**
 * Bepaalt of storten geblokkeerd is op basis van dag en tijd.
 *
 * Geblokkeerd:
 * - Zaterdag vanaf 18:00 — ballen zijn gevallen
 * - Zondag — nieuwe week begint pas maandag
 */
function getBetaalStatus(): { geblokkeerd: boolean; bericht: string } {
  const nu = new Date();
  const dag = nu.getDay(); // 0=zo, 6=za
  const uur = nu.getHours();

  if (dag === 0) {
    return {
      geblokkeerd: true,
      bericht: 'Zondag — storten kan weer vanaf maandag. De nieuwe week begint dan.',
    };
  }

  if (dag === 6 && uur >= 18) {
    return {
      geblokkeerd: true,
      bericht: 'De ballen zijn gevallen 🎱 — storten voor deze week is niet meer mogelijk. Vanaf maandag kun je weer meedoen aan de volgende trekking.',
    };
  }

  return { geblokkeerd: false, bericht: '' };
}

const SALDO_KEUZES = [10, 25, 50];

function BetalenPageContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [standaardInleg, setStandaardInleg] = useState(DEFAULT_VERENIGING_CONFIG.standaardInleg);
  const [betalingen, setBetalingen] = useState<Betaling[]>([]);
  const [stap, setStap] = useState<Stap>('laden');
  const [error, setError] = useState<string | null>(null);
  const [introGezien, setIntroGezien] = useState(false);

  const [saldoBedrag, setSaldoBedrag] = useState<number | null>(null);
  const [saldoAnders, setSaldoAnders] = useState('');
  const [saldoTikkieGeopend, setSaldoTikkieGeopend] = useState(false);

  const tikkieLink = config.tikkieLink || undefined;
  const betaalStatus = getBetaalStatus();

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

      const week = huidigTrekkingWeek();
      const huidigeBetaling = data.find(b => b.trekkingWeek === week);
      const openstaandeStorting = data.find(b => b.isSaldoStorting && b.status === 'verificatie');

      if (huidigeBetaling?.status === 'betaald') setStap('betaald');
      else if (openstaandeStorting) setStap('saldo_wachten');
      else if (betaalStatus.geblokkeerd) setStap('geblokkeerd');
      else setStap('overzicht');
    });
    return unsub;
  }, [user]);

  const handleMeldSaldoStorting = async () => {
    if (!user || !profile) return;
    const aangepastBedrag = saldoAnders.trim() ? parseFloat(saldoAnders.replace(',', '.')) : null;
    const bedrag = aangepastBedrag ?? saldoBedrag ?? 0;
    if (!bedrag || isNaN(bedrag) || bedrag <= 0) return;
    setStap('saldo_bezig');
    setError(null);
    try {
      await meldLottoSaldoStorting({ uid: user.uid, naam: profile.naam }, bedrag);
      setStap('saldo_gemeld');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Melden mislukt, probeer opnieuw');
      setStap('saldo_kiezen');
    }
  };

  const handleIntroBegrepen = async () => {
    setIntroGezien(true);
    if (user) {
      try { await markeerLottoSaldoIntroGezien(user.uid); } catch (e) { /* niet blokkerend */ }
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
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 12 }}>Storten niet mogelijk</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.7, maxWidth: 320 }}>{betaalStatus.bericht}</div>
        <div style={{ width: '100%', maxWidth: 380, background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: '14px 16px', marginBottom: 32, textAlign: 'left', fontSize: 12, color: 'var(--warning)', lineHeight: 1.6 }}>
          💡 Zonder betaling tellen de getrokken nummers deze week niet mee voor jouw verzameling. Je eerder verzamelde nummers blijven wel gewoon staan — betaal volgende week op tijd om weer mee te bouwen richting 6 goed.
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>← Terug naar dashboard</button>
      </div>
    );
  }

  if (stap === 'saldo_bezig') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 64, height: 64, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24 }}>Bezig met melden…</div>
      </div>
    );
  }

  if (stap === 'saldo_gemeld' || stap === 'saldo_wachten') {
    const storting = betalingen.find(b => b.isSaldoStorting && b.status === 'verificatie');
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>💰</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Storting gemeld!</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>Zodra de kashouder dit bevestigt,<br />wordt je LottoSaldo bijgewerkt — en direct<br />verrekend met een openstaande week.</div>
        <div style={{ width: '100%', maxWidth: 380, background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Status</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>⏳ In verificatie</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Bedrag</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>€{(storting?.bedrag ?? 0).toFixed(2)}</span>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ width: '100%', maxWidth: 380, background: 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>← Terug naar dashboard</button>
      </div>
    );
  }

  if (stap === 'betaald') {
    const week = huidigTrekkingWeek();
    const huidigeBetaling = betalingen.find(b => b.trekkingWeek === week);
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>✅</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Betaling bevestigd!</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>Je doet mee aan de<br />trekking van deze week.</div>
        <div style={{ width: '100%', maxWidth: 380, background: 'var(--success-soft)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Bedrag</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>€{huidigeBetaling?.bedrag.toFixed(2) ?? standaardInleg.toFixed(2)}</span>
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

  if (stap === 'saldo_kiezen') {
    const aangepastBedrag = saldoAnders.trim() ? parseFloat(saldoAnders.replace(',', '.')) : null;
    const bedrag = aangepastBedrag ?? saldoBedrag ?? 0;
    const geldigBedrag = !isNaN(bedrag) && bedrag >= standaardInleg;
    const teLaag = !isNaN(bedrag) && bedrag > 0 && bedrag < standaardInleg;
    const kanMelden = tikkieLink ? saldoTikkieGeopend && geldigBedrag : geldigBedrag;

    return (
      <>
        <div className="bg-grid" />
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 20px' }}>
            <button onClick={() => setStap('overzicht')} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: 'var(--white)', flexShrink: 0 }}>←</button>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.3 }}>Storten</div>
          </div>

          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Kies een bedrag</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
              {SALDO_KEUZES.map(b => (
                <button
                  key={b}
                  onClick={() => { setSaldoBedrag(b); setSaldoAnders(''); }}
                  style={{
                    padding: '18px 0', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                    fontFamily: "'DM Serif Display',serif", fontSize: 22,
                    background: saldoBedrag === b ? 'linear-gradient(135deg,var(--accent),#2070cc)' : 'var(--surface)',
                    border: `1.5px solid ${saldoBedrag === b ? 'var(--accent)' : 'var(--border)'}`,
                    color: 'var(--white)',
                  }}
                >
                  €{b}
                </button>
              ))}
            </div>
            <input
              type="text"
              inputMode="decimal"
              className="form-input"
              placeholder={`Ander bedrag (min. €${standaardInleg.toFixed(2)})…`}
              value={saldoAnders}
              onChange={e => { setSaldoAnders(e.target.value); setSaldoBedrag(null); }}
              style={{ borderColor: teLaag ? 'var(--error)' : undefined }}
            />
            {teLaag ? (
              <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 8 }}>⚠️ Minimaal €{standaardInleg.toFixed(2)} — dat is de huidige standaard inleg.</div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                Bij €{standaardInleg.toFixed(2)} per week geeft €{SALDO_KEUZES[1]} je ongeveer {Math.floor(SALDO_KEUZES[1] / standaardInleg)} weken speelplezier zonder eraan te hoeven denken. Stort je precies €{standaardInleg.toFixed(2)}, dan dekt dit alleen deze week.
              </div>
            )}
          </div>

          {geldigBedrag && (
            <>
              {tikkieLink && (
                <div style={{ padding: '0 20px', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Stap 1 — Betaal via Tikkie</div>
                  <a
                    href={tikkieLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSaldoTikkieGeopend(true)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      width: '100%', borderRadius: 16, padding: 16,
                      fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                      textDecoration: 'none',
                      background: saldoTikkieGeopend ? 'linear-gradient(135deg,#1a8a50,#0d5a30)' : 'linear-gradient(135deg,#34c97a,#1a8a50)',
                      color: 'white',
                      boxShadow: saldoTikkieGeopend ? 'none' : '0 6px 20px rgba(52,201,122,0.3)',
                      border: saldoTikkieGeopend ? '1px solid rgba(52,201,122,0.3)' : 'none',
                    }}
                  >
                    {saldoTikkieGeopend ? '✓ Tikkie geopend' : `💳 Betaal €${bedrag.toFixed(0)} via Tikkie`}
                  </a>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>
                    Tikkie opent op het standaardbedrag van de club — pas het bedrag in Tikkie zelf aan naar €{bedrag.toFixed(2)} vóór je verstuurt.
                  </div>
                </div>
              )}
              <div style={{ padding: '0 20px', marginBottom: 8, marginTop: tikkieLink ? 16 : 0 }}>
                {tikkieLink && (
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Stap 2 — Meld je storting</div>
                )}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                    Na het betalen via Tikkie, meld je de storting hier. De kashouder bevestigt en je LottoSaldo wordt bijgewerkt — inclusief automatische verrekening met een eventuele openstaande week.
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div style={{ padding: '0 20px', marginBottom: 12, color: 'var(--error)', fontSize: 13, fontWeight: 500 }}>⚠️ {error}</div>
          )}

          <div style={{ flex: 1 }} />

          {geldigBedrag && (
            <div style={{ padding: '0 20px', marginBottom: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Je stort</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: 'var(--accent)' }}>€{bedrag.toFixed(2)}</div>
            </div>
          )}

          <div style={{ padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
            <button
              onClick={handleMeldSaldoStorting}
              disabled={!kanMelden}
              className="btn-primary"
              style={{ opacity: kanMelden ? 1 : 0.4, cursor: kanMelden ? 'pointer' : 'not-allowed' }}
            >
              {!geldigBedrag ? 'Kies eerst een bedrag' : !kanMelden ? '🔒 Betaal eerst via Tikkie hierboven' : `✓ Ik heb €${bedrag.toFixed(2)} gestort`}
            </button>
          </div>
        </div>
      </>
    );
  }

  // stap === 'overzicht'
  const lottoSaldo = profile?.lottoSaldo ?? 0;
  const heeftIntroGezien = introGezien || profile?.lottoSaldoIntroSeen;
  const wekenTegoed = Math.floor(lottoSaldo / standaardInleg);

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
              Je stort een bedrag naar keuze (minimaal €{standaardInleg.toFixed(2)}, de huidige inleg). De app schrijft daarna automatisch iedere speelweek de inleg af zolang er saldo is. Stort je precies €{standaardInleg.toFixed(2)}, dan dekt dat alleen deze week — stort je meer, dan speel je meteen meerdere weken vooruit zonder er nog aan te hoeven denken.
            </div>
            <button
              onClick={handleIntroBegrepen}
              style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              Begrepen
            </button>
          </div>
        )}

        {/* LottoSaldo — enige actie op deze pagina */}
        <div style={{ margin: '0 20px 12px' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>LottoSaldo</div>

            {lottoSaldo <= 0 ? (
              <>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 6 }}>Je hebt nog geen saldo</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>Stort minimaal €{standaardInleg.toFixed(2)} om mee te doen deze week.</div>
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

            <button
              onClick={() => { setStap('saldo_kiezen'); setSaldoBedrag(SALDO_KEUZES[1]); setSaldoTikkieGeopend(false); }}
              style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', boxShadow: '0 6px 20px rgba(74,158,255,0.3)' }}
            >
              💰 Storten
            </button>
          </div>
        </div>

        <div style={{ margin: '0 20px 20px', background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '12px 14px', fontSize: 12, color: 'var(--warning)', lineHeight: 1.6 }}>
          💡 Niet op tijd betaald? Dan tellen de getrokken nummers van deze week niet mee voor jouw verzameling richting 6 goed.
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
