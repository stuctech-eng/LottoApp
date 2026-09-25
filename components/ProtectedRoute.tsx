'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Rol } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Indien opgegeven: alleen deze rollen krijgen toegang, anders redirect naar /dashboard */
  allowedRoles?: Rol[];
}

/**
 * Sinds het ledenuitnodigingssysteem (26 juli 2026) wordt een
 * Firestore-profiel NOOIT meer automatisch aangemaakt bij het inloggen
 * — dat gebeurt uitsluitend via een geldig uitnodigingstoken. Iemand
 * kan dus best succesvol technisch zijn ingelogd (Firebase Auth
 * `user` bestaat) zonder ooit lid te zijn geworden (`profile` is
 * dan null). Voorheen werd die situatie hier NIET gecontroleerd —
 * alleen wanneer `allowedRoles` was opgegeven keek deze component
 * naar `profile` — waardoor zo iemand gewoon werd doorgelaten naar
 * elke pagina zonder `allowedRoles`, met een overal `null` profiel
 * tot gevolg. Nu is een geldig profiel altijd verplicht.
 *
 * Sinds "leden verwijderen" (27 juli 2026, soft-delete via
 * actief:false) geldt hetzelfde voor een bestaand maar INACTIEF
 * profiel — anders zou een verwijderd lid, ondanks 'uit de club'
 * gehaald te zijn, gewoon nog overal toegang houden.
 *
 * Redirect-doel bij een ontbrekend/inactief profiel is bewust NIET
 * '/' — de root-pagina stuurt iedereen met een `user` gewoon door
 * naar '/dashboard', wat hier weer zou worden afgekeurd: een
 * oneindige redirect-lus. In plaats daarvan: een aparte, duidelijke
 * pagina.
 *
 * Verplichte onboarding (23 september 2026) — voorheen bestond de
 * enige "poort" naar de verplichte stap-6-onboarding (telefoon +
 * ticket) uit één eenmalige navigatie, direct na het verzilveren van
 * een uitnodiging, beveiligd met een useRef-vlaggetje tegen een
 * race-conditie. Die bescherming werkt alleen binnen dezelfde
 * paginasessie: sluit iemand de app af vlak vóórdat die navigatie
 * vuurt, dan bestaat het profiel al (onboardingCompleted: false) en
 * kwam niets hem alsnog naar /welkom sturen — hij belandde gewoon op
 * elke andere beveiligde pagina. Bevestigd via codecontrole: nergens
 * anders in de app werd dit veld ooit gecheckt. Dit is nu de blijvende
 * vangrail, voor alle rollen (dit gaat over onboardingstatus, niet
 * over rol) — bij ELKE beveiligde pagina-load opnieuw gecontroleerd,
 * niet alleen bij die ene eerste navigatiepoging.
 *
 * Expliciet `=== false`, nooit `!profile.onboardingCompleted` — een
 * ontbrekend veld (elk lid van vóór dit systeem bestond) betekent
 * "niet van toepassing", niet "nog niet afgerond". Wordt maar op twee
 * plekken ooit geschreven (verzilverUitnodiging zet 'm op false,
 * /welkom zet 'm op true bij afronden) — dus dit onderscheid is
 * betrouwbaar.
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, profile, profileLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const heeftGeldigProfiel = !!profile && profile.actief !== false;
  const onboardingNietAfgerond = heeftGeldigProfiel && profile!.onboardingCompleted === false;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
      return;
    }
    if (!loading && user && !profileLoading && !heeftGeldigProfiel) {
      router.replace('/geen-toegang');
      return;
    }
    // /welkom zelf uitgezonderd — anders ontstaat een redirect-lus.
    if (!loading && !profileLoading && onboardingNietAfgerond && pathname !== '/welkom') {
      router.replace('/welkom');
      return;
    }
    if (allowedRoles && !loading && !profileLoading && profile && !allowedRoles.includes(profile.rol)) {
      router.replace('/dashboard');
    }
  }, [user, loading, profile, profileLoading, heeftGeldigProfiel, onboardingNietAfgerond, pathname, allowedRoles, router]);

  // Zolang de onboarding-redirect nog moet vuren (en we niet al op
  // /welkom zelf zijn): spinner tonen, nooit even de echte pagina
  // laten flitsen.
  const klaar = !loading && user && !profileLoading && heeftGeldigProfiel && !(onboardingNietAfgerond && pathname !== '/welkom');
  const toegestaan = !allowedRoles || (profile && allowedRoles.includes(profile.rol));

  if (!klaar || !toegestaan) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <>{children}</>;
}
