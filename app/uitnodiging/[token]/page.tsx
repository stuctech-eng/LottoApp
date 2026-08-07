'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { haalUitnodigingOp, isUitnodigingGeldig, verzilverUitnodiging, Uitnodiging } from '@/lib/firestore-invites';

/**
 * De ENIGE plek waar iemand nieuw lid kan worden — puur via een
 * geldig, niet-verlopen, nog niet gebruikt uitnodigingstoken.
 *
 * Volgorde: token opslaan → lid kiest inlogmethode (Google, e-mail +
 * wachtwoord, magic-link) → NA succesvol inloggen wordt het token
 * pas gecontroleerd en het Firestore-profiel pas aangemaakt, via de
 * Cloud Function verzilverUitnodiging (nooit client-side, dat moet
 * atomisch en server-side blijven — zie functions/src/index.ts).
 */
export default function UitnodigingPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { user, loading, profile, profileLoading, registerWithEmail, loginWithGoogle, sendMagicLink, completeMagicLinkSignIn } = useAuth();

  // Vroege, puur informatieve check van de uitnodiging zelf — voor
  // UX ("deze link lijkt niet meer geldig"), NIET de uiteindelijke
  // beveiliging. De echte, doorslaggevende validatie gebeurt altijd
  // opnieuw, server-side, in de Cloud Function bij het verzilveren.
  const [uitnodiging, setUitnodiging] = useState<Uitnodiging | null>(null);
  const [uitnodigingGeladen, setUitnodigingGeladen] = useState(false);

  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [naam, setNaam] = useState('');
  const [toonWachtwoord, setToonWachtwoord] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [pwError, setPwError] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  const [verzilverBezig, setVerzilverBezig] = useState(false);
  const [verzilverFout, setVerzilverFout] = useState<string | null>(null);
  const [verzilverSucces, setVerzilverSucces] = useState(false);
  const verzilverGestart = useRef(false);
  const magicLinkHandled = useRef(false);

  // Uitnodiging vroeg ophalen, puur voor UX-feedback
  useEffect(() => {
    if (!token) return;
    haalUitnodigingOp(token).then(u => {
      setUitnodiging(u);
      setUitnodigingGeladen(true);
    });
  }, [token]);

  // Token bewaren zodat het een Google-redirect overleeft (voor het
  // geval de route-parameter zelf onderweg verloren zou gaan —
  // dubbele zekerheid naast Firebase's eigen redirect-terugkeer-URL).
  useEffect(() => {
    if (token) window.sessionStorage.setItem('pendingInviteToken', token);
  }, [token]);

  // Magic link afhandelen bij terugkeer op deze pagina
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
        } catch {
          setFoutmelding('Magic link verlopen of ongeldig');
        } finally {
          setBezig(false);
        }
      }
    };
    handleMagicLink();
  }, [completeMagicLinkSignIn]);

  // Randgeval: een bestaand lid opent per ongeluk (of nieuwsgierig)
  // een uitnodigingslink — gewoon doorsturen naar het dashboard in
  // plaats van het inlogformulier te tonen, dat zou verwarrend zijn.
  //
  // KRITIEK: verzilverGestart.current moet hier expliciet worden
  // uitgesloten. Zonder die check triggerde dit OOK voor een
  // GLOEDNIEUW lid — zodra hun profiel via de Cloud Function is
  // aangemaakt en de listener dat oppikt, is de combinatie
  // "user + profile bestaan beide" identiek aan een bestaand lid, en
  // won deze navigatie de race van de eigenlijke welkom-navigatie
  // hieronder. Gevolg: nieuwe leden kwamen rechtstreeks op het
  // dashboard terecht, zonder ooit de onboarding te zien — gevonden
  // via een echte test met een gloednieuw account.
  useEffect(() => {
    if (!loading && !profileLoading && user && profile && !verzilverGestart.current) {
      router.push('/dashboard');
    }
  }, [user, profile, loading, profileLoading, router]);

  // Zodra er een Firebase Auth-user is maar nog geen profiel: dit is
  // het moment om de uitnodiging te verzilveren. Eenmalig, via de ref.
  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user || profile) return;
    if (verzilverGestart.current) return;
    verzilverGestart.current = true;

    setVerzilverBezig(true);
    verzilverUitnodiging(token, naam.trim() || undefined).then(resultaat => {
      setVerzilverBezig(false);
      if (resultaat.succes) {
        window.sessionStorage.removeItem('pendingInviteToken');
        setVerzilverSucces(true);
        // GEEN router.push hier — zie de aparte useEffect hieronder.
        // De Cloud Function heeft het profiel op dat moment al
        // daadwerkelijk in Firestore aangemaakt, maar de EIGEN
        // realtime-listener van deze pagina (via useAuth's profile)
        // kan daar nog een fractie van een seconde achteraan lopen.
        // Direct doorsturen zou /welkom kunnen laten aankomen vóórdat
        // profile lokaal is bijgewerkt — met "Geen toegang" tot
        // gevolg, ook al is de registratie allang gelukt. Vandaar:
        // pas navigeren zodra profile hier zelf ook echt niet-null is.
      } else {
        setVerzilverFout(resultaat.foutmelding ?? 'Verzilveren van de uitnodiging is mislukt.');
      }
    });
  }, [user, profile, loading, profileLoading, token, naam, router]);

  // Navigeer pas ECHT zodra het eigen profiel is bijgewerkt — dat is
  // het bewijs dat de realtime-listener de nieuwe data heeft
  // opgepikt, niet alleen dat de server-kant klaar is.
  useEffect(() => {
    if (verzilverSucces && profile) {
      router.push('/welkom');
    }
  }, [verzilverSucces, profile, router]);

  const handleEmailAuth = async () => {
    let ok = true;
    if (!email || !email.includes('@')) { setEmailError(true); ok = false; } else setEmailError(false);
    if (!wachtwoord || wachtwoord.length < 6) { setPwError(true); ok = false; } else setPwError(false);
    if (!naam.trim()) ok = false;
    if (!ok) return;

    setBezig(true);
    setFoutmelding(null);
    try {
      await registerWithEmail(email, wachtwoord);
      // Navigatie/verzilvering gebeurt via de useEffect hierboven,
      // die reageert zodra 'user' truthy wordt.
    } catch (err: any) {
      let msg = 'Account aanmaken mislukt';
      if (err.code === 'auth/email-already-in-use') msg = 'Dit e-mailadres heeft al een account — probeer in te loggen via de gewone inlogpagina, of gebruik Google/magic-link hieronder.';
      else if (err.code === 'auth/weak-password') msg = 'Wachtwoord moet minimaal 6 tekens zijn';
      else if (err.code === 'auth/invalid-email') msg = 'Ongeldig e-mailadres';
      setFoutmelding(msg);
    } finally {
      setBezig(false);
    }
  };

  const handleGoogle = async () => {
    setBezig(true);
    setFoutmelding(null);
    try {
      await loginWithGoogle();
    } catch {
      setFoutmelding('Google inloggen mislukt');
      setBezig(false);
    }
  };

  const handleMagicLinkRequest = async () => {
    if (!email || !email.includes('@')) {
      setEmailError(true);
      setFoutmelding('Vul eerst je e-mailadres in');
      return;
    }
    setBezig(true);
    setFoutmelding(null);
    try {
      await sendMagicLink(email);
      setMagicLinkSent(true);
    } catch {
      setFoutmelding('Versturen mislukt, probeer opnieuw');
    } finally {
      setBezig(false);
    }
  };

  // ── Render: uitnodiging nog aan het laden ──
  if (!uitnodigingGeladen) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy, #0d1b2a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(74,158,255,0.15)', borderTopColor: '#4a9eff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render: uitnodiging bestaat niet of is overduidelijk ongeldig (vroege UX-check) ──
  if (!uitnodiging || !isUitnodigingGeldig(uitnodiging)) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0d1b2a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, marginBottom: 12 }}>Uitnodiging ongeldig</div>
        <div style={{ fontSize: 14, color: '#7a9ab8', lineHeight: 1.7, maxWidth: 320 }}>
          Deze uitnodiging is verlopen of al gebruikt. Vraag de beheerder om een nieuwe link.
        </div>
      </div>
    );
  }

  // ── Render: bestaand lid, wordt doorgestuurd (zie useEffect hierboven) ──
  if (!loading && !profileLoading && user && profile) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0d1b2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(74,158,255,0.15)', borderTopColor: '#4a9eff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render: bezig met verzilveren na succesvol inloggen ──
  if (user && !profile && (verzilverBezig || !verzilverFout)) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0d1b2a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(74,158,255,0.15)', borderTopColor: '#4a9eff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 14, color: '#7a9ab8' }}>Je lidmaatschap wordt geactiveerd…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render: verzilveren is mislukt ──
  if (verzilverFout) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0d1b2a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>⚠️</div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, marginBottom: 12 }}>Kon niet worden verzilverd</div>
        <div style={{ fontSize: 14, color: '#7a9ab8', lineHeight: 1.7, maxWidth: 320 }}>{verzilverFout}</div>
      </div>
    );
  }

  // ── Render: inlogformulier ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; background: #0d1b2a; color: #f8fafc; font-family: 'DM Sans', sans-serif; }
        .content { min-height: 100dvh; display: flex; flex-direction: column; padding: env(safe-area-inset-top, 24px) 28px env(safe-area-inset-bottom, 24px); justify-content: center; }
        .form-group { margin-bottom: 10px; }
        .form-label { font-size: 11px; font-weight: 500; color: #7a9ab8; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
        .form-input { width: 100%; background: #132233; border: 1.5px solid rgba(74,158,255,0.15); border-radius: 14px; padding: 14px 18px; font-size: 16px; color: #f8fafc; font-family: 'DM Sans', sans-serif; outline: none; -webkit-appearance: none; }
        .form-input.error { border-color: #ff5a5a; }
        .input-wrapper { position: relative; }
        .input-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 16px; opacity: 0.5; cursor: pointer; background: none; border: none; color: #f8fafc; }
        .btn-primary { width: 100%; background: linear-gradient(135deg, #4a9eff 0%, #2070cc 100%); color: #f8fafc; border: none; border-radius: 16px; padding: 16px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 6px; -webkit-appearance: none; }
        .btn-primary:disabled { opacity: 0.6; }
        .divider { display: flex; align-items: center; gap: 14px; margin: 14px 0; color: #7a9ab8; font-size: 13px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(74,158,255,0.15); }
        .btn-ghost { width: 100%; background: #132233; border: 1.5px solid rgba(74,158,255,0.15); color: #7a9ab8; border-radius: 16px; padding: 14px; font-size: 15px; font-weight: 500; cursor: pointer; -webkit-appearance: none; margin-bottom: 8px; }
        .btn-ghost:disabled { opacity: 0.5; }
      `}</style>
      <div className="content">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎱</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, marginBottom: 8 }}>Je bent uitgenodigd</div>
          <div style={{ fontSize: 13, color: '#7a9ab8', lineHeight: 1.6 }}>
            {uitnodiging.aangemaaktDoorNaam} heeft je uitgenodigd voor LottoClub.<br />Maak hieronder je account aan.
          </div>
        </div>

        {foutmelding && (
          <div style={{ background: 'rgba(255,90,90,0.1)', border: '1px solid rgba(255,90,90,0.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#ff5a5a' }}>
            ⚠️ {foutmelding}
          </div>
        )}

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
        <div className="form-group">
          <label className="form-label">E-MAILADRES</label>
          <input
            type="email"
            className={`form-input ${emailError ? 'error' : ''}`}
            placeholder="naam@voorbeeld.nl"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(false); }}
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label className="form-label">WACHTWOORD</label>
          <div className="input-wrapper">
            <input
              type={toonWachtwoord ? 'text' : 'password'}
              className={`form-input ${pwError ? 'error' : ''}`}
              placeholder="Kies een wachtwoord (min. 6 tekens)"
              value={wachtwoord}
              onChange={e => { setWachtwoord(e.target.value); setPwError(false); }}
              style={{ paddingRight: 48 }}
              autoComplete="new-password"
            />
            <button className="input-icon" onClick={() => setToonWachtwoord(!toonWachtwoord)} type="button">
              {toonWachtwoord ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <button className="btn-primary" onClick={handleEmailAuth} disabled={bezig}>
          {bezig ? 'Even geduld…' : 'Account aanmaken'}
        </button>

        <div className="divider">of</div>

        <button className="btn-ghost" onClick={handleGoogle} disabled={bezig}>
          🔵 Doorgaan met Google
        </button>

        <button className="btn-ghost" onClick={handleMagicLinkRequest} disabled={bezig || magicLinkSent}>
          {magicLinkSent ? '✅ Magic link verstuurd' : '✉️ Inloggen via e-mail link'}
        </button>
      </div>
    </>
  );
}
