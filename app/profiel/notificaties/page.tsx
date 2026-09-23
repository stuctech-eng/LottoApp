'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsInstance } from '@/lib/firebase';
import app from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { activeerNotificaties, deactiveerNotificaties, notificatiesIngeschakeld } from '@/lib/firebase-messaging';
import { updateNotificationSettings } from '@/lib/firestore-users';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/types';

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

const CATEGORIEEN: { key: keyof NotificationSettings; label: string; uitleg: string; beheerderOnly?: boolean }[] = [
  { key: 'trekkingResultaten', label: '🎱 Trekkingsuitslagen', uitleg: 'Na elke trekking: jouw resultaat en of er een winnaar is' },
  { key: 'betalingBevestigd', label: '✅ Betaling bevestigd', uitleg: 'Zodra de kashouder jouw storting heeft verwerkt' },
  { key: 'herinneringen', label: '⏰ Herinneringen', uitleg: 'Betaalherinneringen, laag saldo, zaterdag-saldo-check' },
  { key: 'winnaars', label: '🎉 Winnaars', uitleg: 'Als er een winnaar valt (ook als jij het niet was)' },
  { key: 'ranglijstUpdates', label: '📈 Ranglijst-updates', uitleg: 'Wijzigingen in de ranglijst (standaard uit)' },
  { key: 'nieuweLeden', label: '👋 Nieuwe leden', uitleg: 'Zodra iemand een uitnodiging verzilvert — alleen beheerder', beheerderOnly: true },
];

function NotificatiesContent() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'instellingen' | 'test'>('instellingen');
  const isBeheerder = profile?.rol === 'beheerder';

  // ─────────────────────── Instellingen ───────────────────────
  const [notifActief, setNotifActief] = useState(() => notificatiesIngeschakeld());
  const [notifBezig, setNotifBezig] = useState(false);
  const [notifToast, setNotifToast] = useState<string | null>(null);
  const instellingen = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(profile?.notificationSettings ?? {}) };
  const [categorieBezigKey, setCategorieBezigKey] = useState<string | null>(null);

  useEffect(() => {
    if (notifActief && user) {
      activeerNotificaties(user.uid).catch(console.error);
    }
  }, [notifActief, user]);

  const handleHoofdToggle = async () => {
    if (!user) return;
    setNotifBezig(true);
    try {
      if (notifActief) {
        await deactiveerNotificaties(user.uid);
        setNotifActief(false);
        setNotifToast('Notificaties uitgeschakeld');
      } else {
        const token = await activeerNotificaties(user.uid);
        if (token) {
          setNotifActief(true);
          setNotifToast('✅ Notificaties ingeschakeld');
        } else {
          const perm = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unknown';
          setNotifToast(`❌ Geen token verkregen. Toestemming: ${perm}`);
        }
      }
      setTimeout(() => setNotifToast(null), 5000);
    } finally {
      setNotifBezig(false);
    }
  };

  const handleCategorieToggle = async (key: keyof NotificationSettings) => {
    if (!user) return;
    setCategorieBezigKey(key);
    try {
      await updateNotificationSettings(user.uid, { [key]: !instellingen[key] });
    } finally {
      setCategorieBezigKey(null);
    }
  };

  // ─────────────────────── Test-tabblad ───────────────────────
  const [logs, setLogs] = useState<string[]>([]);
  const [bezig, setBezig] = useState(false);

  const log = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
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

  // TIJDELIJK, alleen voor diagnose — stuurt met een notification-veld
  // erbij, om te isoleren of een "server meldt succes maar niets komt
  // aan"-probleem in de data-only-aanpak zit. Kan later weg zodra de
  // service-worker-samenvoeging structureel bevestigd is als opgelost.
  const [test2Bezig, setTest2Bezig] = useState(false);
  const [test2Resultaat, setTest2Resultaat] = useState<string | null>(null);

  const stuurTest2 = async () => {
    setTest2Bezig(true);
    setTest2Resultaat(null);
    try {
      const fn = httpsCallable<Record<string, never>, { succes: boolean; foutmelding?: string; aantalTokens?: number; response?: string }>(functionsInstance, 'stuurTestNotificatieMetNotificationVeld');
      const result = await fn({});
      if (result.data.succes) {
        setTest2Resultaat(`✅ Verstuurd naar ${result.data.aantalTokens} token(s) — MET notification-veld.\n\nFCM-respons: ${result.data.response}`);
      } else {
        setTest2Resultaat(`⚠️ ${result.data.foutmelding}`);
      }
    } catch (e: unknown) {
      setTest2Resultaat(`❌ Mislukt: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTest2Bezig(false);
    }
  };

  // Zaterdag-saldo-herinnering: statusverslag ophalen + handmatig kunnen triggeren (beheerder-only)
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
    if (tab === 'test' && isBeheerder) haalZaterdagStatusOp();
  }, [tab, isBeheerder]);

  const triggerZaterdagNu = async () => {
    setZaterdagTriggerBezig(true);
    try {
      const fn = httpsCallable<Record<string, never>, { succes: boolean; foutmelding?: string; aantalVerstuurd?: number }>(functionsInstance, 'stuurZaterdagSaldoHerinneringNu');
      await fn({});
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
      log(`5. VAPID: ${VAPID_KEY ? VAPID_KEY.slice(0, 20) + '...' : 'LEEG!'}`);

      const perm = await Notification.requestPermission();
      log(`6. Toestemming: ${perm}`);
      if (perm !== 'granted') { log('❌ Stop — geen toestemming'); return; }

      // BUGFIX (15 augustus 2026): registreerde hier eerder een EIGEN,
      // TWEEDE service worker — precies de oorzaak van het "server
      // meldt succes, niets komt aan"-probleem. Nu wachten op de ENE,
      // samengevoegde Serwist-worker (zie app/sw.ts), niet opnieuw
      // apart registreren.
      log('7. Wachten op actieve service worker...');
      const reg = await navigator.serviceWorker.ready;
      log(`8. SW scope: ${reg.scope}`);
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
        log(`12. Token: ${token ? token.slice(0, 30) + '...' : 'NULL!'}`);

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
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/profiel" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, letterSpacing: -0.5 }}>🔔 Notificaties</div>
          </div>
        </div>

        {/* Tabbladen */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 20 }}>
          <button
            onClick={() => setTab('instellingen')}
            style={{ flex: 1, padding: '10px 0', borderRadius: 14, border: `1.5px solid ${tab === 'instellingen' ? 'var(--accent)' : 'var(--border)'}`, background: tab === 'instellingen' ? 'var(--accent-soft)' : 'var(--surface)', color: tab === 'instellingen' ? 'var(--accent)' : 'var(--muted)', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
          >
            Instellingen
          </button>
          {isBeheerder && (
            <button
              onClick={() => setTab('test')}
              style={{ flex: 1, padding: '10px 0', borderRadius: 14, border: `1.5px solid ${tab === 'test' ? 'var(--accent)' : 'var(--border)'}`, background: tab === 'test' ? 'var(--accent-soft)' : 'var(--surface)', color: tab === 'test' ? 'var(--accent)' : 'var(--muted)', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              Test
            </button>
          )}
        </div>

        {tab === 'instellingen' && (
          <div style={{ padding: '0 20px 32px' }}>
            {/* Hoofdschakelaar */}
            <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{notifActief ? '🔔 Notificaties aan' : '🔕 Notificaties uit'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{notifActief ? 'Je ontvangt meldingen op dit toestel' : 'Schakel in om meldingen te ontvangen'}</div>
              </div>
              <button
                onClick={handleHoofdToggle}
                disabled={notifBezig}
                style={{ width: 44, height: 26, borderRadius: 13, border: 'none', position: 'relative', cursor: 'pointer', background: notifActief ? 'var(--success)' : 'var(--navy-mid)', transition: 'background 0.2s', flexShrink: 0, opacity: notifBezig ? 0.6 : 1 }}
              >
                <span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: notifActief ? 'translateX(18px)' : 'translateX(0)' }} />
              </button>
            </div>
            {notifToast && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--muted)' }}>{notifToast}</div>
            )}
            {typeof window !== 'undefined' && !('Notification' in window) && (
              <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--warning)' }}>
                ⚠️ Push notificaties worden niet ondersteund door deze browser. Voeg de app toe aan je beginscherm voor de beste ervaring.
              </div>
            )}

            {/* Per-categorie */}
            <div className="section-title">Per soort melding</div>
            {!notifActief && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Zet eerst notificaties helemaal aan hierboven — dan kun je hieronder per soort kiezen.</div>
            )}
            {CATEGORIEEN.filter(cat => !cat.beheerderOnly || isBeheerder).map(cat => (
              <div key={cat.key} className="card" style={{ padding: '13px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: notifActief ? 1 : 0.5 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{cat.uitleg}</div>
                </div>
                <button
                  onClick={() => handleCategorieToggle(cat.key)}
                  disabled={!notifActief || categorieBezigKey === cat.key}
                  style={{ width: 40, height: 24, borderRadius: 12, border: 'none', position: 'relative', cursor: notifActief ? 'pointer' : 'default', background: instellingen[cat.key] ? 'var(--success)' : 'var(--navy-mid)', transition: 'background 0.2s', flexShrink: 0, opacity: categorieBezigKey === cat.key ? 0.6 : 1 }}
                >
                  <span style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: instellingen[cat.key] ? 'translateX(16px)' : 'translateX(0)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'test' && isBeheerder && (
          <div style={{ padding: '0 20px 32px' }}>
            <button onClick={runDiagnostiek} disabled={bezig} style={{ width: '100%', padding: 14, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, marginBottom: 12, opacity: bezig ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
              {bezig ? '⏳ Bezig...' : '▶ Start diagnostiek'}
            </button>

            <button onClick={stuurTest} disabled={testBezig} style={{ width: '100%', padding: 14, background: 'var(--success)', color: 'var(--navy)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, marginBottom: 16, opacity: testBezig ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
              {testBezig ? '⏳ Bezig...' : '🔔 Stuur mij een testmelding'}
            </button>
            {testResultaat && (
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: testResultaat.startsWith('✅') ? 'var(--success)' : 'var(--error)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {testResultaat}
              </div>
            )}

            <button onClick={stuurTest2} disabled={test2Bezig} style={{ width: '100%', padding: 14, background: '#a855f7', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, marginBottom: 16, opacity: test2Bezig ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
              {test2Bezig ? '⏳ Bezig...' : '🔔 Test (MET notification-veld)'}
            </button>
            {test2Resultaat && (
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: test2Resultaat.startsWith('✅') ? 'var(--success)' : 'var(--error)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {test2Resultaat}
              </div>
            )}

            {isBeheerder && (
              <>
                <div className="section-title">🎱 Zaterdag-saldo-herinnering</div>
                <button onClick={triggerZaterdagNu} disabled={zaterdagTriggerBezig} style={{ width: '100%', padding: 14, background: 'var(--gold)', color: 'var(--navy)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, marginBottom: 12, opacity: zaterdagTriggerBezig ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
                  {zaterdagTriggerBezig ? '⏳ Bezig...' : '▶ Nu handmatig versturen (test, naar iedereen)'}
                </button>

                <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                  {zaterdagLaden && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Laden...</div>}
                  {!zaterdagLaden && !zaterdagStatus && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Nog nooit gedraaid.</div>}
                  {!zaterdagLaden && zaterdagStatus && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: zaterdagStatus.succes ? 'var(--success)' : 'var(--error)', marginBottom: 8 }}>
                        {zaterdagStatus.succes ? '✅ Laatste run geslaagd' : '❌ Laatste run mislukt'}
                        {zaterdagStatus.laatsteRun && ` — ${zaterdagStatus.laatsteRun.toDate().toLocaleString('nl-NL')}`}
                      </div>
                      {zaterdagStatus.foutmelding && (
                        <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 8, wordBreak: 'break-all' }}>{zaterdagStatus.foutmelding}</div>
                      )}
                      {zaterdagStatus.succes && (
                        <div style={{ fontSize: 12, color: 'var(--white)', marginBottom: 10, lineHeight: 1.8 }}>
                          {zaterdagStatus.aantalGebruikersGevonden} actieve leden → {zaterdagStatus.aantalMetTicket} met ticket → {zaterdagStatus.aantalNietWachtend} spelen mee → {zaterdagStatus.aantalMetToken} met geldig token → <strong>{zaterdagStatus.aantalVerstuurd} verstuurd</strong>
                        </div>
                      )}
                      {zaterdagStatus.details && zaterdagStatus.details.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Per lid</div>
                          {zaterdagStatus.details.map((d, i) => (
                            <div key={i} style={{ fontSize: 12, color: d.reden.startsWith('verstuurd') ? 'var(--success)' : 'var(--muted)', marginBottom: 4 }}>
                              {d.naam}: {d.reden}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            <div className="section-title">Log</div>
            <div style={{ background: '#0d1b2a', border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 200, fontFamily: 'monospace' }}>
              {logs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Druk op Start diagnostiek om te beginnen...</div>}
              {logs.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: l.includes('✅') ? 'var(--success)' : l.includes('FOUT') || l.includes('NULL') || l.includes('LEEG') || l.includes('❌') ? 'var(--error)' : 'var(--white)', marginBottom: 5, lineHeight: 1.5, wordBreak: 'break-all' }}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function NotificatiesPage() {
  return (
    <ProtectedRoute>
      <NotificatiesContent />
    </ProtectedRoute>
  );
}
