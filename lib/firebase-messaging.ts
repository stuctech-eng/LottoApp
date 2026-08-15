'use client';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import app from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

export async function activeerNotificaties(userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;

  console.log('1. Permission:', Notification.permission);
  console.log('2. Standalone:', window.matchMedia('(display-mode: standalone)').matches);
  console.log('3. PushManager:', !!window.PushManager);
  console.log('4. VAPID:', VAPID_KEY ? VAPID_KEY.slice(0, 15) + '...' : 'LEEG!');

  const toestemming = await Notification.requestPermission();
  console.log('5. Toestemming:', toestemming);
  if (toestemming !== 'granted') return null;

  try {
    // BUGFIX (15 augustus 2026): registreerde eerder een EIGEN, TWEEDE
    // service worker (/firebase-messaging-sw.js) naast de al-actieve
    // Serwist-caching-worker (/serwist/sw.js) — twee workers op
    // hetzelfde origin verdrongen elkaar als "controller", waardoor
    // pushberichten wel aankwamen bij Firebase/Apple maar nooit
    // daadwerkelijk werden getoond. Firebase-messaging zit nu SAMEN
    // met de caching-logica in diezelfde ene Serwist-worker (zie
    // app/sw.ts) — dus hier simpelweg wachten tot díe klaar is, in
    // plaats van een nieuwe, aparte registratie te forceren.
    const registration = await navigator.serviceWorker.ready;
    console.log('6. SW ready:', registration.scope);
    console.log('7. PushManager op SW:', !!registration.pushManager);

    // Test Firestore write los van FCM
    try {
      await setDoc(doc(db, 'debug', 'test'), { tijd: serverTimestamp() });
      console.log('8. Firestore write werkt ✅');
    } catch (e) {
      console.error('8. Firestore write MISLUKT:', e);
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log('9. FCM Token:', token ? token.slice(0, 20) + '...' : 'NULL!');
    if (!token) return null;

    // Volledige token als document ID
    const tokenRef = doc(db, `users/${userId}/fcmTokens/${token}`);
    await setDoc(tokenRef, {
      token,
      platform: detectPlatform(),
      aangemaakt: serverTimestamp(),
      actief: true,
    });
    console.log('10. Token opgeslagen ✅');

    return token;
  } catch (err) {
    console.error('FCM fout:', err);
    return null;
  }
}

export async function deactiveerNotificaties(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    const tokenRef = doc(db, `users/${userId}/fcmTokens/${token}`);
    await deleteDoc(tokenRef);
  } catch (err) {
    console.error('FCM token verwijderen mislukt:', err);
  }
}

export function luisterNaarNotificaties(callback: (title: string, body: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  try {
    const messaging = getMessaging(app);
    const unsub = onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'LottoClub';
      const body = payload.notification?.body ?? '';
      callback(title, body);
    });
    return unsub;
  } catch {
    return () => {};
  }
}

export function notificatiesIngeschakeld(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}

function detectPlatform(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}
