'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, loginWithEmail, registerWithEmail, loginWithGoogle, sendMagicLink, completeMagicLinkSignIn, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [toonWachtwoord, setToonWachtwoord] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [pwError, setPwError] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('Beveiligde verbinding actief');
  const [toastColor, setToastColor] = useState('#34c97a');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [naam, setNaam] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Voorkomt dat de magic-link verwerking (en daarmee de
  // window.prompt() voor het e-mailadres) meerdere keren start
  // binnen dezelfde paginasessie. Zonder deze vlag kan de useEffect
  // hieronder opnieuw triggeren (bijv. als completeMagicLinkSignIn of
  // router een nieuwe referentie krijgt), wat de gebruiker meerdere
  // keren achter elkaar om hetzelfde e-mailadres liet vragen — met als
  // risico dat de link inmiddels verlopen/verbruikt is tegen de tijd
  // dat de daadwerkelijke aanmelding wordt geprobeerd.
  const magicLinkHandled = useRef(false);

  // Redirect als al ingelogd
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Welkomst toast
  useEffect(() => {
    setTimeout(() => {
      setToast(true);
      setTimeout(() => setToast(false), 2800);
    }, 800);
  }, []);

  // Magic link afhandelen bij terugkeer
  useEffect(() => {
    const handleMagicLink = async () => {
      if (typeof window === 'undefined') return;
      if (magicLinkHandled.current) return;

      const link = window.location.href;
      const isLink = link.includes('apiKey') && link.includes('mode=signIn');
      if (!isLink) return;

      magicLinkHandled.current = true;

      let savedEmail = window.localStorage.getItem('emailForSignIn');
      if (!savedEmail) {
        savedEmail = window.prompt('Bevestig je e-mailadres om in te loggen');
      }
      if (savedEmail) {
        setBezig(true);
        try {
          await completeMagicLinkSignIn(savedEmail, link);
          router.push('/dashboard');
        } catch (err) {
          setToastMsg('Magic link verlopen of ongeldig');
          setToastColor('#ff5a5a');
          setToast(true);
          setTimeout(() => setToast(false), 3000);
        } finally {
          setBezig(false);
        }
      }
    };
    handleMagicLink();
  }, [completeMagicLinkSignIn, router]);

  const showToast = (msg: string, color: string) => {
    setToastMsg(msg);
    setToastColor(color);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const handleEmailAuth = async () => {
    let ok = true;
    if (!email || !email.includes('@')) { setEmailError(true); ok = false; } else setEmailError(false);
    if (!wachtwoord || wachtwoord.length < 6) { setPwError(true); ok = false; } else setPwError(false);
    if (mode === 'register' && !naam.trim()) ok = false;
    if (!ok) return;

    setBezig(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, wachtwoord);
      } else {
        await registerWithEmail(email, wachtwoord, naam.trim());
      }
      router.push('/dashboard');
    } catch (err: any) {
      let msg = 'Inloggen mislukt';
      if (err.code === 'auth/user-not-found') msg = 'Geen account gevonden met dit e-mailadres';
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Onjuist wachtwoord';
      else if (err.code === 'auth/email-already-in-use') msg = 'Dit e-mailadres is al in gebruik';
      else if (err.code === 'auth/weak-password') msg = 'Wachtwoord moet minimaal 6 tekens zijn';
      else if (err.code === 'auth/invalid-email') msg = 'Ongeldig e-mailadres';
      showToast(msg, '#ff5a5a');
    } finally {
      setBezig(false);
    }
  };

  const handleGoogle = async () => {
    setBezig(true);
    try {
      await loginWithGoogle();
      // Pagina navigeert weg naar Google — geen verdere code hier nodig.
      // Bij terugkomst pakt de useAuth/redirect-result en de bovenste
      // useEffect (user && router.push('/dashboard')) het verder op.
    } catch (err: any) {
      showToast('Google inloggen mislukt', '#ff5a5a');
      setBezig(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email || !email.includes('@')) {
      setEmailError(true);
      showToast('Vul eerst je e-mailadres in', '#ffaa33');
      return;
    }
    setBezig(true);
    try {
      await resetPassword(email);
      showToast('Reset-link verstuurd! Check je e-mail', '#34c97a');
    } catch (err: any) {
      let msg = 'Versturen mislukt';
      if (err.code === 'auth/user-not-found') msg = 'Geen account met dit e-mailadres';
      showToast(msg, '#ff5a5a');
    } finally {
      setBezig(false);
    }
  };

  const handleMagicLinkRequest = async () => {
    if (!email || !email.includes('@')) {
      setEmailError(true);
      showToast('Vul eerst je e-mailadres in', '#ffaa33');
      return;
    }
    setBezig(true);
    try {
      await sendMagicLink(email);
      setMagicLinkSent(true);
      showToast('Magic link verstuurd! Check je e-mail', '#4a9eff');
    } catch (err) {
      showToast('Versturen mislukt, probeer opnieuw', '#ff5a5a');
    } finally {
      setBezig(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; background: #0d1b2a; color: #f8fafc; font-family: 'DM Sans', sans-serif; overflow: hidden; }
        .screen { height: 100dvh; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .bg-glow { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .bg-glow::before { content: ''; position: absolute; top: -120px; right: -80px; width: 420px; height: 420px; background: radial-gradient(circle, rgba(74,158,255,0.12) 0%, transparent 70%); border-radius: 50%; }
        .bg-glow::after { content: ''; position: absolute; bottom: -60px; left: -100px; width: 340px; height: 340px; background: radial-gradient(circle, rgba(240,192,96,0.06) 0%, transparent 70%); border-radius: 50%; }
        .bg-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(74,158,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,158,255,0.04) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
        .content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100dvh; padding: env(safe-area-inset-top, 16px) 28px env(safe-area-inset-bottom, 16px); justify-content: space-between; overflow-y: auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; }
        .logo-mark { display: flex; align-items: center; gap: 10px; }
        .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #4a9eff 0%, #2070cc 100%); display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 16px rgba(74,158,255,0.35); }
        .logo-text { font-family: 'DM Serif Display', serif; font-size: 20px; letter-spacing: -0.3px; color: #f8fafc; }
        .badge-version { font-size: 11px; font-weight: 500; color: #7a9ab8; background: #1e3a5f; padding: 4px 10px; border-radius: 20px; }
        .hero { padding: 20px 0 0; }
        .hero-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: #4a9eff; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; animation: fadeUp 0.5s ease 0.1s both; }
        .hero-eyebrow::before { content: ''; width: 24px; height: 1.5px; background: #4a9eff; display: inline-block; }
        .hero-title { font-family: 'DM Serif Display', serif; font-size: 38px; line-height: 1.1; letter-spacing: -1px; color: #f8fafc; margin-bottom: 6px; animation: fadeUp 0.5s ease 0.2s both; }
        .hero-title em { font-style: italic; color: #4a9eff; }
        .hero-subtitle { font-size: 14px; color: #7a9ab8; line-height: 1.5; margin-top: 8px; font-weight: 400; animation: fadeUp 0.5s ease 0.3s both; }
        .stats-row { display: flex; gap: 10px; margin-top: 16px; animation: fadeUp 0.5s ease 0.35s both; }
        .stat-pill { flex: 1; background: #132233; border: 1px solid rgba(74,158,255,0.15); border-radius: 14px; padding: 12px 8px; text-align: center; }
        .stat-value { font-size: 18px; font-weight: 600; color: #f8fafc; letter-spacing: -0.5px; }
        .stat-label { font-size: 10px; color: #7a9ab8; margin-top: 3px; font-weight: 400; }
        .form-section { animation: fadeUp 0.5s ease 0.45s both; }
        .mode-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
        .mode-tab { flex: 1; text-align: center; padding: 8px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid rgba(74,158,255,0.15); color: #7a9ab8; background: #132233; }
        .mode-tab.active { color: #4a9eff; border-color: #4a9eff; background: rgba(74,158,255,0.1); }
        .form-group { margin-bottom: 10px; }
        .form-label { font-size: 11px; font-weight: 500; color: #7a9ab8; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
        .form-input { width: 100%; background: #132233; border: 1.5px solid rgba(74,158,255,0.15); border-radius: 14px; padding: 14px 18px; font-size: 16px; color: #f8fafc; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; }
        .form-input::placeholder { color: #7a9ab8; opacity: 0.6; }
        .form-input:focus { border-color: #4a9eff; box-shadow: 0 0 0 3px rgba(74,158,255,0.12); }
        .form-input.error { border-color: #ff5a5a; }
        .input-wrapper { position: relative; }
        .input-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 16px; opacity: 0.5; cursor: pointer; background: none; border: none; color: #f8fafc; }
        .btn-primary { width: 100%; background: linear-gradient(135deg, #4a9eff 0%, #2070cc 100%); color: #f8fafc; border: none; border-radius: 16px; padding: 16px; font-size: 16px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(74,158,255,0.3); transition: transform 0.15s; -webkit-appearance: none; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; }
        .divider { display: flex; align-items: center; gap: 14px; margin: 12px 0; color: #7a9ab8; font-size: 13px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(74,158,255,0.15); }
        .btn-ghost { width: 100%; background: #132233; border: 1.5px solid rgba(74,158,255,0.15); color: #7a9ab8; border-radius: 16px; padding: 14px; font-size: 15px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; -webkit-appearance: none; margin-bottom: 8px; }
        .btn-ghost:active { border-color: #4a9eff; color: #4a9eff; }
        .btn-ghost:disabled { opacity: 0.5; }
        .footer-note { text-align: center; font-size: 12px; color: #7a9ab8; margin-top: 12px; opacity: 0.7; }
        .footer-note a { color: #4a9eff; text-decoration: none; font-weight: 500; cursor: pointer; }
        .toast { position: fixed; top: calc(env(safe-area-inset-top, 20px) + 16px); left: 50%; transform: translateX(-50%) translateY(-100px); background: #243b55; border: 1px solid rgba(74,158,255,0.15); border-radius: 16px; padding: 14px 20px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: #f8fafc; box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 100; white-space: nowrap; transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); max-width: 90vw; overflow: hidden; text-overflow: ellipsis; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        .toast-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className={`toast ${toast ? 'show' : ''}`}>
        <span className="toast-dot" style={{ background: toastColor }} />
        {toastMsg}
      </div>

      <div className="screen">
        <div className="bg-grid" />
        <div className="bg-glow" />
        <div className="content">

          <div className="topbar">
            <div className="logo-mark">
              <div className="logo-icon">🎱</div>
              <span className="logo-text">LottoClub</span>
            </div>
            <span className="badge-version">v1.0</span>
          </div>

          <div className="hero">
            <div className="hero-eyebrow">Vereniging</div>
            <div className="hero-title">Welkom<br />terug<em>.</em></div>
            <div className="hero-subtitle">Beheer je nummers, volg de trekkingen en blijf op de hoogte.</div>
            <div className="stats-row">
              <div className="stat-pill">
                <div className="stat-value" style={{ color: '#f0c060' }}>€1.247</div>
                <div className="stat-label">Huidige pot</div>
              </div>
              <div className="stat-pill">
                <div className="stat-value">17</div>
                <div className="stat-label">Deelnemers</div>
              </div>
              <div className="stat-pill">
                <div className="stat-value" style={{ color: '#34c97a' }}>Za 31 mei</div>
                <div className="stat-label">Volgende trekking</div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="mode-tabs">
              <div className={`mode-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Inloggen</div>
              <div className={`mode-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Account aanmaken</div>
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">NAAM</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Jouw naam"
                  value={naam}
                  onChange={e => setNaam(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">E-MAILADRES</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  className={`form-input ${emailError ? 'error' : ''}`}
                  placeholder="naam@voorbeeld.nl"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(false); }}
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 6 }}>WACHTWOORD</label>
                {mode === 'login' && (
                  <span onClick={handlePasswordReset} style={{ fontSize: 12, color: '#4a9eff', fontWeight: 500, cursor: 'pointer', marginBottom: 6 }}>Vergeten?</span>
                )}
              </div>
              <div className="input-wrapper">
                <input
                  type={toonWachtwoord ? 'text' : 'password'}
                  className={`form-input ${pwError ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={wachtwoord}
                  onChange={e => { setWachtwoord(e.target.value); setPwError(false); }}
                  style={{ paddingRight: '48px' }}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button className="input-icon" onClick={() => setToonWachtwoord(!toonWachtwoord)} type="button">
                  {toonWachtwoord ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button className="btn-primary" onClick={handleEmailAuth} disabled={bezig}>
              {bezig ? 'Even geduld…' : mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
              {!bezig && <span style={{ fontSize: 18 }}>→</span>}
            </button>

            <div className="divider">of</div>

            <button className="btn-ghost" onClick={handleGoogle} disabled={bezig}>
              <span style={{ fontSize: 16 }}>🔵</span>&nbsp; Doorgaan met Google
            </button>

            <button className="btn-ghost" onClick={handleMagicLinkRequest} disabled={bezig || magicLinkSent}>
              {magicLinkSent ? '✅  Magic link verstuurd' : <>✉️&nbsp; Inloggen via e-mail link</>}
            </button>

            {mode === 'login' && (
              <div className="footer-note">
                Nog geen account? <a onClick={() => setMode('register')}>Account aanmaken</a>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
