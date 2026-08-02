'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';
import { normaliseerRol } from './firestore-users';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  profile: User | null;
  profileLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  googleSignInError: string | null;
  clearGoogleSignInError: () => void;
  sendMagicLink: (email: string) => Promise<void>;
  completeMagicLinkSignIn: (email: string, link: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Detecteert of de app draait als standalone PWA (geïnstalleerd op
 * beginscherm), in tegenstelling tot gewone Safari/Chrome browser.
 *
 * BELANGRIJK — waarom dit nodig is:
 * signInWithRedirect() navigeert de hele pagina weg naar Google en
 * terug. In een standalone iOS PWA verliest die navigatie regelmatig
 * de sessie/storage-context, waardoor getRedirectResult() na
 * terugkomst niets vindt — de gebruiker komt dan stil terug op het
 * inlogscherm, ook al was de Google-login zelf wel gelukt.
 * signInWithPopup() blijft binnen dezelfde JS-context (geen volledige
 * paginanavigatie) en werkt daardoor wél betrouwbaar in standalone
 * PWA's. In gewone Safari blijft redirect de juiste keuze (popups
 * zijn daar minder betrouwbaar door pop-upblokkades).
 */
function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return iosStandalone || !!displayModeStandalone;
}

// ensureUserDoc is verwijderd (26 juli 2026) — sinds de invoering van
// het ledenuitnodigingssysteem wordt er nooit meer automatisch een
// /users/{uid}-document aangemaakt bij een eerste login. Dat gebeurt
// voortaan uitsluitend via de Cloud Function verzilverUitnodiging,
// aangeroepen vanuit app/uitnodiging/[token]/page.tsx, en alleen als
// er een geldig, niet-verlopen uitnodigingstoken bij hoort.

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  // Sinds de race-condition-fix (26 juli 2026): profileLoading is GEEN
  // eigen useState meer. Het probleem daarvoor: user en profileLoading
  // werden in twee losse renders bijgewerkt — vlak na het inloggen kon
  // er daardoor kort een render bestaan met een NIEUWE user maar nog
  // de OUDE (stale) profileLoading-waarde (false), wat ProtectedRoute
  // deed concluderen "geen profiel, dus geen toegang" — ook voor
  // bestaande leden, willekeurig, afhankelijk van timing. Door
  // profileLoading elke render opnieuw AF TE LEIDEN (is het laatst
  // opgehaalde profiel echt van déze user?) kan die inconsistente
  // tussenstand nooit meer voorkomen — er is geen aparte state meer
  // die uit sync kan raken.
  const [profileFetchedForUid, setProfileFetchedForUid] = useState<string | null>(null);
  const profileLoading = !!user && profileFetchedForUid !== user.uid;
  const [googleSignInError, setGoogleSignInError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Verwerk Google redirect resultaat (gewone mobiele Safari, niet-PWA).
    // Maakt sinds het uitnodigingssysteem GEEN automatisch profiel meer
    // aan — dat gebeurt uitsluitend via verzilverUitnodiging() na een
    // geldige uitnodigingslink. Zie app/uitnodiging/[token]/page.tsx.
    getRedirectResult(auth)
      .catch((err) => {
        console.error('Google redirect error:', err);
        setGoogleSignInError('Inloggen met Google is niet gelukt. Probeer het opnieuw.');
      });

    return unsub;
  }, []);

  // Live luisteren naar het Firestore profiel van de ingelogde gebruiker
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileFetchedForUid(null);
      return;
    }
    const huidigeUid = user.uid;
    const ref = doc(db, 'users', huidigeUid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            id: snap.id,
            naam: data.naam ?? '',
            email: data.email ?? '',
            telefoon: data.telefoon,
            foto: data.foto ?? null,
            rol: normaliseerRol(data.rol),
            tickets: data.tickets ?? [],
            lidSinds: data.lidSinds ?? null,
            ranglijstPunten: data.ranglijstPunten ?? 0,
            actief: data.actief ?? true,
            lottoSaldo: data.lottoSaldo ?? 0,
            lottoSaldoIntroSeen: data.lottoSaldoIntroSeen ?? false,
            onboardingCompleted: data.onboardingCompleted,
            wachtOpNieuweSpeelreeks: data.wachtOpNieuweSpeelreeks,
          });
        } else {
          setProfile(null);
        }
        setProfileFetchedForUid(huidigeUid);
      },
      (err) => {
        console.error('Profile listener error:', err);
        // Ook bij een fout: markeer als "klaar" voor deze uid, anders
        // blijft profileLoading voor altijd true hangen en komt de
        // gebruiker nooit voorbij het laadscherm.
        setProfileFetchedForUid(huidigeUid);
      }
    );
    return unsub;
  }, [user]);

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // registerWithEmail maakt sinds het uitnodigingssysteem alleen nog
  // het Firebase Auth-account zelf aan — GEEN Firestore /users/{uid}
  // meer. Dat gebeurt uitsluitend via verzilverUitnodiging() op de
  // uitnodigingspagina, na een geldig token (die functie accepteert
  // daar zelf een optioneel 'naam'-veld voor precies dit scenario).
  const registerWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  /**
   * Kiest automatisch popup (standalone PWA) of redirect (gewone browser).
   * Zie isStandalonePwa() hierboven voor de reden.
   */
  const loginWithGoogle = async () => {
    setGoogleSignInError(null);
    const provider = new GoogleAuthProvider();

    if (isStandalonePwa()) {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error('Google popup sign-in error:', err);
        setGoogleSignInError('Inloggen met Google is niet gelukt. Probeer het opnieuw.');
      }
      return;
    }

    // Gewone Safari/Chrome: redirect blijft de betrouwbare methode
    await signInWithRedirect(auth, provider);
    // Resultaat wordt afgehandeld in de useEffect via getRedirectResult
  };

  const clearGoogleSignInError = () => setGoogleSignInError(null);

  const sendMagicLink = async (email: string) => {
    // Terugkeer-URL is de HUIDIGE pagina, niet altijd de root — nodig
    // zodat een magic-link vanaf de uitnodigingspagina ook weer daar
    // uitkomt, anders raakt het uitnodigingstoken onderweg kwijt.
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  };

  const completeMagicLinkSignIn = async (email: string, link: string) => {
    if (isSignInWithEmailLink(auth, link)) {
      await signInWithEmailLink(auth, email, link);
      window.localStorage.removeItem('emailForSignIn');
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, profile, profileLoading, loginWithEmail, registerWithEmail, loginWithGoogle, googleSignInError, clearGoogleSignInError, sendMagicLink, completeMagicLinkSignIn, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
