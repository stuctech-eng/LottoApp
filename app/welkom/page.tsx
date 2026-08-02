'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';

/**
 * Eenmalige introductie voor NIEUWE leden — verschijnt alleen als
 * `onboardingCompleted === false` (expliciet, door de Cloud Function
 * gezet bij het verzilveren van een uitnodiging). Een ontbrekend veld
 * (alle bestaande leden) wordt overal behandeld als `true` — zij
 * krijgen deze pagina dus nooit te zien, zonder dat hun profiel ooit
 * is aangepast. Dezelfde uitleg blijft voor iedereen permanent
 * terug te vinden via Profiel → Startinfo & Speluitleg.
 */

const STAPPEN = 5;

function WelkomPageContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [stap, setStap] = useState(1);
  const [bezig, setBezig] = useState(false);

  // Ontbrekend veld = true (bestaand lid) — nooit de onboarding
  // opnieuw tonen, ook niet bij een handmatig bezoek aan deze URL.
  const onboardingNodig = profile?.onboardingCompleted === false;
  useEffect(() => {
    if (profile && !onboardingNodig) {
      router.replace('/dashboard');
    }
  }, [profile, onboardingNodig, router]);

  if (!onboardingNodig) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const volgende = () => setStap(s => Math.min(s + 1, STAPPEN));
  const vorige = () => setStap(s => Math.max(s - 1, 1));

  const handleAfronden = async () => {
    if (!user) return;
    setBezig(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { onboardingCompleted: true });
    } finally {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
      `}</style>
      <div className="bg-grid" />
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

        {/* Voortgang */}
        <div style={{ display: 'flex', gap: 6, padding: 'max(20px, env(safe-area-inset-top, 20px)) 24px 0' }}>
          {Array.from({ length: STAPPEN }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < stap ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>

        <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>

          {stap === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🎱</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, letterSpacing: -0.8, marginBottom: 12 }}>Welkom bij LottoClub!</div>
              <div style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7 }}>
                Fijn dat je meedoet{profile?.naam ? `, ${profile.naam}` : ''}. In een paar korte stappen leggen we uit hoe alles werkt.
              </div>
            </div>
          )}

          {stap === 2 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>🎱 Zo werkt onze Lotto</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.5, marginBottom: 20 }}>6 goed is winnaar</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Je speelt met vaste nummers — je eigen ticket.',
                  'Elk nummer dat je goed hebt, blijft voor je bewaard.',
                  'Zo verzamel je goede nummers over meerdere trekkingen heen.',
                  'Zodra je alle 6 nummers hebt verzameld, win je.',
                  'Meerdere winnaars tegelijk? Dan delen jullie de prijs.',
                  'Daarna begint automatisch een nieuwe speelreeks, voor iedereen weer vanaf 0.',
                  'Niet betaald voor een trekking? Dan telt die trekking niet mee voor jouw verzameling.',
                ].map((tekst, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14, color: 'var(--white)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>●</span>
                    <span>{tekst}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stap === 3 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>💰 Betalen & LottoSaldo</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.5, marginBottom: 20 }}>Eén keer storten, daarna automatisch</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {[
                  'Je stort een bedrag naar keuze via Tikkie — jij bepaalt hoeveel.',
                  'De kashouder ziet je storting en verwerkt die.',
                  'Daarna schrijft de app automatisch elke speelweek de inleg af, zolang er genoeg saldo is.',
                  'Is je saldo niet meer toereikend? Dan stort je gewoon opnieuw.',
                ].map((tekst, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14, color: 'var(--white)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>●</span>
                    <span>{tekst}</span>
                  </li>
                ))}
              </ul>
              <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 14, padding: '12px 14px', fontSize: 12, color: 'var(--warning)', lineHeight: 1.6 }}>
                💡 Je hoeft je storting nergens te melden — de kashouder verwerkt het gewoon zelf.
              </div>
            </div>
          )}

          {stap === 4 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>📱 Belangrijkste schermen</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.5, marginBottom: 20 }}>Waar vind je wat</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '🏠', naam: 'Dashboard', uitleg: 'Je prijzenpot, je saldo, en of je deze week al betaald hebt' },
                  { icon: '🎱', naam: 'Trekkingen', uitleg: 'Alle uitslagen, en welke nummers jij al verzameld hebt' },
                  { icon: '📈', naam: 'Ranglijst', uitleg: 'Hoe iedereen ervoor staat deze speelreeks' },
                  { icon: '💰', naam: 'Kas', uitleg: 'Inzage in de clubkas, voor iedereen zichtbaar' },
                  { icon: '👤', naam: 'Profiel', uitleg: 'Je gegevens, en deze uitleg kun je hier altijd terugvinden' },
                ].map(item => (
                  <div key={item.naam} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
                    <span style={{ fontSize: 22 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.naam}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.uitleg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stap === 5 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>🔔 Laatste stap</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, letterSpacing: -0.5, marginBottom: 12 }}>Zet de app op je beginscherm</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Belangrijk: meldingen (bijv. bij een trekking, of als je saldo bijna op is) werken alleen als de app zo is toegevoegd — niet als je 'm via een los browsertabblad opent.
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📱 iPhone (Safari)</div>
                <ol style={{ paddingLeft: 18, fontSize: 13, color: 'var(--white)', lineHeight: 1.9 }}>
                  <li>Tik onderin op het deel-icoon <span style={{ color: 'var(--muted)' }}>(vierkantje met pijl omhoog)</span></li>
                  <li>Scrol naar beneden, kies <strong>"Zet op beginscherm"</strong></li>
                  <li>Tik rechtsboven op <strong>"Voeg toe"</strong></li>
                </ol>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🤖 Android (Chrome)</div>
                <ol style={{ paddingLeft: 18, fontSize: 13, color: 'var(--white)', lineHeight: 1.9 }}>
                  <li>Tik rechtsboven op het menu <span style={{ color: 'var(--muted)' }}>(drie puntjes)</span></li>
                  <li>Kies <strong>"App installeren"</strong> of <strong>"Toevoegen aan startscherm"</strong></li>
                  <li>Bevestig met <strong>"Installeren"</strong></li>
                </ol>
              </div>

              {profile?.wachtOpNieuweSpeelreeks ? (
                <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 16, padding: 16, marginTop: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>⏳ Nog even geduld</div>
                  <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6 }}>
                    Je bent aangemeld terwijl de huidige speelreeks al bezig is — andere spelers hebben dan al een voorsprong. Je kunt nu vast je ticket instellen en storten, maar je speelt pas volledig mee zodra de huidige speelreeks eindigt (er valt een winnaar) en een nieuwe, eerlijke reeks begint. Je ziet dit ook op je dashboard.
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--success-soft)', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 16, padding: 16, marginTop: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 6 }}>✅ Je doet vanaf nu volledig mee!</div>
                  <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6 }}>
                    Stel je ticket in en stort je inleg — je speelt gewoon mee vanaf de eerstvolgende trekking.
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Navigatie */}
        <div style={{ display: 'flex', gap: 10, padding: '0 24px max(24px, env(safe-area-inset-bottom, 24px))' }}>
          {stap > 1 && (
            <button
              onClick={vorige}
              style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              Terug
            </button>
          )}
          {stap < STAPPEN ? (
            <button
              onClick={volgende}
              style={{ flex: 2, background: 'linear-gradient(135deg,var(--accent),#2070cc)', color: 'white', border: 'none', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              Volgende
            </button>
          ) : (
            <button
              onClick={handleAfronden}
              disabled={bezig}
              style={{ flex: 2, background: 'linear-gradient(135deg,var(--success),#1a8a50)', color: 'white', border: 'none', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', opacity: bezig ? 0.6 : 1 }}
            >
              {bezig ? 'Even geduld…' : '✓ Naar het dashboard'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function WelkomPage() {
  return (
    <ProtectedRoute>
      <WelkomPageContent />
    </ProtectedRoute>
  );
}
