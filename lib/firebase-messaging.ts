'use client';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import app from './firebase';

/**
 * VAPID key — nodig voor web push notificaties.
 * Genereer via: Firebase Console → Project Settings → Cloud Messaging →
 * Web Push certificates → Generate key pair
 *
 * Vervang onderstaande placeholder met jouw echte VAPID key.
 */
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

/**
 * Vraag toestemming voor notificaties en sla FCM token op.
 * Geeft het token terug, of null als geen toestemming.
 */
export async function activeerNotificaties(userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) {
    console.warn('Push notificaties worden niet ondersteund door deze browser');
    return null;
  }

  const toestemming = await Notification.requestPermission();
  if (toestemming !== 'granted') {
    console.info('Notificatie-toestemming geweigerd');
    return null;
  }

  try {
    // Registreer service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return null;

    // Sla token op per apparaat (meerdere apparaten per gebruiker)
    const tokenRef = doc(collection(db, `users/${userId}/fcmTokens`), token.slice(0, 20));
    await setDoc(tokenRef, {
      token,
      platform: detectPlatform(),
      aangemaakt: serverTimestamp(),
      actief: true,
    });

    console.info('FCM token opgeslagen:', token.slice(0, 20) + '…');
    return token;
  } catch (err) {
    console.error('FCM token ophalen mislukt:', err);
    return null;
  }
}

/**
 * Verwijder FCM token van dit apparaat (bij uitloggen).
 */
export async function deactiveerNotificaties(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) return;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    const tokenRef = doc(collection(db, `users/${userId}/fcmTokens`), token.slice(0, 20));
    await deleteDoc(tokenRef);
  } catch (err) {
    console.error('FCM token verwijderen mislukt:', err);
  }
}

/**
 * Luister naar notificaties terwijl de app op de voorgrond is.
 * Geeft unsubscribe-functie terug.
 */
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

/**
 * Check of notificaties al zijn ingeschakeld op dit apparaat.
 */
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
