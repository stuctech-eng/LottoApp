'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState } from 'react';

type Sectie = 'installatie' | 'inloggen' | 'lid' | 'kashouder' | 'beheerder' | 'notificaties' | 'betalen' | 'trekking' | 'faq';

const SECTIES: { id: Sectie; icon: string; titel: string }[] = [
  { id: 'installatie', icon: '📲', titel: 'Installatie' },
  { id: 'inloggen', icon: '🔐', titel: 'Inloggen' },
  { id: 'lid', icon: '🎱', titel: 'Als lid' },
  { id: 'kashouder', icon: '⚡', titel: 'Als kashouder' },
  { id: 'beheerder', icon: '👑', titel: 'Als beheerder' },
  { id: 'betalen', icon: '💳', titel: 'Betaalflow' },
  { id: 'trekking', icon: '🎯', titel: 'Trekkingsflow' },
  { id: 'notificaties', icon: '🔔', titel: 'Notificaties' },
  { id: 'faq', icon: '❓', titel: 'Veelgestelde vragen' },
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

function HelpContent() {
  const [actief, setActief] = useState<Sectie>('installatie');

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Header */}
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 16px' }}>
          <Link href="/profiel" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>❓ Help</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 4 }}>Handleiding</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Alles over hoe LottoClub werkt</div>
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

          {actief === 'installatie' && (
            <>
              <Blok titel="📲 LottoClub installeren op iPhone">
                <Info tekst="LottoClub is een webapp die je installeert als app op je beginscherm. Je hebt geen App Store nodig." />
                <Stap nr={1} tekst="Open Safari en ga naar: lotto-app-eight-chi.vercel.app" />
                <Stap nr={2} tekst="Tik op het Deel-icoontje (vierkantje met pijltje omhoog) onderaan Safari" />
                <Stap nr={3} tekst='Kies "Zet op beginscherm"' />
                <Stap nr={4} tekst='"Voeg toe" — het LottoClub-icoontje verschijnt op je beginscherm' />
                <Stap nr={5} tekst="Open de app voortaan altijd via het icoontje op je beginscherm" />
                <Waarschuwing tekst="Push-notificaties werken ALLEEN als je de app via het beginscherm-icoontje opent, niet via Safari direct." />
              </Blok>
            </>
          )}

          {actief === 'inloggen' && (
            <>
              <Blok titel="📧 E-mail + wachtwoord">
                <Info tekst="Vul je e-mailadres en wachtwoord in en tik op 'Inloggen'." />
                <Tip tekst="Wachtwoord vergeten? Vul je e-mailadres in en tik op 'Vergeten?' naast het wachtwoordveld. Je ontvangt een reset-link per e-mail." />
              </Blok>
              <Blok titel="✉️ Magic link (zonder wachtwoord)">
                <Stap nr={1} tekst='Tik op "Inloggen via e-mail link"' />
                <Stap nr={2} tekst="Vul je e-mailadres in" />
                <Stap nr={3} tekst="Je ontvangt een e-mail — tik op de link" />
                <Stap nr={4} tekst="Je bent direct ingelogd, zonder wachtwoord" />
                <Tip tekst="Open de link bij voorkeur op hetzelfde toestel waarmee je hem hebt aangevraagd." />
              </Blok>
              <Blok titel="🔵 Google">
                <Info tekst='Tik op "Doorgaan met Google", kies je account en je bent direct ingelogd.' />
                <Tip tekst="Let op: elk Google-account maakt een apart LottoClub-account aan. Gebruik altijd hetzelfde account." />
              </Blok>
              <Blok titel="👤 Account aanmaken">
                <Stap nr={1} tekst='Tik op "Account aanmaken"' />
                <Stap nr={2} tekst="Vul je naam, e-mailadres en een wachtwoord in (minimaal 6 tekens)" />
                <Stap nr={3} tekst="Je account wordt aangemaakt met de rol Lid" />
                <Waarschuwing tekst="De beheerder kan je rol later aanpassen via Leden beheren." />
              </Blok>
            </>
          )}

          {actief === 'lid' && (
            <>
              <Blok titel="🎱 Tickets beheren">
                <Info tekst="Via je Profiel kun je lotto-tickets aanmaken met jouw vaste nummers. Deze worden automatisch gecheckt bij elke trekking." />
                <Stap nr={1} tekst="Ga naar Profiel → tik op '+ Toevoegen'" />
                <Stap nr={2} tekst="Vul 6 unieke nummers in (1-45)" />
                <Stap nr={3} tekst="Geef je ticket een naam" />
                <Stap nr={4} tekst="Sla op — je kunt meerdere tickets hebben" />
                <Tip tekst="Heb je een geluksgetal? Voeg meerdere tickets toe met verschillende combinaties." />
              </Blok>
              <Blok titel="💳 Betaling melden">
                <Info tekst="Elke ronde betaal je een inleg (standaard €4). Na het betalen meld je dit in de app." />
                <Stap nr={1} tekst="Betaal via Tikkie-link (in het WhatsApp-bericht) of gewone overboeking" />
                <Stap nr={2} tekst="Open de app → tik op 'Betalen'" />
                <Stap nr={3} tekst="Tik op 'Ik heb betaald'" />
                <Stap nr={4} tekst="De kashouder bevestigt je betaling" />
                <Stap nr={5} tekst='Je ontvangt een notificatie: "✅ Betaling bevestigd"' />
              </Blok>
              <Blok titel="🎯 Trekkingen bekijken">
                <Info tekst="Via het menu 'Trekkingen' zie je alle trekkingen. Tik op een trekking om je resultaten te zien: hoeveel nummers had je goed en wie heeft er gewonnen." />
              </Blok>
              <Blok titel="📈 Ranglijst & Hall of Fame">
                <Info tekst="Op de ranglijst zie je jouw positie ten opzichte van andere leden. Punten verdien je per trekking op basis van hoeveel nummers je goed had. De Hall of Fame toont de all-time records en top 3 aller tijden." />
              </Blok>
              <Blok titel="💰 Kasboek">
                <Info tekst="Via 'Kas' in het menu zie je het actuele kassaldo en alle kasmutaties van de vereniging." />
              </Blok>
            </>
          )}

          {actief === 'kashouder' && (
            <>
              <Blok titel="🏠 Kashouder dashboard">
                <Info tekst="Het kashouder-dashboard toont in één oogopslag alles wat aandacht nodig heeft." />
                <Info tekst="• Kassaldo — actueel saldo uit alle kasmutaties" />
                <Info tekst="• Betaalvoortgang — hoeveel leden hebben al betaald (percentage + balk)" />
                <Info tekst="• Betaalbewijzen — leden die hun betaling hebben gemeld, wachten op ✓ of ✕" />
                <Info tekst="• Openstaand — leden die nog niet betaald hebben, met WhatsApp-herinnering knop" />
                <Tip tekst="'✅ Alles in orde' verschijnt als er niets open staat." />
              </Blok>
              <Blok titel="✓ Betaling bevestigen">
                <Stap nr={1} tekst="Open het kashouder-dashboard of Financieel beheer" />
                <Stap nr={2} tekst="Tik op ✓ naast de betaling die je wilt bevestigen" />
                <Stap nr={3} tekst="De kasmutatie wordt automatisch aangemaakt" />
                <Stap nr={4} tekst="Het lid ontvangt een push-notificatie" />
              </Blok>
              <Blok titel="💬 WhatsApp-herinnering sturen">
                <Info tekst="Als een lid nog niet betaald heeft, kun je een WhatsApp-bericht sturen met een Tikkie-link (als die is ingesteld door de beheerder)." />
                <Stap nr={1} tekst="Kashouder dashboard → tik op '💬 Herinner' naast het lid" />
                <Stap nr={2} tekst="WhatsApp opent met een vooraf ingevuld bericht" />
                <Stap nr={3} tekst="Verstuur het bericht" />
                <Tip tekst="Automatische herinneringen worden elke vrijdag om 09:00 verstuurd via push-notificatie." />
              </Blok>
              <Blok titel="💸 Uitbetaling registreren">
                <Info tekst="Als er een winnaar is uitbetaald, registreer je dit via Financieel beheer → 'Uitbetaling registreren'. Vul het bedrag en de omschrijving in." />
              </Blok>
              <Blok titel="⚖️ Kascorrectie">
                <Info tekst="Als het saldo niet klopt, kun je een correctie doorvoeren via Financieel beheer → 'Kascorrectie'. Kies positief (toevoeging) of negatief (aftrek) en vul de reden in." />
              </Blok>
            </>
          )}

          {actief === 'beheerder' && (
            <>
              <Blok titel="🎱 Trekking invoeren">
                <Stap nr={1} tekst="Je ontvangt elke zaterdag om 19:30 een push-notificatie als herinnering" />
                <Stap nr={2} tekst="Open Trekkingen → tik op '+ Invoeren'" />
                <Stap nr={3} tekst="Tik op '🔗 Officiële uitslag opzoeken' om de nummers op te zoeken" />
                <Stap nr={4} tekst="Vul de 6 getrokken nummers in (het scherm springt automatisch door)" />
                <Stap nr={5} tekst="Vul eventueel de bonusbal in" />
                <Stap nr={6} tekst="Tik op '✓ Trekking opslaan & verwerken'" />
                <Stap nr={7} tekst="Alle tickets worden automatisch gecheckt — iedereen krijgt een push-notificatie" />
              </Blok>
              <Blok titel="👥 Leden beheren">
                <Info tekst="Via 'Leden' kun je alle leden zien, zoeken en filteren. Je kunt rollen aanpassen via de dropdown: Lid / Kashouder / Beheerder." />
                <Waarschuwing tekst="Er moet altijd minimaal 1 beheerder zijn. De app blokkeert het demoten van de laatste beheerder." />
              </Blok>
              <Blok titel="⚙️ Admin paneel">
                <Info tekst="Via Beheer → Admin kun je het systeem configureren:" />
                <Info tekst="• Instellingen — Tikkie-link instellen, notificaties aan/uit" />
                <Info tekst="• Spel — aantal getallen, min/max, bonusbal" />
                <Info tekst="• Prijzen — prijsverdelingsmodus" />
                <Info tekst="• Seizoen — nieuw seizoen starten of afsluiten" />
                <Info tekst="• Audit log — alle systeemactiviteit" />
              </Blok>
              <Blok titel="💳 Tikkie-link instellen">
                <Stap nr={1} tekst="Maak een Tikkie-betaalverzoek aan voor €4 in de Tikkie-app" />
                <Stap nr={2} tekst="Kopieer de link (https://tikkie.me/pay/...)" />
                <Stap nr={3} tekst="Ga naar Beheer → Admin → tab Instellingen → Tikkie-link" />
                <Stap nr={4} tekst="Plak de link en tik 'Tikkie-link opslaan'" />
                <Tip tekst="Vanaf nu staat de Tikkie-link automatisch in elk WhatsApp-herinneringsbericht." />
              </Blok>
              <Blok titel="🏆 Seizoen beheren">
                <Info tekst="Start een nieuw seizoen via Admin → Seizoen → 'Nieuw seizoen starten'. Je kunt pas een nieuw seizoen starten als het vorige is afgesloten." />
              </Blok>
            </>
          )}

          {actief === 'betalen' && (
            <>
              <Blok titel="💳 Betaalflow stap voor stap">
                <Stap nr={1} tekst="Kashouder stuurt WhatsApp-herinnering met Tikkie-link (handmatig of automatisch elke vrijdag)" />
                <Stap nr={2} tekst="Lid tikt op de Tikkie-link en betaalt €4 via eigen bank-app" />
                <Stap nr={3} tekst="Lid opent LottoClub → 'Betalen' → tikt 'Ik heb betaald'" />
                <Stap nr={4} tekst="Kashouder ziet de melding op het dashboard" />
                <Stap nr={5} tekst="Kashouder tikt ✓ → betaling bevestigd" />
                <Stap nr={6} tekst="Lid ontvangt push-notificatie: '✅ Betaling bevestigd'" />
                <Stap nr={7} tekst="Kasmutatie wordt automatisch aangemaakt in het kasboek" />
              </Blok>
              <Waarschuwing tekst="Betaal altijd via de Tikkie-link of overboeking VOORDAT je de betaling meldt in de app." />
              <Tip tekst="Automatische herinneringen: elke vrijdag 09:00 krijgen leden met een openstaande betaling een push-notificatie." />
            </>
          )}

          {actief === 'trekking' && (
            <>
              <Blok titel="🎯 Trekkingsflow stap voor stap">
                <Stap nr={1} tekst="Elke zaterdag 19:30 — beheerder ontvangt push: '🎱 Lotto-uitslag invoeren'" />
                <Stap nr={2} tekst="Beheerder opent Trekkingen → tikt '+ Invoeren'" />
                <Stap nr={3} tekst="Tik op '🔗 Officiële uitslag opzoeken' om nummers te checken" />
                <Stap nr={4} tekst="Vul de 6 nummers in (scherm springt automatisch door naar het volgende veld)" />
                <Stap nr={5} tekst="Vul eventueel de bonusbal in" />
                <Stap nr={6} tekst="Tik '✓ Trekking opslaan & verwerken'" />
                <Stap nr={7} tekst="Alle tickets van alle leden worden automatisch gecheckt (server-side)" />
                <Stap nr={8} tekst="Ranglijstpunten worden bijgewerkt" />
                <Stap nr={9} tekst="Iedereen ontvangt een push: 'Jij had X goed. Winnaar: [naam]'" />
              </Blok>
              <Tip tekst="De officiële uitslag van de Nederlandse Lotto is beschikbaar via nederlandseloterij.nl/lotto/uitslagen." />
            </>
          )}

          {actief === 'notificaties' && (
            <>
              <Blok titel="🔔 Welke notificaties zijn er?">
                <Info tekst="✅ Betaling bevestigd — als de kashouder je betaling goedkeurt" />
                <Info tekst="🎱 Trekking resultaten — na elke trekking met jouw persoonlijk resultaat" />
                <Info tekst="⏰ Betaalherinnering — elke vrijdag 09:00 als je betaling nog open staat" />
                <Info tekst="🎱 Lotto-uitslag invoeren — elke zaterdag 19:30 (alleen voor beheerders)" />
              </Blok>
              <Blok titel="📲 Notificaties inschakelen">
                <Stap nr={1} tekst="Zorg dat de app is geïnstalleerd via het beginscherm-icoontje" />
                <Stap nr={2} tekst="Open de app via het beginscherm-icoontje (niet via Safari)" />
                <Stap nr={3} tekst="Ga naar Profiel → Push notificaties → schakel in" />
                <Stap nr={4} tekst="Geef toestemming als je telefoon daarom vraagt" />
              </Blok>
              <Waarschuwing tekst="Notificaties werken ALLEEN als je de app opent via het beginscherm-icoontje. Via Safari werken ze niet." />
            </>
          )}

          {actief === 'faq' && (
            <>
              <Blok titel="Ik ontvang geen notificaties">
                <Info tekst="• Controleer of je de app hebt geïnstalleerd via het beginscherm-icoontje (niet Safari)" />
                <Info tekst="• Ga naar Profiel → Push notificaties → schakel in" />
                <Info tekst="• Controleer of je telefooninstellingen notificaties toestaan voor LottoClub" />
              </Blok>
              <Blok titel="Ik kan geen nieuwe betaling melden">
                <Info tekst="Je hebt mogelijk al een openstaande of bevestigde betaling. Wacht tot de kashouder je vorige betaling heeft verwerkt." />
              </Blok>
              <Blok titel="Ik zie 'Geen actief seizoen'">
                <Info tekst="De beheerder moet een nieuw seizoen starten via Beheer → Admin → Seizoen → 'Nieuw seizoen starten'." />
              </Blok>
              <Blok titel="Mijn ticket-nummers worden niet geaccepteerd">
                <Info tekst="• Controleer of je het juiste aantal nummers hebt ingevuld (standaard 6)" />
                <Info tekst="• Alle nummers moeten uniek zijn" />
                <Info tekst="• Nummers moeten tussen 1 en 45 liggen (standaard)" />
              </Blok>
              <Blok titel="Ik wil mijn telefoonnummer toevoegen">
                <Info tekst="Ga naar Profiel → Telefoonnummer → vul in → tik 'Opslaan'. Dit is nodig voor WhatsApp-herinneringen van de kashouder." />
              </Blok>
              <Blok titel="Hoe werkt de ranglijst?">
                <Info tekst="Na elke trekking krijg je punten op basis van hoeveel nummers je goed had. De ranglijst toont alle leden gesorteerd op totaal punten in het huidige seizoen." />
              </Blok>
            </>
          )}

        </div>
      </div>
    </>
  );
}

export default function HelpPage() {
  return (
    <ProtectedRoute>
      <HelpContent />
    </ProtectedRoute>
  );
}
