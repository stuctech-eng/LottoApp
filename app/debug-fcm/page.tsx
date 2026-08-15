'use client';
import { useState, useEffect } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsInstance } from '@/lib/firebase';
import app from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

interface ZaterdagStatus {
  laatsteRun?: Timestamp;
  succes: boolean;
  foutmelding: string | null;
  aantalGebruikersGevonden?: number;
  aantalMetTicket?: number;
  aantalNietWachtend?: number;
  aantalMetToken?: number;
  aantalVerstuurd?: number;
  details?: { userId: string; naam: string; reden: string }[];
}

function DebugFcmContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [bezig, setBezig] = useState(false);

  const log = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11,19)} ${msg}`]);
  };

  const [testBezig, setTestBezig] = useState(false);
  const [testResultaat, setTestResultaat] = useState<string | null>(null);

  const stuurTest = async () => {
    setTestBezig(true);
    setTestResultaat(null);
    try {
      const fn = httpsCallable<Record<string, never>, { succes: boolean; foutmelding?: string; aantalTokens?: number }>(functionsInstance, 'stuurTestNotificatie');
      const result = await fn({});
      if (result.data.succes) {
        setTestResultaat(`✅ Verstuurd naar ${result.data.aantalTokens} token(s). Kijk of de melding binnenkomt (kan enkele seconden duren).`);
      } else {
        setTestResultaat(`⚠️ ${result.data.foutmelding}`);
      }
    } catch (e: unknown) {
      setTestResultaat(`❌ Mislukt: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTestBezig(false);
    }
  };

  // TIJDELIJK, alleen voor diagnose (15 augustus 2026) — stuurt met
  // een notification-veld erbij, om te isoleren of het "server meldt
  // succes maar niets komt aan"-probleem in de data-only-aanpak zit.
  const [test2Bezig, setTest2Bezig] = useState(false);
  const [test2Resultaat, setTest2Resultaat] = useState<string | null>(null);

  const stuurTest2 = async () => {
    setTest2Bezig(true);
    setTest2Resultaat(null);
    try {
      const fn = httpsCallable<Record<string, never>, { succes: boolean; foutmelding?: string; aantalTokens?: number }>(functionsInstance, 'stuurTestNotificatieMetNotificationVeld');
      const result = await fn({});
      if (result.data.succes) {
        setTest2Resultaat(`✅ Verstuurd naar ${result.data.aantalTokens} token(s) — MET notification-veld.`);
      } else {
        setTest2Resultaat(`⚠️ ${result.data.foutmelding}`);
      }
    } catch (e: unknown) {
      setTest2Resultaat(`❌ Mislukt: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTest2Bezig(false);
    }
  };

  // Zaterdag-saldo-herinnering: statusverslag ophalen + handmatig kunnen triggeren
  const [zaterdagStatus, setZaterdagStatus] = useState<ZaterdagStatus | null>(null);
  const [zaterdagLaden, setZaterdagLaden] = useState(false);
  const [zaterdagTriggerBezig, setZaterdagTriggerBezig] = useState(false);

  const haalZaterdagStatusOp = async () => {
    setZaterdagLaden(true);
    try {
      const snap = await getDoc(doc(db, 'debug/zaterdagSaldoHerinnering'));
      setZaterdagStatus(snap.exists() ? (snap.data() as ZaterdagStatus) : null);
    } finally {
      setZaterdagLaden(false);
    }
  };

  useEffect(() => {
    haalZaterdagStatusOp();
  }, []);

  const triggerZaterdagNu = async () => {
    setZaterdagTriggerBezig(true);
    try {
      const fn = httpsCallable<Record<string, never>, { succes: boolean; foutmelding?: string; aantalVerstuurd?: number }>(functionsInstance, 'stuurZaterdagSaldoHerinneringNu');
      await fn({});
      // Kort wachten zodat de Firestore-write van de functie zelf
      // gegarandeerd binnen is vóór we opnieuw ophalen.
      await new Promise(r => setTimeout(r, 1500));
      await haalZaterdagStatusOp();
    } catch (e: unknown) {
      setZaterdagStatus({ succes: false, foutmelding: e instanceof Error ? e.message : String(e) });
    } finally {
      setZaterdagTriggerBezig(false);
    }
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
      <button onClick={runDiagnostiek} disabled={bezig} style={{ width: '100%', padding: 14, background: '#4a9eff', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, marginBottom: 12, opacity: bezig ? 0.6 : 1 }}>
        {bezig ? '⏳ Bezig...' : '▶ Start diagnostiek'}
      </button>

      <button onClick={stuurTest} disabled={testBezig} style={{ width: '100%', padding: 14, background: '#34c97a', color: '#0d1b2a', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, marginBottom: 16, opacity: testBezig ? 0.6 : 1 }}>
        {testBezig ? '⏳ Bezig...' : '🔔 Stuur mij een testmelding'}
      </button>
      {testResultaat && (
        <div style={{ background: '#132233', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: testResultaat.startsWith('✅') ? '#34c97a' : '#ff5a5a', lineHeight: 1.5 }}>
          {testResultaat}
        </div>
      )}

      <button onClick={stuurTest2} disabled={test2Bezig} style={{ width: '100%', padding: 14, background: '#a855f7', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, marginBottom: 16, opacity: test2Bezig ? 0.6 : 1 }}>
        {test2Bezig ? '⏳ Bezig...' : '🔔 Test (MET notification-veld)'}
      </button>
      {test2Resultaat && (
        <div style={{ background: '#132233', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: test2Resultaat.startsWith('✅') ? '#34c97a' : '#ff5a5a', lineHeight: 1.5 }}>
          {test2Resultaat}
        </div>
      )}

      <div style={{ color: '#4a9eff', fontSize: 16, fontWeight: 700, marginTop: 8, marginBottom: 12 }}>🎱 Zaterdag-saldo-herinnering</div>
      <button onClick={triggerZaterdagNu} disabled={zaterdagTriggerBezig} style={{ width: '100%', padding: 14, background: '#f0c060', color: '#0d1b2a', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, marginBottom: 12, opacity: zaterdagTriggerBezig ? 0.6 : 1 }}>
        {zaterdagTriggerBezig ? '⏳ Bezig...' : '▶ Nu handmatig versturen (test)'}
      </button>

      <div style={{ background: '#132233', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        {zaterdagLaden && <div style={{ color: '#7a9ab8', fontSize: 13 }}>Laden...</div>}
        {!zaterdagLaden && !zaterdagStatus && <div style={{ color: '#7a9ab8', fontSize: 13 }}>Nog nooit gedraaid.</div>}
        {!zaterdagLaden && zaterdagStatus && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: zaterdagStatus.succes ? '#34c97a' : '#ff5a5a', marginBottom: 8 }}>
              {zaterdagStatus.succes ? '✅ Laatste run geslaagd' : '❌ Laatste run mislukt'}
              {zaterdagStatus.laatsteRun && ` — ${zaterdagStatus.laatsteRun.toDate().toLocaleString('nl-NL')}`}
            </div>
            {zaterdagStatus.foutmelding && (
              <div style={{ fontSize: 12, color: '#ff5a5a', marginBottom: 8, wordBreak: 'break-all' }}>{zaterdagStatus.foutmelding}</div>
            )}
            {zaterdagStatus.succes && (
              <div style={{ fontSize: 12, color: '#f8fafc', marginBottom: 10, lineHeight: 1.8 }}>
                {zaterdagStatus.aantalGebruikersGevonden} actieve leden gevonden → {zaterdagStatus.aantalMetTicket} met ticket → {zaterdagStatus.aantalNietWachtend} spelen mee (niet wachtend) → {zaterdagStatus.aantalMetToken} met geldig token → <strong>{zaterdagStatus.aantalVerstuurd} melding(en) verstuurd</strong>
              </div>
            )}
            {zaterdagStatus.details && zaterdagStatus.details.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#7a9ab8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Per lid</div>
                {zaterdagStatus.details.map((d, i) => (
                  <div key={i} style={{ fontSize: 12, color: d.reden.startsWith('verstuurd') ? '#34c97a' : '#7a9ab8', marginBottom: 4 }}>
                    {d.naam}: {d.reden}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

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

export default function DebugFcmPage() {
  return (
    <ProtectedRoute allowedRoles={['beheerder']}>
      <DebugFcmContent />
    </ProtectedRoute>
  );
}
