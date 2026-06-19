'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type LogEntry = {
  tijd: string;
  tekst: string;
  status: 'ok' | 'fout' | 'info';
};

export default function DebugAuthPage() {
  const { user, profile, loginWithGoogle, googleSignInError, clearGoogleSignInError } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bezig, setBezig] = useState(false);

  function log(tekst: string, status: LogEntry['status'] = 'info') {
    const tijd = new Date().toLocaleTimeString('nl-NL');
    setLogs((prev) => [...prev, { tijd, tekst, status }]);
  }

  function isStandalonePwa(): boolean {
    const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
    return iosStandalone || !!displayModeStandalone;
  }

  async function startDiagnostiek() {
    setBezig(true);
    setLogs([]);
    clearGoogleSignInError();

    // Stap 1 — huidige auth status
    log(`Ingelogd: ${user ? 'ja' : 'nee'}`, user ? 'ok' : 'info');
    if (user) {
      log(`UID: ${user.uid}`, 'info');
      log(`Email: ${user.email ?? 'onbekend'}`, 'info');
    }

    // Stap 2 — profiel uit Firestore
    log(`Firestore profiel geladen: ${profile ? 'ja' : 'nee'}`, profile ? 'ok' : 'fout');
    if (profile) {
      log(`Rol: ${profile.rol}`, 'info');
    }

    // Stap 3 — PWA modus
    const standalone = isStandalonePwa();
    log(`Standalone PWA modus: ${standalone ? 'ja (popup-methode actief)' : 'nee (redirect-methode actief)'}`, 'ok');

    // Stap 4 — display-mode details
    const matchStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
    const iosStandaloneFlag = (window.navigator as { standalone?: boolean }).standalone;
    log(`window.matchMedia standalone: ${matchStandalone}`, 'info');
    log(`window.navigator.standalone (iOS): ${iosStandaloneFlag ?? 'niet beschikbaar'}`, 'info');

    // Stap 5 — User agent (handig om iOS-versie te checken)
    log(`User agent: ${window.navigator.userAgent}`, 'info');

    setBezig(false);
  }

  async function testGoogleLogin() {
    setBezig(true);
    log('Start Google Sign-In test...', 'info');
    try {
      await loginWithGoogle();
      log('loginWithGoogle() voltooid zonder directe fout', 'ok');
    } catch (err) {
      log(`Fout tijdens loginWithGoogle(): ${err instanceof Error ? err.message : String(err)}`, 'fout');
    }
    setBezig(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#e5e7eb', padding: '24px 16px', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🔐 Auth Diagnostiek</h1>
      <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
        Alleen bereikbaar via PWA (beginscherm-icoon) voor volledige werking van standalone-detectie.
      </p>

      {googleSignInError && (
        <div style={{ background: '#3f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: 12, marginBottom: 16, color: '#fca5a5', fontSize: 14 }}>
          ⚠️ {googleSignInError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={startDiagnostiek}
          disabled={bezig}
          style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, minHeight: 44 }}
        >
          Start diagnostiek
        </button>
        <button
          onClick={testGoogleLogin}
          disabled={bezig}
          style={{ background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, minHeight: 44 }}
        >
          Test Google login
        </button>
      </div>

      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 12, maxHeight: '50vh', overflowY: 'auto' }}>
        {logs.length === 0 && <p style={{ color: '#6b7280', fontSize: 13 }}>Nog geen log-regels. Tik op &quot;Start diagnostiek&quot;.</p>}
        {logs.map((entry, i) => (
          <div
            key={i}
            style={{
              fontSize: 13,
              padding: '6px 0',
              borderBottom: i < logs.length - 1 ? '1px solid #1f2937' : 'none',
              color: entry.status === 'fout' ? '#f87171' : entry.status === 'ok' ? '#4ade80' : '#d1d5db',
            }}
          >
            <span style={{ color: '#6b7280' }}>[{entry.tijd}]</span> {entry.tekst}
          </div>
        ))}
      </div>
    </div>
  );
}
