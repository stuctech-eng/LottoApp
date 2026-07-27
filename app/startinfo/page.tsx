'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeVerenigingConfig, DEFAULT_VERENIGING_CONFIG } from '@/lib/firestore-vereniging';

/**
 * De ENIGE officiële informatiepagina van LottoClub — vervangt de
 * eerdere, losse /spelregels en /help (die nu allebei hierheen
 * doorsturen). Bewust samengevoegd zodat er nooit meer twee plekken
 * bestaan die elkaar kunnen tegenspreken — wat eerder ook echt
 * gebeurde: /spelregels beschreef nog de oude, niet-cumulatieve
 * matching, en /help had nog volledige instructies voor "Account
 * aanmaken" en "betaling melden in de app", die allebei niet meer
 * bestaan sinds resp. het uitnodigingssysteem en de consolidatie tot
 * één betaalroute.
 */

type Sectie = 'welkom' | 'spelregels' | 'betalen' | 'schermen' | 'installatie' | 'rollen' | 'faq' | 'contact';

const SECTIES: { id: Sectie; icon: string; titel: string }[] = [
  { id: 'welkom', icon: '👋', titel: 'Welkom' },
  { id: 'spelregels', icon: '🎱', titel: 'Spelregels' },
  { id: 'betalen', icon: '💰', titel: 'Betalen' },
  { id: 'schermen', icon: '📱', titel: 'Schermen' },
  { id: 'installatie', icon: '🔔', titel: 'Installatie' },
  { id: 'rollen', icon: '👥', titel: 'Rollen' },
  { id: 'faq', icon: '❓', titel: 'Veelgestelde vragen' },
  { id: 'contact', icon: '✉️', titel: 'Contact' },
];

function Blok({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 10 }}>{titel}</div>
      {children}
    </div>
  );
}

function Stap({ nr, tekst }: { nr: number; tekst: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', border: '1px solid rgba(74,158,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{nr}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, paddingTop: 3 }}>{tekst}</div>
    </div>
  );
}

function Info({ tekst }: { tekst: string }) {
  return <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>{tekst}</div>;
}

function Waarschuwing({ tekst }: { tekst: string }) {
  return (
    <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(255,170,51,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--warning)', lineHeight: 1.5 }}>
      ⚠️ {tekst}
    </div>
  );
}

function Tip({ tekst }: { tekst: string }) {
  return (
    <div style={{ background: 'var(--accent-soft)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--accent)', lineHeight: 1.5 }}>
      💡 {tekst}
    </div>
  );
}

function StartinfoContent() {
  const { profile } = useAuth();
  const [actief, setActief] = useState<Sectie>('welkom');
  const [standaardInleg, setStandaardInleg] = useState(DEFAULT_VERENIGING_CONFIG.standaardInleg);

  useEffect(() => {
    const unsub = subscribeVerenigingConfig(cfg => setStandaardInleg(cfg.standaardInleg));
    return unsub;
  }, []);

  const dashboardHref = profile?.rol === 'beheerder' ? '/beheerder' : profile?.rol === 'kashouder' ? '/kashouder' : '/dashboard';

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Header */}
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <Link href={dashboardHref} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>📖 Startinfo & Speluitleg</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 4 }}>Alles op één plek</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>De officiële, altijd actuele uitleg over LottoClub</div>
        </div>

        {/* Navigatie secties */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {SECTIES.map(s => (
              <button
                key={s.id}
                onClick={() => setActief(s.id)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${actief === s.id ? 'var(--accent)' : 'var(--border)'}`, background: actief === s.id ? 'var(--accent-soft)' : 'var(--surface)', color: actief === s.id ? 'var(--accent)' : 'var(--muted)', fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {s.icon} {s.titel}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0 20px', paddingBottom: 32 }}>

          {actief === 'welkom' && (
            <>
              <Blok titel="🎱 Welkom bij LottoClub">
                <Info tekst="Een digitale lottovereniging: samen spelen, samen de kas beheren, en altijd inzicht in wie waar staat." />
              </Blok>
              <Blok titel="📖 Waar deze pagina voor is">
                <Info tekst="Hier staat alles wat je moet weten — spelregels, betalen, welke schermen wat doen, hoe je de app het beste installeert, en antwoorden op veelgestelde vragen. Twijfel je ooit ergens over, kom gewoon hierheen terug." />
              </Blok>
              <Tip tekst="Nieuw lid? Je hebt deze uitleg al gezien als introductie na het aanmelden. Bestaande leden vinden 'm hier altijd terug." />
            </>
          )}

          {actief === 'spelregels' && (
            <>
              <Blok titel="🏆 6 goed is winnaar — cumulatief">
                <Info tekst="Je speelt met een vast ticket van 6 nummers. Elk nummer dat je ooit goed hebt, blijft bewaard binnen de huidige speelreeks — je bouwt dus over meerdere trekkingen heen op naar 6 goed, in plaats van dat elke trekking apart op zichzelf staat." />
              </Blok>
              <Blok titel="💳 Betaling = deelname">
                <Info tekst="Je doet alleen mee aan een trekking als je voor die week bevestigd hebt betaald (via je LottoSaldo). Niet betaald? Dan telt die trekking simpelweg niet mee voor jouw verzameling — je eerder verzamelde nummers blijven wel gewoon staan." />
              </Blok>
              <Blok titel="🎫 1 ticket per persoon">
                <Info tekst="Iedereen speelt met precies 1 ticket van 6 nummers. Gelijke kansen voor iedereen." />
              </Blok>
              <Blok titel="🔄 Nieuwe speelreeks na een winnaar">
                <Info tekst="Zodra iemand alle 6 nummers heeft verzameld, is diegene winnaar en begint automatisch een nieuwe speelreeks — voor iedereen weer vanaf 0." />
              </Blok>
              <Blok titel="🎉 Meerdere winnaars mogelijk">
                <Info tekst="Hebben meerdere leden in dezelfde trekking hun laatste nummer te pakken? Dan zijn er meerdere winnaars, en wordt de pot gelijk verdeeld." />
              </Blok>
              <Blok titel="💰 De prijzenpot">
                <Info tekst="De pot die je op je dashboard ziet ('Te winnen deze speelreeks') is de opgebouwde inleg van bevestigde weken sinds de laatste winnaar — dat is iets anders dan het totale kassaldo, want vooruitgestort maar nog niet gebruikt LottoSaldo telt daar bewust niet in mee." />
              </Blok>
            </>
          )}

          {actief === 'betalen' && (
            <>
              <Blok titel="💰 Eén route: storten">
                <Info tekst="Alles gaat via storten op je LottoSaldo — geen apart 'wekelijks betalen' meer. Jij bepaalt zelf hoeveel je stort." />
                <Stap nr={1} tekst="Open Profiel → Startinfo, of ga direct naar 'Betalen'" />
                <Stap nr={2} tekst="Tik op 'Open Tikkie om te storten' en maak het bedrag over" />
                <Stap nr={3} tekst="Klaar — je hoeft dit nergens te melden in de app" />
              </Blok>
              <Blok titel="✅ Wat de kashouder doet">
                <Info tekst="De kashouder ziet jouw storting gewoon in Tikkie binnenkomen en verwerkt die zelf. Zodra dat gebeurt, gaat je LottoSaldo omhoog." />
              </Blok>
              <Blok titel="🔄 Automatische wekelijkse afschrijving">
                <Info tekst={`Zolang er genoeg LottoSaldo op je account staat, wordt elke nieuwe speelweek automatisch €${standaardInleg} afgeschreven — geen actie nodig. Is je saldo niet meer toereikend, dan stort je gewoon opnieuw.`} />
              </Blok>
              <Tip tekst="Stort in één keer een groter bedrag om meerdere weken vooruit te spelen zonder er nog aan te hoeven denken." />
              <Waarschuwing tekst="Nog geen saldo en niet gestort vóór de eerstvolgende trekking? Dan tellen de getrokken nummers van die week niet mee voor jouw verzameling." />
            </>
          )}

          {actief === 'schermen' && (
            <>
              <Blok titel="🏠 Dashboard">
                <Info tekst="Je startscherm: de actuele prijzenpot van deze speelreeks, je LottoSaldo, en of je deze week al bevestigd bent voor de trekking." />
              </Blok>
              <Blok titel="🎱 Trekkingen">
                <Info tekst="Alle trekkingen op een rij, met per trekking welke nummers zijn gevallen en welke daarvan jij al had verzameld." />
              </Blok>
              <Blok titel="📈 Ranglijst & Hall of Fame">
                <Info tekst="De ranglijst toont iedereens punten in de huidige speelreeks. De Hall of Fame houdt all-time records bij, zoals de snelste winnaar ooit." />
              </Blok>
              <Blok titel="💰 Kas">
                <Info tekst="Alleen-lezen inzage in het kassaldo en de volledige lijst van kasmutaties — voor iedereen open en transparant." />
              </Blok>
              <Blok titel="👤 Profiel">
                <Info tekst="Je eigen gegevens, je ticket-nummers, notificatie-instellingen, en deze Startinfo-pagina." />
              </Blok>
            </>
          )}

          {actief === 'installatie' && (
            <>
              <Blok titel="🔔 Waarom dit belangrijk is">
                <Waarschuwing tekst="Pushmeldingen (bijv. bij een trekking, of als je saldo bijna op is) werken ALLEEN als de app op je beginscherm staat — niet als je 'm via een los browsertabblad opent." />
              </Blok>
              <Blok titel="📱 iPhone (Safari)">
                <Stap nr={1} tekst="Open Safari en ga naar de LottoClub-link" />
                <Stap nr={2} tekst="Tik op het Deel-icoontje (vierkantje met pijltje omhoog) onderaan Safari" />
                <Stap nr={3} tekst='Kies "Zet op beginscherm"' />
                <Stap nr={4} tekst='Tik rechtsboven op "Voeg toe"' />
                <Stap nr={5} tekst="Open de app voortaan altijd via het icoontje op je beginscherm, niet via Safari direct" />
              </Blok>
              <Blok titel="🤖 Android (Chrome)">
                <Stap nr={1} tekst="Open Chrome en ga naar de LottoClub-link" />
                <Stap nr={2} tekst="Tik rechtsboven op het menu (drie puntjes)" />
                <Stap nr={3} tekst='Kies "App installeren" of "Toevoegen aan startscherm"' />
                <Stap nr={4} tekst='Bevestig met "Installeren"' />
              </Blok>
              <Blok titel="🔔 Notificaties inschakelen">
                <Stap nr={1} tekst="Zorg dat de app is geïnstalleerd via het beginscherm-icoontje (zie hierboven)" />
                <Stap nr={2} tekst="Open de app via dat icoontje" />
                <Stap nr={3} tekst="Ga naar Profiel → Push notificaties → schakel in" />
                <Stap nr={4} tekst="Geef toestemming als je telefoon daarom vraagt" />
              </Blok>
            </>
          )}

          {actief === 'rollen' && (
            <>
              <Blok titel="🎱 Lid">
                <Info tekst="Speelt mee met een eigen ticket, stort naar keuze op het eigen LottoSaldo, bekijkt trekkingen/ranglijst/kas." />
              </Blok>
              <Blok titel="⚡ Kashouder">
                <Info tekst="Beheert de financiën: ziet stortingen in Tikkie en registreert ze, stuurt WhatsApp-herinneringen, houdt de kas bij." />
                <Stap nr={1} tekst="Financieel beheer → 'Storting registreren' zodra je iets in Tikkie ziet" />
                <Stap nr={2} tekst="Het saldo, de kas, en (indien van toepassing) de openstaande week worden automatisch bijgewerkt" />
                <Tip tekst="Elke vrijdagavond 20:00 krijgt de kashouder zelf een herinnering om Tikkie te checken." />
              </Blok>
              <Blok titel="👑 Beheerder">
                <Info tekst="Heeft alle rechten van de kashouder, plus: trekkingen invoeren, leden en rollen beheren, nieuwe leden uitnodigen, instellingen aanpassen, seizoenen beheren." />
                <Stap nr={1} tekst="Trekkingen → '+ Invoeren' na elke zaterdagse Lotto-trekking" />
                <Stap nr={2} tekst="Leden → 'Uitnodigen' voor een nieuw lid" />
                <Waarschuwing tekst="Er moet altijd minimaal 1 beheerder zijn — de app blokkeert het wegnemen van de laatste beheerder." />
              </Blok>
            </>
          )}

          {actief === 'faq' && (
            <>
              <Blok titel="Ik ontvang geen notificaties">
                <Info tekst="• Controleer of je de app hebt geïnstalleerd via het beginscherm-icoontje (niet via de browser)" />
                <Info tekst="• Ga naar Profiel → Push notificaties → schakel in" />
                <Info tekst="• Controleer je telefooninstellingen: staan notificaties aan voor LottoClub?" />
              </Blok>
              <Blok titel="Mijn storting is nog niet verwerkt">
                <Info tekst="De kashouder moet je storting nog zien in Tikkie en registreren — dit gaat niet automatisch. Heb je langer gewacht? Stuur gerust een berichtje." />
              </Blok>
              <Blok titel="Ik zie 'Geen actief seizoen'">
                <Info tekst="De beheerder moet een nieuw seizoen starten via Beheer → Admin → Seizoen." />
              </Blok>
              <Blok titel="Mijn ticket-nummers worden niet geaccepteerd">
                <Info tekst="Controleer of je het juiste aantal nummers hebt (standaard 6), of ze uniek zijn, en of ze binnen de toegestane reeks vallen (standaard 1–45)." />
              </Blok>
              <Blok titel="Ik wil mijn telefoonnummer toevoegen">
                <Info tekst="Ga naar Profiel → Telefoonnummer → vul in → sla op. Dit is nodig voor WhatsApp-herinneringen van de kashouder." />
              </Blok>
              <Blok titel="Hoe werkt de ranglijst?">
                <Info tekst="Na elke trekking krijg je punten op basis van hoeveel nummers je die trekking nieuw goed had. De ranglijst toont iedereen gesorteerd op totaal punten in de huidige speelreeks." />
              </Blok>
            </>
          )}

          {actief === 'contact' && (
            <>
              <Blok titel="✉️ Vragen of problemen?">
                <Info tekst="Neem contact op met de kashouder voor betaal-gerelateerde vragen, of met de beheerder voor al het overige." />
              </Blok>
              <Tip tekst="Contactgegevens van de kashouder en beheerder vind je bij Leden." />
            </>
          )}

        </div>
      </div>
    </>
  );
}

export default function StartinfoPage() {
  return (
    <ProtectedRoute>
      <StartinfoContent />
    </ProtectedRoute>
  );
}
