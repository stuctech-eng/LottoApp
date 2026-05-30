'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [toonWachtwoord, setToonWachtwoord] = useState(false);
  const [laden, setLaden] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaden(true);
    await new Promise(r => setTimeout(r, 800));
    router.push('/dashboard');
  };

  return (
    <>
      <div className="bg-grid" />
      <div className="relative z-10 min-h-dvh flex flex-col">

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
          <div className="text-5xl mb-4 animate-pop-in">🎱</div>
          <h1 className="font-serif text-[40px] tracking-[-1.5px] text-white mb-2">LottoClub</h1>
          <p className="text-[#7a9ab8] text-[15px] text-center mb-10">Jouw digitale lottovereniging</p>

          {/* Live stats */}
          <div className="w-full max-w-sm grid grid-cols-3 gap-3 mb-10">
            {[
              { value: '€1.247', label: 'Huidige pot' },
              { value: '17', label: 'Deelnemers' },
              { value: '1 dag', label: 'Tot trekking' },
            ].map((s) => (
              <div key={s.label} className="bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[14px] p-3 text-center">
                <div className="text-[18px] font-bold text-[#f0c060]">{s.value}</div>
                <div className="text-[10px] text-[#7a9ab8] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
                className="w-full bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[14px] px-4 py-[14px] text-[15px] text-white placeholder-[#7a9ab8] outline-none focus:border-[#4a9eff] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#7a9ab8] mb-2">Wachtwoord</label>
              <div className="relative">
                <input
                  type={toonWachtwoord ? 'text' : 'password'}
                  value={wachtwoord}
                  onChange={e => setWachtwoord(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#132233] border border-[rgba(74,158,255,0.13)] rounded-[14px] px-4 py-[14px] text-[15px] text-white placeholder-[#7a9ab8] outline-none focus:border-[#4a9eff] transition-colors pr-12"
                  required
                />
                <button type="button" onClick={() => setToonWachtwoord(!toonWachtwoord)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7a9ab8] text-[18px]">
                  {toonWachtwoord ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={laden}
              className="w-full bg-gradient-to-br from-[#4a9eff] to-[#2070cc] text-white rounded-[16px] py-[18px] text-[16px] font-semibold shadow-[0_8px_24px_rgba(74,158,255,0.3)] disabled:opacity-60 mt-2"
            >
              {laden ? '⏳ Inloggen…' : 'Inloggen →'}
            </button>

            <button type="button"
              className="w-full bg-[#132233] border border-[rgba(74,158,255,0.13)] text-[#4a9eff] rounded-[16px] py-[16px] text-[15px] font-semibold">
              ✉️ Magic link sturen
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-[#7a9ab8] pb-8">
          Nog geen account? Vraag je kashouder om een uitnodiging.
        </p>
      </div>
    </>
  );
}
