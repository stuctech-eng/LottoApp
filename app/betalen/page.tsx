'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Card } from '@/components/ui/Card';

type Stap = 'overzicht' | 'bank' | 'laden' | 'succes' | 'bewijs' | 'succesBewijs';

export default function BetalenPage() {
  const router = useRouter();
  const [stap, setStap] = useState<Stap>('overzicht');
  const [methode, setMethode] = useState<'ideal' | 'bewijs'>('ideal');
  const [bankGekozen, setBankGekozen] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [geupload, setGeupload] = useState(false);

  const startBetaling = () => {
    setStap('laden');
    setTimeout(() => setStap('succes'), 2200);
  };

  const banken = [
    { naam: 'ING', emoji: '🧡', bg: '#ff6600' },
    { naam: 'Rabobank', emoji: '💚', bg: '#009286' },
    { naam: 'ABN AMRO', emoji: '💙', bg: '#009ae0' },
    { naam: 'SNS Bank', emoji: '🔵', bg: '#0066cc' },
    { naam: 'Bunq', emoji: '🟠', bg: '#ea5b0c' },
    { naam: 'Andere bank', emoji: '🏦', bg: '#374151' },
  ];

  if (stap === 'laden') return (
    <div className="min-h-dvh bg-[#0d1b2a] flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-16 h-16 border-[3px] border-[rgba(74,158,255,0.13)] border-t-[#4a9eff] rounded-full animate-spin-slow" />
      <h2 className="font-serif text-[24px]">Betaling verwerken…</h2>
      <p className="text-[14px] text-[#7a9ab8]">Je wordt doorgestuurd naar je bank.<br />Sluit dit scherm niet.</p>
    </div>
  );

  if (stap === 'succes') return (
    <div className="min-h-dvh bg-[#0d1b2a] flex flex-col items-center justify-center text-center px-6">
      <div className="text-[72px] mb-5 animate-pop-in">✅</div>
      <h2 className="font-serif text-[32px] tracking-[-0.8px] mb-2">Betaling geslaagd!</h2>
      <p className="text-[15px] text-[#7a9ab8] mb-8 leading-relaxed">Je betaling is ontvangen.<br />Succes met ronde 22!</p>
      <div className="w-full max-w-sm bg-[#0d2a1a] border border-[rgba(52,201,122,0.2)] rounded-[18px] p-5 mb-8 text-left">
        {[['Bedrag','€4,00 betaald',true],['Methode',`iDEAL · ${selectedBank}`,false],['Ronde','22 · Seizoen 2026',false],['Tijdstip','30 mei 2026 · 11:43',false],['Status','✓ Bevestigd',true]].map(([l,v,g]) => (
          <div key={String(l)} className="flex justify-between py-[6px] border-b border-[rgba(52,201,122,0.1)] last:border-0">
            <span className="text-[13px] text-[#7a9ab8]">{l}</span>
            <span className={`text-[13px] font-semibold ${g ? 'text-[#34c97a]' : 'text-white'}`}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={() => router.push('/dashboard')} className="w-full max-w-sm bg-gradient-to-br from-[#34c97a] to-[#1a8a50] text-white rounded-[16px] py-[18px] text-[16px] font-semibold shadow-[0_8px_24px_rgba(52,201,122,0.3)]">
        ← Terug naar dashboard
      </button>
    </div>
  );

  if (stap === 'succesBewijs') return (
    <div className="min-h-dvh bg-[#0d1b2a] flex flex-col items-center justify-center text-center px-6">
      <div className="text-[72px] mb-5 animate-pop-in">📤</div>
      <h2 className="font-serif text-[32px] tracking-[-0.8px] mb-2">Bewijs verstuurd!</h2>
      <p className="text-[15px] text-[#7a9ab8] mb-8 leading-relaxed">De kashouder verifieert<br />dit zo snel mogelijk.</p>
      <div className="w-full max-w-sm bg-[#2a1c00] border border-[rgba(255,170,51,0.2)] rounded-[18px] p-5 mb-8 text-left">
        <div className="flex justify-between py-[6px]"><span className="text-[13px] text-[#7a9ab8]">Status</span><span className="text-[13px] font-semibold text-[#ffaa33]">⏳ In verificatie</span></div>
        <div className="flex justify-between py-[6px]"><span className="text-[13px] text-[#7a9ab8]">Verstuurd</span><span className="text-[13px] font-semibold text-white">30 mei 2026 · 11:43</span></div>
      </div>
      <button onClick={() => router.push('/dashboard')} className="w-full max-w-sm bg-gradient-to-br from-[#34c97a] to-[#1a8a50] text-white rounded-[16px] py-[18px] text-[16px] font-semibold">← Terug naar dashboard</button>
    </div>
  );

  return (
    <PageWrapper>
      <div className="min-h-dvh flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-[max(16px,env(safe-area-inset-top))] pb-5">
          <button onClick={() => stap === 'bank' || stap === 'bewijs' ? setStap('overzicht') : router.push('/dashboard')}
            className="w-9 h-9 rounded-[11px] bg-[rgba(255,255,255,0.08)] border border-[rgba(74,158,255,0.13)] flex items-center justify-center text-lg flex-shrink-0">←</button>
          <h1 className="font-serif text-[24px] tracking-[-0.3px]">
            {stap === 'bank' ? 'Kies je bank' : stap === 'bewijs' ? 'Bewijs uploaden' : 'Betaling ronde 22'}
          </h1>
        </div>

        {stap === 'overzicht' && <>
          {/* Bedrag card */}
          <div className="px-5 mb-5">
            <div className="bg-gradient-to-br from-[#1a3a5c] to-[#0f2438] border border-[rgba(74,158,255,0.22)] rounded-[22px] p-6 text-center relative overflow-hidden">
              <div className="absolute top-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(74,158,255,0.15) 0%,transparent 70%)' }} />
              <div className="text-[40px] mb-3">💰</div>
              <div className="text-[12px] font-semibold tracking-[1.5px] uppercase text-[#4a9eff] mb-2">Te betalen</div>
              <div className="font-serif text-[56px] tracking-[-2px] leading-none mb-1">€4</div>
              <div className="text-[14px] text-[#7a9ab8] mb-4">Ronde 22 · Seizoen 2026</div>
              <div className="inline-flex items-center gap-2 bg-[#2a1c00] border border-[rgba(255,170,51,0.2)] text-[#ffaa33] text-[12px] font-semibold px-[14px] py-[6px] rounded-full">⏰ Sluiting vrijdag 5 juni 18:00</div>
            </div>
          </div>

          <div className="px-5 mb-5">
            <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Rondedetails</div>
            <Card className="overflow-hidden">
              {[['Ronde','22'],['Inleg','€4,00'],['Trekking','Za 31 mei 2026'],['Huidige pot','€1.247'],['Deelnemers','17']].map(([l,v]) => (
                <div key={l} className="flex items-center justify-between px-[18px] py-[14px] border-b border-[rgba(74,158,255,0.06)] last:border-0">
                  <span className="text-[13px] text-[#7a9ab8]">{l}</span>
                  <span className={`text-[13px] font-semibold ${l==='Huidige pot'?'text-[#f0c060]':'text-white'}`}>{v}</span>
                </div>
              ))}
            </Card>
          </div>

          <div className="px-5 mb-5">
            <div className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#7a9ab8] mb-3">Betaalmethode</div>
            {[
              { id: 'ideal', emoji: '💳', bg: '#cc0066', naam: 'iDEAL', sub: 'Directe betaling · Automatisch bevestigd' },
              { id: 'bewijs', emoji: '📷', bg: '#2a1c00', naam: 'Betaalbewijs uploaden', sub: 'Handmatige verificatie door kashouder' },
            ].map((m) => (
              <div key={m.id} onClick={() => setMethode(m.id as 'ideal' | 'bewijs')}
                className={`flex items-center gap-[14px] p-4 rounded-[16px] mb-[10px] cursor-pointer border transition-all ${methode === m.id ? 'bg-[#1e3a5f] border-[#4a9eff]' : 'bg-[#132233] border-[rgba(74,158,255,0.13)]'}`}>
                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px] flex-shrink-0" style={{ background: m.bg }}>{m.emoji}</div>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">{m.naam}</div>
                  <div className="text-[12px] text-[#7a9ab8] mt-0.5">{m.sub}</div>
                </div>
                {methode === m.id && <span>✅</span>}
              </div>
            ))}
          </div>

          <div className="flex-1" />
          <div className="px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
            <button onClick={() => methode === 'ideal' ? setStap('bank') : setStap('bewijs')}
              className="w-full bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white rounded-[16px] py-[18px] text-[16px] font-semibold shadow-[0_8px_24px_rgba(74,158,255,0.3)]">
              Betaal €4,00 →
            </button>
          </div>
        </>}

        {stap === 'bank' && <>
          <p className="px-6 text-[13px] text-[#7a9ab8] mb-5">Selecteer je bank om door te gaan met iDEAL.</p>
          <div className="grid grid-cols-2 gap-[10px] px-5 mb-5">
            {banken.map((b) => (
              <button key={b.naam} onClick={() => { setSelectedBank(b.naam); setBankGekozen(true); }}
                className={`flex flex-col items-center gap-2 p-[18px_14px] rounded-[16px] border transition-all ${selectedBank === b.naam ? 'bg-[#1e3a5f] border-[#4a9eff]' : 'bg-[#132233] border-[rgba(74,158,255,0.13)]'}`}>
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[24px]" style={{ background: b.bg }}>{b.emoji}</div>
                <span className="text-[14px] font-semibold">{b.naam}</span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
            <button onClick={startBetaling} disabled={!bankGekozen}
              className={`w-full bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white rounded-[16px] py-[18px] text-[16px] font-semibold shadow-[0_8px_24px_rgba(74,158,255,0.3)] transition-opacity ${!bankGekozen ? 'opacity-40' : ''}`}>
              Bevestig bank & betaal
            </button>
          </div>
        </>}

        {stap === 'bewijs' && <>
          <p className="px-6 text-[13px] text-[#7a9ab8] mb-5">Maak een foto van je betaalbewijs of upload een screenshot.</p>
          <div className="mx-5 border-2 border-dashed border-[rgba(255,170,51,0.3)] rounded-[16px] p-8 text-center cursor-pointer mb-5"
            onClick={() => setGeupload(true)}>
            <div className="text-[40px] mb-3">{geupload ? '✅' : '📷'}</div>
            <div className="text-[15px] font-semibold mb-1">{geupload ? 'bewijs_betaling.jpg geüpload' : 'Tik om foto te uploaden'}</div>
            <div className="text-[13px] text-[#7a9ab8]">{geupload ? 'Klaar voor verzending' : 'JPG, PNG of PDF · Max 10MB'}</div>
          </div>
          <div className="flex-1" />
          <div className="px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
            <button onClick={() => setStap('succesBewijs')}
              className="w-full text-white rounded-[16px] py-[18px] text-[16px] font-semibold shadow-[0_8px_24px_rgba(255,170,51,0.25)]"
              style={{ background: 'linear-gradient(135deg,#ffaa33 0%,#c07000 100%)' }}>
              📤 Bewijs opsturen
            </button>
          </div>
        </>}
      </div>
    </PageWrapper>
  );
}
