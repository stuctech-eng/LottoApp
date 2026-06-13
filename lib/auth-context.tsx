'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';
import { logAudit } from './firestore-audit';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  profile: User | null;
  profileLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, naam: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  completeMagicLinkSignIn: (email: string, link: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Zorgt dat er een gebruikersdocument in Firestore bestaat
async function ensureUserDoc(user: FirebaseUser) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const naam = user.displayName || user.email?.split('@')[0] || 'Nieuw lid';
    await setDoc(ref, {
      naam,
      email: user.email,
      foto: user.photoURL || null,
      rol: 'lid',
      tickets: [],
      lidSinds: serverTimestamp(),
      ranglijstPunten: 0,
      actief: true,
    });
    await logAudit('gebruiker_aangemaakt', `${naam} heeft een account aangemaakt`, { uid: user.uid, naam }, { doelUserId: user.uid });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Verwerk Google redirect resultaat (mobiele Safari)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          ensureUserDoc(result.user);
        }
      })
      .catch((err) => {
        console.error('Google redirect error:', err);
      });

    return unsub;
  }, []);

  // Live luisteren naar het Firestore profiel van de ingelogde gebruiker
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const ref = doc(db, 'users', user.uid);
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
            rol: data.rol ?? 'lid',
            tickets: data.tickets ?? [],
            lidSinds: data.lidSinds ?? null,
            ranglijstPunten: data.ranglijstPunten ?? 0,
            actief: data.actief ?? true,
          });
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      },
      (err) => {
        console.error('Profile listener error:', err);
        setProfileLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string, naam: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      naam,
      email,
      foto: null,
      rol: 'lid',
      tickets: [],
      lidSinds: serverTimestamp(),
      ranglijstPunten: 0,
      actief: true,
    });
    await logAudit('gebruiker_aangemaakt', `${naam} heeft een account aangemaakt`, { uid: cred.user.uid, naam }, { doelUserId: cred.user.uid });
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
    // Resultaat wordt afgehandeld in de useEffect via getRedirectResult
  };

  const sendMagicLink = async (email: string) => {
    const actionCodeSettings = {
      url: `${window.location.origin}/`,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  };

  const completeMagicLinkSignIn = async (email: string, link: string) => {
    if (isSignInWithEmailLink(auth, link)) {
      const result = await signInWithEmailLink(auth, email, link);
      await ensureUserDoc(result.user);
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
    <AuthContext.Provider value={{ user, loading, profile, profileLoading, loginWithEmail, registerWithEmail, loginWithGoogle, sendMagicLink, completeMagicLinkSignIn, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
