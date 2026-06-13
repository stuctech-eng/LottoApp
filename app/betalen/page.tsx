'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Stap = 'overzicht' | 'bank' | 'laden' | 'succes' | 'bewijs' | 'succesBewijs';

const banken = [
  { naam:'ING', emoji:'🧡', bg:'#ff6600' },
  { naam:'Rabobank', emoji:'💚', bg:'#009286' },
  { naam:'ABN AMRO', emoji:'💙', bg:'#009ae0' },
  { naam:'SNS Bank', emoji:'🔵', bg:'#0066cc' },
  { naam:'Bunq', emoji:'🟠', bg:'#ea5b0c' },
  { naam:'Andere bank', emoji:'🏦', bg:'#374151' },
];

function BetalenPageContent() {
  const router = useRouter();
  const [stap, setStap] = useState<Stap>('overzicht');
  const [methode, setMethode] = useState<'ideal'|'bewijs'>('ideal');
  const [selectedBank, setSelectedBank] = useState('');
  const [geupload, setGeupload] = useState(false);

  const startBetaling = () => {
    setStap('laden');
    setTimeout(() => setStap('succes'), 2200);
  };

  if (stap === 'laden') return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center', padding: '0 24px' }}>
      <div style={{ width: 64, height: 64, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24 }}>Betaling verwerken…</div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>Je wordt doorgestuurd naar je bank.<br />Sluit dit scherm niet.</div>
    </div>
  );

  if (stap === 'succes') return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>✅</div>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Betaling geslaagd!</div>
      <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>Je betaling is ontvangen.<br />Succes met ronde 22!</div>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--success-soft)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
        {[['Bedrag','€4,00 betaald',true],['Methode',`iDEAL · ${selectedBank}`,false],['Ronde','22 · Seizoen 2026',false],['Tijdstip','30 mei 2026 · 11:43',false],['Status','✓ Bevestigd',true]].map(([l,v,g]) => (
          <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(52,201,122,0.1)' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{l}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: g ? 'var(--success)' : 'var(--white)' }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={() => router.push('/dashboard')} style={{ width: '100%', maxWidth: 380, background: 'linear-gradient(135deg,var(--success),#1a8a50)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>← Terug naar dashboard</button>
    </div>
  );

  if (stap === 'succesBewijs') return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>📤</div>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Bewijs verstuurd!</div>
      <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>De kashouder verifieert<br />dit zo snel mogelijk.</div>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 18, padding: 20, marginBottom: 32, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Status</span><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>⏳ In verificatie</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Verstuurd</span><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>30 mei 2026 · 11:43</span></div>
      </div>
      <button onClick={() => router.push('/dashboard')} style={{ width: '100%', maxWidth: 380, background: 'linear-gradient(135deg,var(--success),#1a8a50)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>← Terug naar dashboard</button>
    </div>
  );

  const back = () => { if (stap === 'bank' || stap === 'bewijs') setStap('overzicht'); else router.push('/dashboard'); };

  return (
    <>
      <div className="bg-grid" />
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 20px' }}>
          <button onClick={back} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: 'var(--white)', flexShrink: 0 }}>←</button>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.3 }}>{stap==='bank'?'Kies je bank':stap==='bewijs'?'Bewijs uploaden':'Betaling ronde 22'}</div>
        </div>

        {stap === 'overzicht' && <>
          <div style={{ margin: '0 20px 20px' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#0f2438)', border: '1px solid rgba(74,158,255,0.22)', borderRadius: 22, padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)', borderRadius: '50%' }} />
              <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Te betalen</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 52, letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>€4</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>Ronde 22 · Seizoen 2026</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', color: 'var(--warning)', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20 }}>⏰ Sluiting vrijdag 5 juni 18:00</div>
            </div>
          </div>

          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div className="section-title">Betaalmethode</div>
            {[{id:'ideal',emoji:'💳',bg:'#cc0066',naam:'iDEAL',sub:'Directe betaling · Automatisch bevestigd'},{id:'bewijs',emoji:'📷',bg:'var(--warning-soft)',naam:'Betaalbewijs uploaden',sub:'Handmatige verificatie door kashouder'}].map(m => (
              <div key={m.id} onClick={() => setMethode(m.id as 'ideal'|'bewijs')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, marginBottom: 10, cursor: 'pointer', border: `1.5px solid ${methode===m.id?'var(--accent)':'var(--border)'}`, background: methode===m.id?'var(--accent-soft)':'var(--surface)', transition: 'all 0.2s' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{m.naam}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.sub}</div>
                </div>
                {methode===m.id && <span>✅</span>}
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <div style={{ padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
            <button onClick={() => methode==='ideal'?setStap('bank'):setStap('bewijs')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', boxShadow: '0 8px 24px rgba(74,158,255,0.3)' }}>Betaal €4,00 →</button>
          </div>
        </>}

        {stap === 'bank' && <>
          <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--muted)' }}>Selecteer je bank om door te gaan met iDEAL.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px', marginBottom: 20 }}>
            {banken.map(b => (
              <button key={b.naam} onClick={() => setSelectedBank(b.naam)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 12px', borderRadius: 16, border: `1.5px solid ${selectedBank===b.naam?'var(--accent)':'var(--border)'}`, background: selectedBank===b.naam?'var(--accent-soft)':'var(--surface)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'DM Sans',sans-serif" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{b.emoji}</div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{b.naam}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
            <button onClick={startBetaling} disabled={!selectedBank} style={{ width: '100%', background: 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: selectedBank?1:0.4 }}>Bevestig bank & betaal</button>
          </div>
        </>}

        {stap === 'bewijs' && <>
          <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--muted)' }}>Maak een foto van je betaalbewijs of upload een screenshot.</div>
          <div onClick={() => setGeupload(true)} style={{ margin: '0 20px 20px', border: '2px dashed rgba(255,170,51,0.3)', borderRadius: 16, padding: 32, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{geupload?'✅':'📷'}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{geupload?'bewijs_betaling.jpg geüpload':'Tik om foto te uploaden'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{geupload?'Klaar voor verzending':'JPG, PNG of PDF · Max 10MB'}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
            <button onClick={() => setStap('succesBewijs')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--warning),#c07000)', color: 'white', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}>📤 Bewijs opsturen</button>
          </div>
        </>}
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
