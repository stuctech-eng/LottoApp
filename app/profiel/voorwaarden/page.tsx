'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { subscribeVerenigingConfig, DEFAULT_VERENIGING_CONFIG } from '@/lib/firestore-vereniging';
import { subscribeAllUsers } from '@/lib/firestore-users';
import { User } from '@/lib/types';

/**
 * Inhoud gebaseerd op een concept dat is voorgelegd aan GPT ter
 * beoordeling (15 augustus 2026) — bewust ingekort, informeel en
 * zonder eigen juridische conclusies (bijv. geen "wij zijn
 * vergunningvrij"-claim, dat is een inschatting die niet in eigen
 * voorwaarden hoort). Twee dingen zijn HIER dynamisch gemaakt t.o.v.
 * het oorspronkelijke concept: de standaard inleg (was hardcoded €4,
 * maar is in de app zelf instelbaar via Beheer → Instellingen) en de
 * namen van de huidige beheerder(s)/kashouder(s).
 */

function Sectie({ nr, titel, children }: { nr?: number; titel: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--white)' }}>
        {nr ? `${nr}. ` : ''}{titel}
      </div>
      <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function Lijst({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function VoorwaardenContent() {
  const { profile } = useAuth();
  const [standaardInleg, setStandaardInleg] = useState(DEFAULT_VERENIGING_CONFIG.standaardInleg);
  const [leden, setLeden] = useState<User[]>([]);

  useEffect(() => {
    const unsub = subscribeVerenigingConfig(cfg => setStandaardInleg(cfg.standaardInleg));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeAllUsers(setLeden);
    return unsub;
  }, []);

  const beheerders = leden.filter(l => l.rol === 'beheerder' && l.actief).map(l => l.naam);
  const kashouders = leden.filter(l => l.rol === 'kashouder' && l.actief).map(l => l.naam);
  const dashboardHref = profile?.rol === 'beheerder' ? '/beheerder' : profile?.rol === 'kashouder' ? '/kashouder' : '/dashboard';

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 16px' }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, letterSpacing: -0.5 }}>📋 Voorwaarden</div>
          <Link href={dashboardHref} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
        </div>

        <div style={{ padding: '0 20px 40px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            LottoClub is onze besloten clubomgeving voor het gezamenlijk spelen van Lotto. De app is gemaakt om het voor iedereen zo eenvoudig en transparant mogelijk te maken. Je kunt in de app altijd zien waar je aan meedoet, welke nummers je hebt, welke trekkingen zijn geweest, hoeveel je hebt verzameld, hoeveel saldo je hebt, hoe de gezamenlijke kas ervoor staat, en welke resultaten zijn behaald. De app houdt de administratie bij, zodat we dit niet meer met losse lijstjes en berichten hoeven te doen.
          </div>

          <Sectie nr={1} titel="Wie kan meedoen?">
            LottoClub is een besloten groep. Je kunt alleen lid worden wanneer je persoonlijk bent uitgenodigd door de beheerder of kashouder. Er is geen openbare registratie. Een uitnodiging is persoonlijk, eenmalig bruikbaar en heeft een beperkte geldigheidsduur. De beheerder kan een lidmaatschap beëindigen wanneer dat binnen de club nodig is.
          </Sectie>

          <Sectie nr={2} titel="Hoe werkt het spel?">
            We spelen met 6 nummers. Bij iedere trekking worden de getrokken nummers met jouw gekozen nummers vergeleken. Een nummer dat je goed hebt, blijft voor jou meetellen — je verzamelt daardoor goede nummers over meerdere trekkingen. Het doel is om uiteindelijk 6 goede nummers te verzamelen. Wie als eerste 6 goede nummers heeft, is winnaar. Zijn er meerdere spelers die 6 goede nummers bereiken, dan zijn er meerdere winnaars en wordt de beschikbare prijs volgens de afgesproken spelregels verdeeld. Na een winnaar begint een nieuwe speelreeks.
          </Sectie>

          <Sectie nr={3} titel="Alleen betaalde deelnames tellen mee">
            Je doet alleen mee aan een trekking wanneer je daarvoor voldoende saldo hebt. Heb je voor een trekking geen saldo? Dan telt die trekking voor jou niet mee. Je nummers blijven gewoon op je profiel staan en kunnen bij een volgende betaalde trekking weer meedoen.
          </Sectie>

          <Sectie nr={4} titel="Betalen is eenvoudig">
            Je hoeft niet iedere week opnieuw een betaling te regelen. Je stort een bedrag naar je LottoSaldo. De kashouder controleert de storting en verwerkt deze in de app. Daarna doet de app het automatisch: bij voldoende saldo wordt €{standaardInleg.toFixed(2)} automatisch voor de speelweek afgeschreven — je hoeft daar verder niets voor te doen. Is je saldo niet meer voldoende? Dan krijg je daarvan een melding en kun je opnieuw saldo storten. Je kunt zelf bepalen hoeveel je vooruit wilt storten.
          </Sectie>

          <Sectie nr={5} titel="De digitale kas">
            De gezamenlijke kas is zichtbaar voor de leden. Zo kan iedereen zien hoeveel geld er volgens de administratie in de clubkas zit. De persoonlijke bankrekening van de kashouder is privé en wordt uiteraard niet in de app getoond. De kashouder en beheerder verwerken de financiële mutaties. Betalingen, uitbetalingen en correcties worden in de administratie vastgelegd.
          </Sectie>

          <Sectie nr={6} titel="Transparantie">
            LottoClub is opgezet met één belangrijk uitgangspunt: iedereen moet kunnen zien hoe de club ervoor staat. Daarom zijn de relevante gegevens binnen de app inzichtelijk voor de leden. De app houdt onder andere bij:
            <Lijst items={['Betalingen', 'LottoSaldo', 'Kasmutaties', 'Trekkingen', 'Resultaten', 'Winnaars', 'Ranglijst', 'Historische deelnames']} />
          </Sectie>

          <Sectie nr={7} titel="Uitnodigingen en toegang">
            Alleen de beheerder en kashouder kunnen nieuwe leden uitnodigen. Een uitnodiging is persoonlijk, kan één keer worden gebruikt, verloopt automatisch, en geeft na controle toegang tot de club. Een doorgestuurde of verlopen uitnodiging geeft geen toegang. Dit voorkomt dat onbekende personen zomaar toegang krijgen tot LottoClub.
          </Sectie>

          <Sectie nr={8} titel="Jouw gegevens">
            Om LottoClub goed te laten werken, worden bepaalde gegevens opgeslagen. Dit kan onder andere zijn:
            <Lijst items={['Naam', 'E-mailadres', 'Telefoonnummer, wanneer je dit opgeeft', 'Gekozen nummers', 'Deelnamegegevens', 'LottoSaldo', 'Betaalgegevens binnen de clubadministratie', 'Spelresultaten', 'Ranglijstgegevens']} />
            <div style={{ marginTop: 10 }}>
              Deze gegevens worden gebruikt om LottoClub te laten functioneren en om de clubadministratie correct bij te houden. We verkopen jouw persoonsgegevens niet en gebruiken ze niet voor commerciële advertenties of commerciële profilering. Voor technische onderdelen van de app worden externe diensten gebruikt, zoals Firebase/Google Cloud. Deze diensten kunnen persoonsgegevens verwerken voor zover dat nodig is om de app te laten functioneren.
            </div>
          </Sectie>

          <Sectie nr={9} titel="Jouw privacy">
            Je persoonlijke gegevens worden niet zomaar met andere leden gedeeld. Andere leden zien alleen de informatie die volgens de werking van LottoClub voor de club zichtbaar hoort te zijn. Persoonlijke accountgegevens en financiële gegevens die niet voor de clubtransparantie bedoeld zijn, blijven afgeschermd. We nemen passende maatregelen om de gegevens van leden te beschermen.
          </Sectie>

          <Sectie nr={10} titel="Als je stopt">
            Wanneer je geen lid meer bent, wordt je account uit de actieve ledenlijst verwijderd. Historische informatie kan gedeeltelijk worden bewaard wanneer dat nodig is voor een correcte clubadministratie, bijvoorbeeld om eerdere betalingen, deelnames, uitslagen of uitbetalingen te kunnen controleren. Je kunt altijd contact opnemen met de beheerder wanneer je wilt weten welke gegevens van jou worden verwerkt of wanneer je een verzoek over je persoonsgegevens wilt indienen.
          </Sectie>

          <Sectie nr={11} titel="De app">
            LottoClub wordt met zorg onderhouden. Toch kan een technische storing nooit volledig worden uitgesloten. Denk bijvoorbeeld aan een storing van de app, internetproblemen, een storing bij Firebase/Google Cloud, problemen met notificaties, of problemen bij een externe betaaldienst. Wanneer er een fout wordt ontdekt, proberen we deze zo snel mogelijk te herstellen. De app is een hulpmiddel voor de clubadministratie — de officiële spelregels en daadwerkelijk geregistreerde betalingen en trekkingen blijven leidend.
          </Sectie>

          <Sectie nr={12} titel="Startinfo & Speluitleg">
            Alles wat je over LottoClub moet weten, staat altijd opnieuw in de app. Ga naar <Link href="/startinfo" style={{ color: 'var(--accent)' }}>Profiel → 📖 Startinfo & Speluitleg</Link>. Daar vind je de spelregels, uitleg over LottoSaldo, betalen, trekkingen, de ranglijst, de kas, veelgestelde vragen, en uitleg voor iPhone en Android. Je hoeft dus niets te onthouden.
          </Sectie>

          <Sectie nr={13} titel="Vragen?">
            Heb je een vraag over je saldo, een betaling, een trekking, je nummers, de kas, of je lidmaatschap? Neem dan contact op met de kashouder of beheerder. We proberen problemen en vragen zo snel mogelijk op te lossen.
          </Sectie>

          <Sectie nr={14} titel="Belangrijk">
            LottoClub is bedoeld voor deelname binnen onze besloten club. Door lid te worden bevestig je dat je de spelregels en deze informatie hebt gelezen en begrijpt.
            <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--white)' }}>Veel speelplezier! 🎱</div>
          </Sectie>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            {beheerders.length > 0 && <div>Beheerder{beheerders.length > 1 ? 's' : ''}: {beheerders.join(', ')}</div>}
            {kashouders.length > 0 && <div>Kashouder{kashouders.length > 1 ? 's' : ''}: {kashouders.join(', ')}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

export default function VoorwaardenPage() {
  return (
    <ProtectedRoute>
      <VoorwaardenContent />
    </ProtectedRoute>
  );
}
