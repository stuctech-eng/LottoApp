'use client';
import { useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import app from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

export default function DebugFcmPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [bezig, setBezig] = useState(false);

  const log = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11,19)} ${msg}`]);
  };

  const runDiagnostiek = async () => {
    setLogs([]);
    setBezig(true);
    try {
      log(`1. User: ${user?.uid ?? 'NIET INGELOGD'}`);
      log(`2. Permission: ${Notification.permission}`);
      log(`3. Standalone: ${window.matchMedia('(display-mode: standalone)').matches}`);
      log(`4. PushManager: ${!!window.PushManager}`);
      log(`5. VAPID: ${VAPID_KEY ? VAPID_KEY.slice(0,20)+'...' : 'LEEG!'}`);

      const perm = await Notification.requestPermission();
      log(`6. Toestemming: ${perm}`);
      if (perm !== 'granted') { log('❌ Stop — geen toestemming'); return; }

      log('7. SW registreren...');
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      log(`8. SW scope: ${reg.scope}`);
      await navigator.serviceWorker.ready;
      log(`9. SW ready, PushManager: ${!!reg.pushManager}`);

      try {
        await setDoc(doc(db, 'debug', 'test'), { tijd: serverTimestamp() });
        log('10. Firestore write ✅');
      } catch (e: unknown) {
        log(`10. Firestore FOUT: ${e instanceof Error ? e.message : String(e)}`);
      }

      log('11. getToken() aanroepen...');
      const messaging = getMessaging(app);
      try {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        });
        log(`12. Token: ${token ? token.slice(0,30)+'...' : 'NULL!'}`);

        if (token && user) {
          await setDoc(doc(db, `users/${user.uid}/fcmTokens/${token}`), {
            token, platform: 'ios', aangemaakt: serverTimestamp(), actief: true,
          });
          log('13. Opgeslagen in Firestore ✅');
        }
      } catch (e: unknown) {
        log(`12. getToken FOUT: ${e instanceof Error ? e.message : String(e)}`);
      }

    } catch (e: unknown) {
      log(`FOUT: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBezig(false);
    }
  };

  return (
    <div style={{ background: '#0d1b2a', minHeight: '100dvh', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))', fontFamily: 'monospace' }}>
      <div style={{ color: '#4a9eff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🔍 FCM Diagnostiek</div>
      <button onClick={runDiagnostiek} disabled={bezig} style={{ width: '100%', padding: 14, background: '#4a9eff', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, marginBottom: 16, opacity: bezig ? 0.6 : 1 }}>
        {bezig ? '⏳ Bezig...' : '▶ Start diagnostiek'}
      </button>
      <div style={{ background: '#132233', borderRadius: 12, padding: 14, minHeight: 300 }}>
        {logs.length === 0 && <div style={{ color: '#7a9ab8', fontSize: 13 }}>Druk op Start om te beginnen...</div>}
        {logs.map((l, i) => (
          <div key={i} style={{ fontSize: 12, color: l.includes('✅') ? '#34c97a' : l.includes('FOUT') || l.includes('NULL') || l.includes('LEEG') || l.includes('❌') ? '#ff5a5a' : '#f8fafc', marginBottom: 6, lineHeight: 1.6, wordBreak: 'break-all' }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
