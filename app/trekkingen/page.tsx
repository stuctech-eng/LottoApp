'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (open) {
      setNummers(Array(spelConfig.aantalGetallen).fill(''));
      setBonusBal('');
      setError(null);
      setSucces(false);
    }
  }, [open, spelConfig.aantalGetallen]);

  if (!open) return null;

  const handleSave = async () => {
    if (!user || !profile) return;
    if (!seizoen) { setError('Geen actief seizoen gevonden. Maak eerst een seizoen aan.'); return; }

    const parsed = nummers.map(n => parseInt(n, 10));
    if (parsed.some(isNaN) || parsed.some(n => n < spelConfig.minGetal || n > spelConfig.maxGetal)) {
      setError(`Vul ${spelConfig.aantalGetallen} geldige nummers in (${spelConfig.minGetal}-${spelConfig.maxGetal})`);
      return;
    }
    if (new Set(parsed).size !== parsed.length) { setError('Nummers moeten uniek zijn'); return; }

    const bonus = spelConfig.bonusBal && bonusBal.trim() !== '' ? parseInt(bonusBal, 10) : null;
    if (spelConfig.bonusBal && bonusBal.trim() !== '' && isNaN(bonus!)) {
      setError('Ongeldige bonusbal'); return;
    }

    setBezig(true);
    setError(null);
    try {
      await slaaTrekkingOpEnVerwerk({
        rondeId: '',
        seizoenId: seizoen.id,
        nummers: parsed,
        bonusBal: bonus,
        ingevoerdDoor: user.uid,
        ingevoerdDoorNaam: profile.naam,
        spelConfig,
        prijsConfig,
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
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 6 }}>🎱 Trekking invoeren</div>
        {seizoen && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{seizoen.naam} · {spelConfig.naam}</div>}

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
                <input key={i} type="number" inputMode="numeric" min={spelConfig.minGetal} max={spelConfig.maxGetal}
                  value={val}
                  onChange={e => { const n = [...nummers]; n[i] = e.target.value; setNummers(n); }}
                  style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--white)', fontFamily: "'DM Sans',sans-serif", outline: 'none' }}
                />
              ))}
            </div>
            {spelConfig.bonusBal && (
              <>
                <label className="form-label">Bonusbal</label>
                <input type="number" inputMode="numeric" placeholder="Bonusnummer" className="form-input" value={bonusBal} onChange={e => setBonusBal(e.target.value)} />
              </>
            )}
            {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
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
