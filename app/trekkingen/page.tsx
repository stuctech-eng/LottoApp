'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { subscribeSeizoen } from '@/lib/firestore-seizoenen';
import { subscribeAlleTrekkingen, slaaTrekkingOpEnVerwerk } from '@/lib/firestore-trekkingen';
import { subscribeSpelConfig, subscribePrijsConfig, DEFAULT_SPELCONFIG, DEFAULT_PRIJSCONFIG } from '@/lib/firestore-spelconfig';
import { Trekking, Seizoen, SpelConfig, PrijsConfig } from '@/lib/types';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/trekkingen', icon: '🎱', label: 'Trekkingen', active: true },
  { href: '/ranglijst', icon: '📈', label: 'Ranglijst' },
  { href: '/kas', icon: '💰', label: 'Kas' },
  { href: '/profiel', icon: '👤', label: 'Profiel' },
];

function formatDatum(ts: Trekking['datum']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function TrekkingBallen({ nummers, bonusBal }: { nummers: number[]; bonusBal: number | null }) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {nummers.map(n => (
        <div key={n} className="bal bal-normal" style={{ width: 36, height: 36, fontSize: 12 }}>{n}</div>
      ))}
      {bonusBal !== null && (
        <div className="bal bal-bonus" style={{ width: 36, height: 36, fontSize: 11 }}>B·{bonusBal}</div>
      )}
    </div>
  );
}

function TrekkingInvoerModal({
  open, onClose, seizoen, spelConfig, prijsConfig
}: {
  open: boolean;
  onClose: () => void;
  seizoen: Seizoen | null;
  spelConfig: SpelConfig;
  prijsConfig: PrijsConfig;
}) {
  const { user, profile } = useAuth();
  const [nummers, setNummers] = useState<string[]>(Array(spelConfig.aantalGetallen).fill(''));
  const [bonusBal, setBonusBal] = useState('');
  const [bezig, setBezig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [foutieveIndexen, setFoutieveIndexen] = useState<Set<number>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setNummers(Array(spelConfig.aantalGetallen).fill(''));
      setBonusBal('');
      setError(null);
      setSucces(false);
      setFoutieveIndexen(new Set());
      // Auto-focus eerste veld zodra modal opent
      setTimeout(() => inputRefs.current[0]?.focus(), 350);
    }
  }, [open, spelConfig.aantalGetallen]);

  if (!open) return null;

  const handleNummerChange = (i: number, val: string) => {
    const schoon = val.replace(/[^0-9]/g, '').slice(0, 2);
    const n = [...nummers];
    n[i] = schoon;
    setNummers(n);
    setFoutieveIndexen(prev => { const s = new Set(prev); s.delete(i); return s; });

    // Auto-advance: spring door zodra het veld een geldig getal bevat
    // dat niet meer groter kan worden zonder over het maximum te gaan.
    if (i < nummers.length - 1 && schoon.length > 0) {
      const waarde = parseInt(schoon, 10);
      const kanNogGroeien = schoon.length === 1 && waarde * 10 <= spelConfig.maxGetal;
      if (schoon.length === 2 || !kanNogGroeien) {
        // Kleine delay zodat de waarde eerst zichtbaar wordt
        setTimeout(() => inputRefs.current[i + 1]?.focus(), 50);
      }
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && nummers[i] === '' && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    if (!seizoen) { setError('Geen actief seizoen gevonden. Maak eerst een seizoen aan.'); return; }

    const parsed = nummers.map(n => parseInt(n, 10));
    const fouten = new Set<number>();
    parsed.forEach((n, i) => {
      if (isNaN(n) || n < spelConfig.minGetal || n > spelConfig.maxGetal) fouten.add(i);
    });
    if (fouten.size > 0) {
      setFoutieveIndexen(fouten);
      setError(`Vul ${spelConfig.aantalGetallen} geldige nummers in (${spelConfig.minGetal}-${spelConfig.maxGetal})`);
      return;
    }
    if (new Set(parsed).size !== parsed.length) {
      setError('Nummers moeten uniek zijn');
      return;
    }

    const bonus = spelConfig.bonusBal && bonusBal.trim() !== '' ? parseInt(bonusBal, 10) : null;
    if (spelConfig.bonusBal && bonusBal.trim() !== '' && isNaN(bonus!)) {
      setError('Ongeldige bonusbal'); return;
    }

    setBezig(true);
    setError(null);
    setFoutieveIndexen(new Set());
    try {
      await slaaTrekkingOpEnVerwerk({
        rondeId: '',
        seizoenId: seizoen.id,
        nummers: parsed,
        bonusBal: bonus,
        ingevoerdDoor: user.uid,
        ingevoerdDoorNaam: profile.naam,
      }, { uid: user.uid, naam: profile.naam });
      setSucces(true);
      setTimeout(() => { onClose(); }, 2000);
    } catch (e) {
      setError('Opslaan mislukt, probeer opnieuw');
    } finally {
      setBezig(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--navy-mid)', borderRadius: '24px 24px 0 0', borderTop: '1px solid var(--border)', padding: '0 24px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '14px auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22 }}>🎱 Trekking invoeren</div>
            {seizoen && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{seizoen.naam} · {spelConfig.naam}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--muted)', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
          >
            ✕
          </button>
        </div>
        <div style={{ height: 10 }} />

        {succes ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20 }}>Trekking verwerkt!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Alle tickets zijn gecontroleerd.</div>
          </div>
        ) : (
          <>
            <label className="form-label">{spelConfig.aantalGetallen} nummers ({spelConfig.minGetal}-{spelConfig.maxGetal})</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {nummers.map((val, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="number" inputMode="numeric"
                  min={spelConfig.minGetal} max={spelConfig.maxGetal}
                  value={val}
                  onChange={e => handleNummerChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--surface)',
                    border: foutieveIndexen.has(i) ? '1.5px solid var(--error)' : '1.5px solid var(--border)',
                    boxShadow: foutieveIndexen.has(i) ? '0 0 0 3px rgba(255,90,90,0.15)' : 'none',
                    textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--white)',
                    fontFamily: "'DM Sans',sans-serif", outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
              ))}
            </div>
            {spelConfig.bonusBal && (
              <>
                <label className="form-label">Bonusbal</label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input
                    type="number" inputMode="numeric" placeholder="Bonusnummer"
                    value={bonusBal} onChange={e => setBonusBal(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{
                      width: '100%', height: 48, borderRadius: 13,
                      background: 'var(--gold-soft)', border: '1.5px solid rgba(240,192,96,0.3)',
                      padding: '0 16px', fontSize: 15, fontWeight: 600, color: 'var(--gold)',
                      fontFamily: "'DM Sans',sans-serif", outline: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>⭐</span>
                </div>
              </>
            )}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--error-soft)', border: '1px solid rgba(255,90,90,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                <span style={{ color: 'var(--error)', fontSize: 13, lineHeight: 1.4 }}>{error}</span>
              </div>
            )}
            <button onClick={handleSave} disabled={bezig} className="btn-primary" style={{ opacity: bezig ? 0.6 : 1 }}>
              {bezig ? '⏳ Verwerken…' : '✓ Trekking opslaan & verwerken'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TrekkingPageContent() {
  const { profile } = useAuth();
  const [trekkingen, setTrekkingen] = useState<Trekking[]>([]);
  const [seizoen, setSeizoen] = useState<Seizoen | null>(null);
  const [spelConfig, setSpelConfig] = useState<SpelConfig>(DEFAULT_SPELCONFIG);
  const [prijsConfig, setPrijsConfig] = useState<PrijsConfig>(DEFAULT_PRIJSCONFIG);
  const [laden, setLaden] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const kanInvoeren = profile?.rol === 'beheerder';

  useEffect(() => {
    const u1 = subscribeAlleTrekkingen(data => { setTrekkingen(data); setLaden(false); });
    const u2 = subscribeSeizoen(setSeizoen);
    const u3 = subscribeSpelConfig(setSpelConfig);
    const u4 = subscribePrijsConfig(setPrijsConfig);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5 }}>Trekkingen</div>
          {kanInvoeren && (
            <button onClick={() => setModalOpen(true)} style={{ height: 40, padding: '0 16px', borderRadius: 13, background: 'linear-gradient(135deg,#4a9eff,#2070cc)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', boxShadow: '0 4px 14px rgba(74,158,255,0.3)' }}>
              + Invoeren
            </button>
          )}
        </div>

        {seizoen && (
          <div style={{ margin: '0 20px 16px' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>🎱</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>{seizoen.naam}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{spelConfig.naam} · {spelConfig.aantalGetallen} uit {spelConfig.maxGetal}</div>
              </div>
              <span className="badge badge-green" style={{ marginLeft: 'auto', flexShrink: 0 }}>● Actief</span>
            </div>
          </div>
        )}

        {laden && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!laden && trekkingen.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 14 }}>
            Nog geen trekkingen.{kanInvoeren ? ' Klik "+ Invoeren" om de eerste trekking in te voeren.' : ''}
          </div>
        )}

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
          {trekkingen.map(t => (
            <Link key={t.id} href={`/trekkingen/${t.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{formatDatum(t.datum)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Ingevoerd door {t.ingevoerdDoorNaam}</div>
                  </div>
                  <span className={`badge ${t.verwerkt ? 'badge-green' : 'badge-warning'}`}>
                    {t.verwerkt ? '✓ Verwerkt' : '⏳ Bezig'}
                  </span>
                </div>
                <TrekkingBallen nummers={t.nummers} bonusBal={t.bonusBal} />
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Bekijk resultaten →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <nav className="bottom-nav">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${'active' in item && item.active ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-dot" />
          </Link>
        ))}
      </nav>

      <TrekkingInvoerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        seizoen={seizoen}
        spelConfig={spelConfig}
        prijsConfig={prijsConfig}
      />
    </>
  );
}

export default function TrekkingPage() {
  return (
    <ProtectedRoute>
      <TrekkingPageContent />
    </ProtectedRoute>
  );
}
