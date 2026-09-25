# Changelog — LottoClub

Nieuwste bovenaan. Elke sessie voegt een nieuwe sectie toe.

---

## 23 september 2026 (later die dag) — Eigen bevestigingsscherm, betaling-bedrag-correctie, onboarding-vangrail, geen punten meer

### `window.confirm()` vervangen door een eigen `ConfirmDialog`
Aanleiding: een kashouder drukte op "Verreken", de app leek vast te lopen — bleek het systeem-bevestigingsvenstertje te zijn dat op een als PWA geïnstalleerde iPhone-app onzichtbaar kan blijven hangen, terwijl de app er stilletjes op wacht te wachten. Nieuw, herbruikbaar `components/ConfirmDialog.tsx`, zelfde stijl als de rest van de app. Vervangen op alle 11 plekken die `window.confirm()` gebruikten: `/leden/[id]` (Storten, Verreken, Verwijderen, Definitief verwijderen), `/kashouder` en `/kashouder/financieel` (Storten, Verreken), `/beheerder/admin` (Herbereken speelreeks, Prijsbedrag herberekenen, Notificatie verwijderen).

### Betaling-bedrag-correctie — nieuw, en verplaatst naar Beheer → Admin
Aanleiding: een prijswijziging (€4 → €2) die halverwege een week inging, waardoor sommige leden nog het oude bedrag betaalden. De bestaande "Betaling corrigeren" op Financieel bleek daar niet geschikt voor — die verandert alleen een statusvlag (`markeerBetalingGecorrigeerd`), nooit het bedrag zelf, en **de prijzenpot-berekening leest precies dat bedrag-veld**. Saldo corrigeren (bestond al) raakt dat veld ook niet aan.

Nieuw: `corrigeerBetalingBedrag()` in `lib/firestore-payments.ts` — wijzigt het `bedrag`-veld van een betaling zelf (fixt de prijzenpot direct), schrijft het verschil bij op LottoSaldo, laat de kas ongemoeid (het geld kwam echt binnen, alleen welke week het dekt verandert), en triggert de bekende verreken-check. De oude "Betaling corrigeren"-sectie (inclusief het "Herstel"-lijstje) is van Financieel verwijderd en herbouwd als nieuwe tab **"💳 Betalingen"** op `/beheerder/admin`, zoals gevraagd — alle correcties op één, beheerder-only plek in plaats van verspreid.

**Bekend, opgelost incident tijdens gebruik:** een correctie werd per ongeluk op de verkeerde week-rij toegepast (2026-W37 i.p.v. W39) — geen bug, wel een aanwijzing om bij het zoeken eerst op naam te filteren zodat er geen andere rij per ongeluk binnen bereik ligt.

### `ProtectedRoute` — permanente onboarding-vangrail
Aanleiding (het "Neeltje-incident"): een lid met de verplichte onboarding (telefoon + ticket, 22 september) kwam alsnog zonder die gegevens de app in. Bleek: de navigatie naar `/welkom` bestond maar op één plek — een eenmalige redirect direct na het verzilveren van een uitnodiging, beveiligd met een `useRef`-vlaggetje tegen een bekende race-conditie. Die bescherming werkt alleen binnen dezelfde paginasessie; sluit iemand de app af vlak vóór die ene redirect vuurt, dan bestaat het profiel al (`onboardingCompleted: false`) en stuurde niets hem alsnog naar `/welkom`. Bevestigd via codecontrole: nergens anders in de app werd dit veld ooit gecheckt.

Fix: `ProtectedRoute` (de wrapper om elke beveiligde pagina) controleert nu bij **elke** pagina-load `profile.onboardingCompleted === false` (expliciet, nooit `!profile.onboardingCompleted` — een ontbrekend veld bij elk ouder account betekent "niet van toepassing", niet "nog niet afgerond") en stuurt dan altijd naar `/welkom`, voor alle rollen. `/welkom` zelf is uitgezonderd (anders een redirect-lus). Spinner tijdens het laden, nooit een flits van de echte pagina.

### `/welkom` — twee bugs gevonden tijdens het herstellen van Neeltje's geval
1. **Navigeerde altijd door, ook bij een mislukte opslag.** `handleAfronden` deed drie opslag-stappen (telefoon, ticket, `onboardingCompleted: true`) in een `try`, maar navigeerde in de `finally` — dus ook als de laatste stap (het vlaggetje) mislukte door bijv. een netwerkhapering. Precies wat er bij Neeltje gebeurde: telefoon en ticket stonden goed, het vlaggetje niet. Fix: navigeert alleen nog bij een volledig geslaagde `try`; bij een fout blijft de gebruiker op de pagina met een duidelijke melding.
2. **Velden begonnen altijd leeg**, ook als er al een telefoonnummer/ticket bekend was (zoals bij iedereen die door bug 1 werd geraakt). Fix: een `useEffect` vult telefoon en ticketnummers nu vooraf in vanuit het profiel, indien aanwezig — wie alles al had ingevuld, hoeft nu alleen nog te bevestigen.

### Geen puntensysteem meer — Ranglijst, Hall of Fame, Profiel
Aanleiding: LottoClub heeft nooit een puntensysteem gecommuniceerd naar leden — "6 goed = winnen" is de hele regel. Het bestaande `ranglijstPunten`-veld (`nieuwe treffers × 10 + bonusbal-bonus`, server-side bijgehouden) was dus een onuitgelegd getal dat nergens bij hoorde, en leverde precies de vraag op die je bij zoiets verwacht: "waarom heeft Ing 60 punten?"

- **Ranglijst** (`totaalTreffers` i.p.v. `totaalPunten`, `lib/firestore-ranglijst.ts`) — eerlijke, direct navolgbare telling: som van nieuwe treffers dit seizoen, dezelfde onderliggende data (`nummersGoed`) die al voor `besteScore`/`gemiddeldeScore` werd gebruikt. Het `ranglijstPunten`-veld zelf blijft server-side bestaan (niet aangeraakt, buiten scope), alleen deze pagina's tonen en sorteren er niet meer op.
- **Hall of Fame** — herbouwd rond kleine, concrete, zelf-verklarende records i.p.v. een tweede punten-ranglijst: Snelste winnaar, Meeste overwinningen, Grootste treffer (nieuw samengevoegd — was eerder los "meeste nummers in één trekking"), **Op het randje** (nieuw — vaakst op 5/6 gestaan zonder die reeks te winnen, geeft ook wie nooit wint iets om trots op te zijn), een lichter **"Race naar 6"**-blokje (eerste op 3/6, 4/6, 5/6 — sluit aan bij het 6-goed-wint-principe), en **De getallen** (meest/minst gevallen nummer, all-time). De oude "All-time top deelnemers"-lijst (dupliceerde Ranglijst) is verwijderd.
- **Profiel** toonde ook nog het rauwe puntengetal — vervangen door hetzelfde "treffers dit seizoen", opgehaald via `subscribeRanglijst()`.
- **Startinfo** (`/startinfo`, tabs Schermen en FAQ) — twee tekstblokken die de oude puntenberekening uitlegden, herschreven naar de treffers-uitleg.

**Bewust overwogen en afgewezen tijdens het ontwerp** (zie eerdere Overleg-rondes): "Lucky number" (niet betrouwbaar te berekenen — resultaten slaan alleen nieuwe treffers per trekking op, een al eerder geraakt nummer telt dus niet opnieuw mee ook al staat het nog op iemands ticket) en "Meeste treffers dit seizoen" als apart Hall-of-Fame-record (zou gewoon "nummer 1 van Ranglijst" herhalen).

---

## 23 september 2026 — Harde stort-deadline (zaterdag 18:00), drie nieuwe meldingen

Aanleiding: een vraag over of leden nog "de ballen konden zien" vóórdat de trekking werd ingevoerd, en dan snel nog konden storten om alsnog mee te tellen — een maas die kon ontstaan omdat er voorheen geen harde grens was, alleen "wanneer de beheerder toevallig invoert". Uitgewerkt in expliciet afgebakende fases, elke fase eerst geaudit en getest vóór de volgende begon.

### Fase A — de deadline zelf, alleen in `stortLottoSaldo`
Nieuw géld (storten) wordt na zaterdag 18:00 van de betreffende speelweek niet meer automatisch aan die trekking gekoppeld — het bedrag komt wél gewoon op het LottoSaldo, blijft daar staan, en wordt automatisch gebruikt zodra de volgende week begint. **Bestaand saldo wordt hier nooit door geraakt**: Verreken, Saldo corrigeren en de ticket-aanmaken-trigger roepen de gedeelde verrekenfunctie allemaal rechtstreeks aan, zonder deze check — blijven dus altijd beschikbaar, ook ná de deadline. De check zit daardoor **op precies één plek** in de code.

Grens: **18:00:00 zelf telt al als gesloten** (niet pas 18:00:01) — expliciet zo aangescherpt na een eerste review.

Weekbepaling is bewust géén simpele "is het nu zaterdag na 18:00"-vlag — die zou ook de hele zondag blokkeren. In plaats daarvan: bepaal via `relevanteTrekkingWeek()` (club-breed, architectuurregel 12) vóór welke speelweek de storting geldt, en vergelijk met de zaterdag-18:00 van precies díe week (`zaterdagDeadlineVanWeek()`, nieuw, puur — hergebruikt dezelfde week-1-ankerlogica als `weekStringNaarDatum()`). Zodra de beheerder de trekking heeft ingevoerd en de nieuwe week is begonnen, werkt storten voor die nieuwe week direct weer door, ook op zondag.

Getest met een geïsoleerd script (`test-lottosaldo-deadline.js`, geen Firestore) vóór dit in de echte functie bleef staan — 6/6 scenario's geslaagd: vóór de deadline, exact op de grens, ruim erna, zondag-voor-trekking-invoer, zondag-na-trekking-invoer, en codecontrole dat Verreken/corrigeren/ticket-trigger allemaal ongemoeid blijven.

### Fase C — banner op `/betalen`
Puur informatief, blokkeert nooit het storten zelf. Normaal: "Alle betalingen moeten vóór zaterdag 18:00 binnen zijn i.v.m. de trekking van die avond." Ná de deadline: legt uit dat een nieuwe storting nog gewoon op het saldo komt, maar niet meer voor vanavond meetelt. Eigen, club-brede weekbepaling — bewust niet de al-bestaande, per-lid-gescoped `week`-variabele op deze pagina hergebruikt. 10/10 tests (6 uit fase A + 4 banner-specifieke, zelfde geteste kernfunctie). Herberekent bij elke render, niet live tikkend — bewust zo gelaten, geen toegevoegde waarde tegen extra complexiteit voor een puur informatief element.

### Drie nieuwe meldingen
- **Welkomstmelding** — nieuw, `onOnboardingVoltooid` (Firestore-trigger op `users/{userId}`, `onboardingCompleted` false→true — dus ná de verplichte telefoon+ticket-stap, niet bij het aanmaken van het account). Twee varianten op basis van `wachtOpNieuweSpeelreeks`: wie meteen meedoet krijgt een concrete oproep vóór de deadline; wie nog wacht krijgt een andere boodschap zónder die druk (voor hen geldt de deadline niet). Categorie: bestaande `herinneringen`.
- **Woensdag 09:00** — nieuw, algemene vroege herinnering ("Vergeet je LottoSaldo niet aan te vullen voor deze week"). Zelfde detectie als de bestaande vrijdagmelding (open betalingen huidige week) — **bewust niet de zelfhelende variant**, die fix staat apart gepland (zie hieronder) en is hier niet stilzwijgend meegenomen, voor traceerbaarheid.
- **Zaterdag 12:00** — bestond al, **tekst en doelgroep aangepast**: stuurde eerder naar íedereen (met een positieve tekst bij genoeg saldo, een waarschuwing bij te weinig). Sinds woensdag erbij kwam, is de "goed bezig!"-variant overbodige ruis geworden — stuurt nu **uitsluitend** naar wie op dat moment nog te weinig saldo heeft, met rustigere tekst ("Je LottoSaldo is bijna op...") i.p.v. de oude "nog exact 6 uur"-urgentie.

### Belangrijk: audit tijdens deze sessie ontdekt
Bij het bouwen van de meldingen bleek een eerder gebouwde fix — de zelfhelende vrijdagherinnering (checkt zelf eerst of iemand stiekem al genoeg saldo heeft vóór hij een "nog niet betaald"-melding stuurt) — **nooit gedeployed**, ondanks dat de zip wel was aangeleverd. Bewust **niet** alsnog stilzwijgend meegenomen in deze sessie, ook al werd toch hetzelfde bestand aangepast — dat zou de scope onnodig vermengen en de traceerbaarheid schaden. Staat apart gepland: eerst een losse audit tegen de dan-actuele live-versie, dan pas bouwen.

### Documentatie
`/startinfo` (tab Betalen) kreeg een nieuw blok "⏰ Deadline: zaterdag 18:00" met de exacte regel in gewone taal, en de bestaande waarschuwing is scherper gemaakt (was: vaag "vóór de trekking", nu: concreet "vóór zaterdag 18:00").

---

## 22-23 september 2026 — Dashboard/Deelnemers/Leden volledig herontwerp, Vereist Aandacht, verplichte onboarding

Grote sessie, in stappen opgebouwd via previews op een canvas voordat er iets werd gebouwd. Samengevat: leden en beheerder kregen hetzelfde, "vak-als-knop" dashboard; Deelnemers en Leden werden allebei herbouwd rond een detailpagina per persoon; en nieuwe leden kunnen niet meer per ongeluk zonder ticket/telefoon het dashboard in.

### Gedeeld dashboard — `components/SpelerDashboard.tsx`

Leden en beheerder gebruiken nu **letterlijk dezelfde component**. `app/dashboard/page.tsx` en `app/beheerder/page.tsx` zijn allebei dunne laagjes (rol-redirect) die `<SpelerDashboardContent allowedRoles={[...]} extraTop={...} />` renderen. Reden: twee losse, bijna-identieke kopieën zouden onherroepelijk uit elkaar gaan groeien — precies het patroon dat al eerder deze sessie een bug veroorzaakte (het "Herinner"-knopje dat op twee plekken los stond).

**Bijgevangen tijdens het uitsplitsen**: een `useState`-aanroep die ná een voorwaardelijke `return` stond — een harde schending van React's hooks-regels, die de pagina kon laten crashen zodra `profileLoading` van `true` naar `false` wisselde. Nooit een gemeld incident geweest, preventief gevonden en gefixt.

De bottom-nav highlight ("welke tab is actief") was voorheen hardcoded op Dashboard — nu via `usePathname()`, want het component draait nu op twee verschillende routes.

### Beheerder-dashboard = ledendashboard + "Vereist aandacht"

Beheerder speelt ook mee, dus ziet nu exact hetzelfde als een lid — plus één kaart bovenaan. Deze kaart heeft een eigen ontwikkelgeschiedenis binnen deze sessie, het vermelden waard omdat elke stap een echte correctie was, geen smaakkeuze:

1. **Eerste versie**: een verzamel-tegel met een totaalcijfer en een opsomming (bijv. "3 — 1 in wachtrij · 1 zonder telefoon · 1 openstaand").
2. **Wachtrij eruit gehaald**: een wachtrij-lid vereist geen actie — dat lost zichzelf op zodra er gewonnen wordt. Meetellen als "aandacht vereist" zou het woord uithollen.
3. **Volledige inventarisatie**: uitgebreid naar 6 checks (trekking niet ingevoerd, in verificatie, openstaand, geen ticket, zonder telefoon, Tikkie lang niet gecheckt), in prioriteitsvolgorde.
4. **"In verificatie" weer verwijderd**: bleek een **onbereikbare status** — de functies die 'm ooit aanmaakten (`meldBetaling`, `meldLottoSaldoStorting`) en bevestigden (`bevestigBetaling`) waren al op 25 juli verwijderd. Een check op iets dat niet meer kan gebeuren is dode code.
5. **Omgebouwd naar "probleem voor probleem"**: op verzoek — niet langer een verzamellijst, maar altijd precies één probleem tegelijk, in vaste volgorde. Bij een persoonsgebonden probleem (openstaand, geen ticket, zonder telefoon) linkt de tegel **direct naar die ene persoon** met zijn naam erop, niet naar de algemene lijst. Bij de twee proces-problemen (trekking, Tikkie) blijft de link naar de bijbehorende pagina zelf. Oplossen → tegel verdwijnt of springt door naar het volgende, zonder wegklikken.

### Deelnemers — herontwerp + nieuwe detailpagina

`app/deelnemers/page.tsx`: gesorteerd op aantal goed i.p.v. willekeurige lijstvolgorde, ballen met highlighting van geraakte nummers, betaalstatus per persoon, eigen rij gemarkeerd. Voor de beheerder verschijnt er een tabbalk ("Deelnemers" / "👑 Administratief") die naar de Leden-pagina leidt — voor leden en kashouder onzichtbaar.

**Nieuw**: `app/deelnemers/[id]/page.tsx` — tikken op een naam geeft een detailpagina met historische winst-statistieken (`Gewonnen X keer`, `Totaal winst`, `Laatst gewonnen`), die **over de volledige geschiedenis** gaan, niet alleen de laatste trekking. Daarvoor is `subscribeUserResultaten()` toegevoegd aan `lib/firestore-trekkingen.ts` (bewust geen `orderBy()`, architectuurregel 1 — sorteren gebeurt client-side via een trekkingId→datum-koppeling).

### Leden Administratie — volledige overhaul

`app/leden/page.tsx`: van een statische lijst met losse rol-dropdown + rood kruisje per rij, naar tegel-als-knop-rijen met een wachtrij-filter en -badge. Rol wijzigen en verwijderen zijn van de rij af verhuisd.

**Nieuw**: `app/leden/[id]/page.tsx` — 4 tabs (Overzicht, Ticket, Betalingen, Acties). Gebouwd in meerdere rondes na expliciete controle van wat er al **niet** werkte:

- **Eerste versie** had alleen Rol wijzigen, Saldo corrigeren, en Status (verwijderen/heractiveren).
- **Gecontroleerd of "Vereist aandacht" ook echt oploste wat het beloofde** — bleek voor 4 van de 6 problemen niet zo: geen Bevestigen-knop voor verificatie (die overigens sowieso niet meer kan voorkomen, zie boven), geen Storten/Verreken, geen manier om een ontbrekend telefoonnummer toe te voegen, en "Tikkie" hoorde daar sowieso niet thuis.
- **Storten + Verreken toegevoegd** aan de Acties-tab, met een **"Betaalstatus deze week"**-check die pas laat zien wat nodig is — een bug onderweg gevonden en gefixt: de Verreken-knop verscheen eerder zodra saldo toereikend was, ook als iemand al gewoon betaald had. Nu eerst checken of er deze week al `'betaald'` is (club-breed bepaald, architectuurregel 12 — nooit alleen op basis van dit ene lid se eigen historie).
- **Telefoon bewerkbaar gemaakt** in Overzicht — loste het "dode spoor" op waarbij een ontbrekend nummer wél zichtbaar was, maar nergens aan te passen.
- **"LottoSaldo aanvullen" toegevoegd** — een tweede, apart storten-pad met een vrij bedrag (naast de vaste-bedrag-knop), voor vooruitbetalen van meerdere weken ineens. Bestond al op Financieel (`handleStorting`), was hier vergeten. Bewust **niet** verstopt achter "nog niet betaald" — vooruitstorten kan ook als deze week al betaald is. Saldo staat er nu ook prominent bovenaan, niet meer weggestopt in een zin.

### Verplichte onboarding — telefoon + ticket

`app/welkom/page.tsx` kreeg een 6e, verplichte stap. Eerder stond er alleen **tekst** die aanraadde een ticket in te stellen en te storten — niets hield een nieuw lid tegen om direct door te klikken naar het dashboard zonder telefoonnummer of ticket. Nu blijft de knop "Naar het dashboard" uitgeschakeld totdat beide geldig zijn ingevuld. Geldt voor elke nieuwe uitnodiging vanaf nu, ook voor wie in de wachtrij terechtkomt (doorloopt dezelfde flow).

---

## 22 september 2026 — Ticket-wijzigen-sluitingsvenster, en een echte bug in de controle-engine ontdekt tijdens het bouwen ervan

Aanleiding: een vraag over wannéér een lid zijn Lotto-nummers eigenlijk mag wijzigen, legde bloot dat daar **helemaal geen beperking op zat** — op elk moment, zelfs midden in een speelreeks. Bij het uitzoeken bleek dat geen kosmetisch gaatje, maar een echte fout in de scoretelling zelf.

### De bug — matchedNumbers werd blind overgenomen, ongeacht het huidige ticket

`berekenMatches()` in `lib/controle-engine.ts` nam cumulatieve matches van vóór een trekking altijd volledig over (`[...vorigeMatches, ...nieuweMatches]`), zonder te checken of die getallen nog wel op het HUIDIGE ticket stonden. Omdat het bewerken van een ticket hetzelfde `ticket.id` behoudt (`TicketEditorModal.tsx`: `id: ticket?.id ?? ...`), koppelt de engine oude voortgang aan dat ID — dus een lid dat halverwege een speelreeks zijn 6 nummers wijzigde, behield ten onrechte de oude, opgebouwde matches (tot en met een vals `isWinnaar` als het toevallig op 6 uitkwam).

**Gefixt**, identiek in `lib/controle-engine.ts` én `functions/src/lib/controle-engine.ts` (architectuurregel 5): oude matches tellen alleen nog mee als ze nog daadwerkelijk op het huidige ticket voorkomen (`vorigeMatches.filter(n => ticketSet.has(n))`). Nagerekend, niet aangenomen: met deze fix is vrij wisselen sowieso nooit meer exploitbaar, omdat elke week alleen tegen de getallen van díe specifieke trekking wordt gecheckt en historische resultaten nooit met terugwerkende kracht veranderen.

### De regel zelf — een sportiviteitskeuze, geen technische noodzaak (meer)

Na de fix was een sluitingsvenster dus niet meer technisch nódig, maar wel gewenst: wijzigen mag alleen in de **eerste week van een speelreeks** (vanaf een winnaar tot de eerstvolgende trekking), sluit **vrijdag 24:00**, en staat daarna vast voor de rest van de hele speelreeks tot de volgende winnaar. Geldt alleen voor het wijzigen van een bestaand ticket — een eerste ticket aanmaken blijft altijd mogelijk.

**Implementatie in twee helften**, omdat de volledige check data nodig heeft die niet overal voorhanden is:
- Dag-check (puur): `magTicketWijzigenOpDezeDag()` in `lib/constants.ts`
- Reeks-check (vereist trekking-/resultaatdata): bepaald in `app/profiel/page.tsx` zelf, dezelfde grenslogica in principe als de bestaande `heeftHuidigeSpeelreeksAlTrekkingen()` (Cloud Function, wachtrij), hier client-side afgeleid uit data die de pagina toch al ophaalt
- `TicketEditorModal.tsx` blijft zelf datavrij: neemt een kant-en-klare `kanWijzigen`-boolean aan als prop, blokkeert dan opslaan + toont een lock-melding — nooit van toepassing op een nieuw ticket

Ook toegevoegd: een uitleg-blok in de spelregels op `/startinfo`, en een statusregeltje op `/profiel` zelf dat al vóór het openen van de editor laat zien of wijzigen nu wel of niet kan.

---

## 20-22 september 2026 — Prijsbedrag bij winst (drie losse bugs), wachtrij-gat, week-scoping-bug, plakken bij trekking invoeren

Aanleiding: de eerste échte winnaar van de club (Ing, trekking 2026-W38) kreeg géén bedrag te zien — nergens in de app stond hoeveel hij had gewonnen. Uitzoeken hiervan legde uiteindelijk **vier losse, onafhankelijke problemen** bloot, elk in een aparte sessie/ronde gevonden en gefixt. Vaste regel vanaf nu: bij elke update README + changelog + een apart beheerder-only interne-werking-document + Startinfo bijwerken.

### 1. Plakken bij trekking invoeren

Klein, direct verzoek: de winnende getallen van de officiële uitslagpagina kopiëren en in één keer plakken i.p.v. los overtypen. `app/trekkingen/page.tsx` kreeg een `onPaste`-handler op elk bal-invoerveld: bij 2+ herkende getallen in de plaktekst wordt het hele formulier (6 nummers + bonusbal) in één keer gevuld, gesplitst op scheidingstekens (spatie/komma) — werkt ongeacht of een getal 1 of 2 cijfers heeft, want de splitsing gebeurt op scheiding, niet op karakterpositie.

### 2. Prijsbedrag bij winst — root cause: drie plekken gebruikten het verkeerde bedrag

**Root cause**: `WinnaarScherm` (dashboard), de winst-pushmelding (Cloud Function), én de "Huidige pot"-weergave op Kas/Financieel gebruikten alle drie `berekenKasSaldo()` — het **totale, cumulatieve kassaldo** (incl. al bevestigde stortingen voor toekomstige weken). Er bestond al een apart correcte functie, `berekenActuelePrijzenpot()` (speelreeks-gebonden, met uitgebreide code-commentaar die precies dit onderscheid uitlegt), maar die werd nergens gebruikt op het moment dat er ook daadwerkelijk gewonnen werd.

**Fix — bedrag vastleggen i.p.v. steeds opnieuw live berekenen**: nieuw veld `prijsBedrag` op `Resultaat` (optioneel — `lib/controle-engine.ts` blijft bewust ongewijzigd, vult dit veld niet, het wordt pas ná de controle-engine toegevoegd bij het wegschrijven). Server-side variant `berekenPrijzenpotServerSide()` toegevoegd in `functions/src/index.ts` (admin-SDK, kan geen client-code importeren), aangeroepen in `onTrekkingVerwerkt` vóór de resultaten-batch — zodat de winnaars van déze trekking zelf nog niet meetellen bij het bepalen van de speelreeks-grens. Zelfde logica ook toegevoegd aan `herberekenSpeelreeks`.

**Bij meerdere winnaars wordt de pot gedeeld** — `prijsBedrag = prijzenpot / aantal winnaars`, niet de volle pot voor iedereen (bevestigd door de beheerder tijdens overleg, matcht ook wat `/startinfo` al beloofde aan leden: "wordt de pot gelijk verdeeld").

**Zichtbaarheid**: `WinnaarScherm`, de trekking-detailpagina (permanent, ook na het sluiten van het confetti-scherm) en de dashboard-winnaarskaart tonen nu `resultaat.prijsBedrag` i.p.v. het kassaldo.

**Backfill voor Ing** (er bestond al een winnaar vóórdat dit veld bestond): nieuwe beheerder-only Cloud Function `vulHistorischPrijsBedragIn` (optioneel `forceer: true` om ook al-ingevulde bedragen opnieuw te berekenen — nodig na latere correcties) en `bekijkPrijzenpotDetails` (alleen-lezen, toont per betaling wat er precies is meegeteld — gebouwd nadat handmatig door het auditlog scrollen niet ver genoeg terugging).

### 3. Het "dubbele-markering"-incident — root cause van een €4-afwijking

Ing's eerste berekende bedrag (€180) klopte niet met de handmatige telling (€176). Root cause, gevonden via `bekijkPrijzenpotDetails`: week 2026-W27 had zowel "Dick Veerman Beheerder" als "Dick Veerman Speler" als bevestigde betaling staan — een eerdere kas-correctie ("foutieve dubbele markering 23 juli") had toen alleen het **kassaldo** gecorrigeerd, niet de onderliggende `betalingen`-registratie zelf. Correcties via een vrije kasmutatie raken dus nooit de betaalstatus-administratie — dat is een structureel gegeven van het systeem (zie architectuurregel 12), geen eenmalige fout.

Hersteld: de foutieve W27-betaling alsnog via de bestaande "Corrigeer"-knop op status gezet, daarna `vulHistorischPrijsBedragIn` met `forceer: true` opnieuw gedraaid → €176, bevestigd correct met `bekijkPrijzenpotDetails`.

### 4. Wachtrij-gat — gevonden tijdens overleg, geen live incident

Bij het doorpraten over "heractiveren" bleek: `verwijderLid`/`heractiveerLid` raken alleen `actief`, nooit `wachtOpNieuweSpeelreeks` of `tickets`. De `deelnemers`-bepaling in zowel `onTrekkingVerwerkt` als `herberekenSpeelreeks` checkte dat vlaggetje nergens expliciet — het werkte tot nu toe alleen omdat een wachtend lid toevallig altijd een lege tickets-lijst had. Een heractiveerd lid met een bewaard, niet-leeg ticket zou dat toevalligheid kunnen omzeilen. **Beide plekken kregen alsnog een expliciete check** — geen live bug geweest, wel een structureel gat.

### 5. Het Kees-incident — root cause: kalenderweek-fallback, per-lid i.p.v. club-breed

Een nieuw lid (Kees Sier, geactiveerd op een zondag) stortte voor het eerst geld; de storting werd verrekend met **2026-W38** (de al-afgelopen, gewonnen week) in plaats van **2026-W39** (de lopende). Root cause, in twee lagen:
1. `relevanteTrekkingWeek()` valt bij een lid **zonder enige eigen betaalhistorie** terug op de kale kalender-ISO-week van vandaag — en zondag hoort kalendertechnisch nog bij dezelfde week als de zaterdag ervóór, ook al is de trekking allang verwerkt en is de rest van de club administratief al bij de volgende week.
2. `verrekenLottoSaldoMetOpenstaandeWeek` riep deze functie op met **alleen dit ene lid se eigen betalingen** i.p.v. club-breed (zoals dashboard en kashouder-financieel dat via `subscribeBetalingen` altijd al deden) — voor een gloednieuw lid dus per definitie een lege lijst, en dus altijd de kalender-fallback.

**Fix**: `verrekenLottoSaldoMetOpenstaandeWeek` bepaalt de week nu club-breed (alle betalingen, niet alleen die van dit lid) — zolang er ook maar één ander lid al een betaling voor de nieuwe week heeft (vrijwel altijd het geval), wordt de kalender-fallback nooit meer geraakt. Nieuwe architectuurregel (12) hieraan gewijd.

**Herstel voor Kees**: zijn foutieve W38-betaling gecorrigeerd (via bestaande knop), maar dat corrigeert alléén de betaalstatus, niet het saldo zelf — vandaar een **nieuwe correctietool**, `herverrekenLottoSaldo()` (client, `lib/firestore-payments.ts`) + een 🔁 Verreken-knop op Financieel, die bestaand LottoSaldo verrekent met een openstaande week zónder nieuw geld te boeken (de eerder verwijderde `markeerBetaaldDoorKashouder`-route bestond hier niet meer voor). Zijn resterende saldo-tekort van €4 (het bedrag dat aan de foutieve W38-registratie "verloren" ging) is met de bestaande saldo-correctie-knop rechtgezet.

### 6. Notificaties: Test-tab verborgen voor leden

`/profiel/notificaties` toonde het Test-tabblad (diagnostiek, ruwe logs, testmeldingen) aan **iedereen** — bedoeld voor de beheerder. Nu achter `isBeheerder` (zowel de tab-knop als de tab-inhoud), consistent met het patroon dat al bestond voor het onderste stukje van diezelfde tab (de zaterdag-herinnering-trigger).

---

## 2, 7 en 15 augustus 2026 — Wachtrij voor nieuwe leden, leden definitief verwijderen, en een lange notificatie-speurtocht

Meerdere sessies, samengevoegd tot één overzicht per onderwerp. De grootste, meest tijdrovende sessie was 15 augustus: een grondig regressieonderzoek naar "notificaties werkten eerder wel" dat drie losse, onafhankelijke bugs blootlegde.

### Leden-lijst opgeschoond

Emoji-avatars (willekeurige gezichtjes) vervangen door een net initiaal-avatar. Standaardfilter op `/leden` staat nu op "Actief" in plaats van "Alle" bij het openen van de pagina.

### Leden definitief verwijderen — een tweede niveau bovenop de bestaande soft-delete

Na een testronde stonden er meerdere test-leden als "inactief" te wachten. Nieuwe, bewust destructieve functie `verwijderLidDefinitief()`: een echte `deleteDoc()` op het Firestore-profiel, alleen bereikbaar via een 🗑️-knop bij **al-inactieve** leden (nooit direct bij een actief lid — eerst ❌ soft-delete, dan pas definitief kunnen wissen, een ingebouwde extra veiligheidsstap). Raakt bewust niet het Firebase Auth-account (geen serverrechten vanaf de client) — dat blijft onschadelijk bestaan; een latere uitnodiging op hetzelfde adres maakt gewoon een vers profiel aan.

### Wachtrij voor nieuwe leden

**Aanleiding**: nieuwe leden zouden pas mogen meedoen zodra de huidige, al-lopende speelreeks eindigt — instappen halverwege zou oneerlijk zijn tegenover spelers die al cumulatief nummers hebben verzameld.

**Ontwerp, na overleg**: geen aparte "bevries geld"-functie nodig — zolang een lid simpelweg buiten de wekelijkse deelnamecyclus wordt gehouden, blijft hun gestorte saldo vanzelf onaangeroerd. Nieuw veld `wachtOpNieuweSpeelreeks` op `User`, gezet door een nieuwe helper `heeftHuidigeSpeelreeksAlTrekkingen()` in de Cloud Function (checkt of er al minstens 1 trekking is geweest sinds de laatste winnaar, of sinds het begin als er nog nooit een winnaar was). `onBetalingenAanmaken` slaat wachtende leden over; `onTrekkingVerwerkt` geeft ze bij een winnaar in dezelfde stap vrij én stuurt een pushmelding. Dashboard toont een duidelijke banner; de laatste onboarding-stap toont een aangepaste bevestiging (geen pushmelding op dat moment — er bestaat op dat vroege punt nog geen FCM-token).

**Getest met een geïsoleerde, mock-Firestore logica-test** (9 scenario's: verse club, lopend seizoen zonder winnaar, net een winnaar gehad, tweede reeks alweer onderweg, meerdere winnaars ooit met de juiste — laatste — als referentie, en de vrijgave-/skip-logica zelf) — allemaal geslaagd zonder op een echte winnaar te hoeven wachten.

**Het Neeltje-incident**: een écht nieuw lid (geen testaccount) kreeg ondanks de wachtrij-vlag toch €4 afgeschreven bij een storting. Bleek: `verrekenLottoSaldoMetOpenstaandeWeek` (aangeroepen bij elke storting) checkte de vlag niet — alleen `onBetalingenAanmaken` deed dat. Twee plekken die hetzelfde principe moesten afdwingen, en de tweede werd bij het bouwen vergeten. Handmatig gecorrigeerd (saldo terug, betaling ongedaan via de bestaande correctietools — geen kascorrectie nodig, de storting zelf klopte) en de ontbrekende check alsnog toegevoegd.

### Tikkie laatst gecontroleerd

Kort, functioneel verzoek: een manier om te zien tot welk moment de kashouder Tikkie al had gecontroleerd. In plaats van een handmatige "ik heb gecheckt"-knop (die vergeten kan worden, of zonder echt te checken ingedrukt kan worden) — een storting registreren is zelf al het bewijs dat er is gekeken. Regel op Financieel, puur afgeleid uit de meest recente `'inleg'`-kasmutatie, geen nieuwe knop of veld nodig.

### Zaterdag-saldo-herinnering

Nieuwe, persoonlijke melding elke zaterdag 12:00 — 6 uur vóór de 18:00-stortingsdeadline, zodat wie te weinig saldo heeft nog op tijd kan bijstorten. Alleen naar spelende (niet-wachtende) leden. Gebruikt dezelfde `sendToTokens`-infrastructuur als de rest.

### De notificatie-speurtocht — drie losse bugs, na elkaar ontdekt

Dit werd de langste sessie van het project tot nu toe. Aanleiding: een geplande melding kwam niet aan, ondanks dat eerdere meldingen (zoals de zaterdag-19:30-trekkingsherinnering) eerder wél hadden gewerkt. Op expliciet verzoek: **geen nieuw systeem bouwen, uitzoeken waarom het bestaande stopte.**

**Voorbereiding — twee losse test-hulpmiddelen gebouwd, vóór de eigenlijke oorzaak gevonden was:**
- Een testmelding-knop (`stuurTestNotificatie`) die dezelfde verstuurfunctie gebruikt als echte meldingen — zodat elke fix direct, zonder op een geplande tijd te wachten, te verifiëren was
- Toen deze knop een cryptische "internal"-fout gaf: de Cloud Function aangepast zodat de **echte** foutmelding (die Firebase normaal om beveiligingsredenen verbergt) rechtstreeks in de app te zien is, in plaats van via een omweg naar Cloud Logging

**Bug 1 — dode tokens werden nooit echt verwijderd.** Cloud Logging toonde: de functie draaide foutloos, probeerde te versturen, maar alle geprobeerde tokens waren ongeldig. In de code bleek `sendToTokens()` alleen te *loggen* dat ongeldige tokens "worden opgeschoond" — een daadwerkelijke `deleteDoc()`-aanroep ontbrak volledig. Elke PWA-herinstallatie of cache-wis liet een nieuw, dood token achter zonder ooit het oude op te ruimen. Gefixt: echte verwijdering toegevoegd, `sendToTokens` kreeg een verplichte `userId`-parameter (nodig om te weten uit welke subcollectie te verwijderen) — bijgewerkt op alle 9 aanroepplekken in het bestand.

**Bug 2 — het token werd nooit automatisch ververst.** Na de eerste fix bleek het probleem terug te komen zodra er even niet was ingelogd. Oorzaak: de notificatie-toggle op Profiel (`notifActief`) begon **altijd** op `false` bij elke page-load — het token werd dus alleen ververst op het exacte moment dat iemand de toggle handmatig omzette, wat in de praktijk zelden opnieuw gebeurde. Gefixt met een structurele wijziging in `lib/auth-context.tsx`: een nieuwe `useEffect` ververst het token voortaan automatisch bij elke ingelogde sessie, gebaseerd op de echte browsertoestemming (niet op React-state) — werkt nu voor de hele app, ongeacht welke pagina iemand bezoekt.

**Bug 3 — twee service workers streden om de controle (de uiteindelijke hoofdoorzaak).** Zelfs na beide voorgaande fixes bleef het patroon: server meldt succes, er komt niets aan, en het zojuist-gebruikte token blijkt bij een volgende poging alweer verdwenen (door de inmiddels-werkende opschoning uit bug 1, die het steeds als "ongeldig" wegschoonde). Systematisch alle overige schakels uitgesloten — VAPID-sleutel (klopte, vergeleken met Firebase Console), iOS-notificatie-instellingen (allemaal correct aan), en zelfs het berichtformaat zelf: een aparte testfunctie gebouwd die bewust wél een top-level `notification`-veld meestuurde (in plaats van de gebruikelijke data-only aanpak) — als dát wél zou aankomen, zou de service worker-code de schuldige zijn; kwam het ook niet aan, dan zat het dieper. **Kwam ook niet aan.** Dat wees uiteindelijk naar de service worker-registratie zelf: Firebase Messaging draaide in een **apart** bestand (`public/firebase-messaging-sw.js`) naast de Serwist PWA-caching-worker, die zelf `skipWaiting: true` + `clientsClaim: true` gebruikt om altijd de nieuwste cache-versie te forceren. Twee actieve service workers op hetzelfde origin kunnen elkaar als "controller" verdringen — de caching-worker nam bij elke page-load de controle over, waardoor er niemand meer was om een binnenkomende melding daadwerkelijk te tonen, ook al kwam die er echt aan.

**Fix, volgens Firebase's eigen aanbeveling voor precies dit scenario**: alles samengevoegd in **één** service worker. Firebase Messaging zit nu ín `app/sw.ts`, via de moderne `firebase/messaging/sw`-module-API (in plaats van de oudere `importScripts()`-compat-variant die niet in een module-gebaseerde worker past). `lib/firebase-messaging.ts` registreert niet langer een eigen, tweede worker — wacht simpelweg op de al-actieve, samengevoegde worker. Het oude, aparte bestand is leeggemaakt met een duidelijke uitleg, met het verzoek het handmatig uit de repo te verwijderen (niet iets wat via een geleverde zip zelf kan gebeuren).

**Bevestigd, met een geslaagde testmelding**: deze fix bleek inderdaad de hoofdoorzaak. Getest via de nieuwe, samengevoegde `/profiel/notificaties`-pagina (zie hieronder) — een testmelding kwam na deze wijziging daadwerkelijk aan. Hiermee zijn alle drie de bugs in de meldingsketen (dode tokens, kapotte auto-verversing, service worker-conflict) bevestigd opgelost, niet alleen "zou moeten werken".

### Notificaties, alles bij elkaar: nieuwe pagina `/profiel/notificaties`

Los verzoek, na de hele speurtocht: alle notificatie-gerelateerde functionaliteit (instellingen, per-categorie voorkeuren, en de verspreide testschermen) samenvoegen tot één plek, met een apart tabblad voor test-functionaliteit. Nieuw client-kant `NotificationSettings`-type (bestond al server-kant, nu ook toegevoegd aan `lib/types.ts` en — dit keer zorgvuldig, met een geautomatiseerd script dat per bestand de exacte, bestaande inspringing overnam — aan alle drie de handmatige veldmappingen tegelijk). Twee tabbladen: **Instellingen** (hoofdschakelaar + 5 losse categorieën: trekkingsuitslagen, betaling bevestigd, herinneringen, winnaars, ranglijst-updates) en **Test** (diagnostiek, testmelding — voor iedereen, test alleen het eigen account — en de handmatige zaterdag-herinnering-trigger, beheerder-only binnen die tab want die stuurt naar alle spelende leden tegelijk). De oude, losse `/debug-fcm`-pagina en de toggle op `/profiel` zijn beide vervangen door een verwijzing naar deze ene, nieuwe plek.

### Voorwaarden & Privacy-pagina — met een tweede AI-mening als kwaliteitscheck

Eerst een eigen concept opgesteld (op basis van aangeleverde, generieke juridische bouwstenen over de Kansspelwet en AVG), daarna bewust **niet zelf als definitief beschouwd** — voorgelegd aan GPT voor een tweede beoordeling, met de expliciete instructie dat Claude eindverantwoordelijk blijft voor wat er daadwerkelijk in de app komt, niet zomaar overneemt. GPT's herziene versie bleek beter: rustiger, menselijker, en zonder een eigen juridische conclusie te trekken die er niet hoort ("wij zijn vergunningvrij" is een inschatting, geen feit dat in eigen voorwaarden thuishoort — de Kansspelautoriteit maakt wel onderscheid voor besloten-kring-kansspelen, maar de precieze toepassing op deze specifieke club moet niet worden afgeleid uit een generieke tekst).

Vóór het bouwen nog één feitelijke discrepantie gesignaleerd en gecorrigeerd: het allereerste concept ging uit van "exact 50 deelnemers", terwijl de club op dat moment 5-6 leden had — de definitieve versie noemt bewust geen vast aantal meer, om niet meteen achterhaald te zijn tijdens het groeipad richting 50.

Bij het bouwen twee dingen bewust **dynamisch** gemaakt, niet hardgecodeerd zoals in het geleverde concept: het bedrag van de standaard inleg (leest live uit `/verenigingConfig/main`) en de namen van de huidige beheerder(s)/kashouder(s) in de voettekst (leest live uit de ledenlijst) — zodat de pagina niet stilzwijgend verouderd raakt als een van die twee ooit wijzigt.

### Geplande notificaties — beheerder kan nu zelf meldingen inplannen

**Aanleiding**: tot dan toe stond elke geplande melding (zoals de zaterdag-12:00-saldo-herinnering) hardgecodeerd in de Cloud Function — een nieuwe herinnering betekende altijd een nieuwe deploy. Verzoek: dit zelf, vanuit de app, kunnen beheren, inclusief een tijdschema.

**Ontwerptraject, met GPT als sparringpartner**: eerst een uitgebreide briefing samengesteld met de volledige bestaande architectuur (het net-gefixte notificatiesysteem, de "nooit orderBy"-regel, de bestaande `sendToTokens`/`getFcmTokens`-infrastructuur, de conventie van Nederlandse veldnamen) zodat een tweede AI-mening niet blind zou adviseren. GPT's antwoord bevestigde de basisarchitectuur en voegde één concrete verbetering toe: in plaats van dubbele-verzending alleen te voorkomen met een tijdstempel-check (kwetsbaar bij twee bijna-gelijktijdige uitvoeringen van de achtergrondfunctie), een **atomaire "claim" per periode** — het aanmaken van een uniek Firestore-document (`notificatieVerzendingen/{notificatieId}_{periode}`) via `create()`, dat vanzelf faalt als een andere run dit al claimde. Dat is een sterkere garantie dan een handmatige transactie, en precies het soort stille productiebug dat dit project al vaker heeft geraakt (FCM-tokens, dubbele kasmutaties).

**Architectuur, definitief vastgesteld**: één vaste, generieke achtergrondfunctie (`verwerkGeplandeNotificaties`, elke 5 minuten) checkt een Firestore-collectie (`geplandeNotificaties`) op wat er nu verstuurd moet worden — geen aparte scheduler per melding (kan Cloud Functions technisch ook niet, schema's liggen vast bij deploy-tijd). Drie vaste doelgroepen (alle leden / spelende leden / beheerder+kashouder, bewust geen losse ledenselectie — "onnodig complex voor nu"), eenmalig of wekelijks, en een beheerder kan nooit de eigen "Herinneringen"-voorkeur van een lid overrulen (de nieuwe functie roept gewoon `getFcmTokens(userId, 'herinneringen')` aan, exact als alle andere herinneringen).

**Vóór het bouwen expliciet getest, niet alleen beweerd te werken**: de twee meest kritieke stukjes logica (het berekenen van "is dit wekelijkse moment deze week al geweest", en de atomaire claim-bescherming) geïsoleerd getest met 9 losse scenario's — inclusief het scenario waar het echt mis zou kunnen gaan (twee "gelijktijdige" claimpogingen op dezelfde melding, exacte periode). Pas ná 9/9 geslaagd, en een schone volledige TypeScript-compile met de exacte projectconfiguratie, is de code daadwerkelijk aangeleverd.

Nieuwe tab **"🔔 Notificaties"** op Beheer → Admin (naast Instellingen, Spel, Prijzen, Seizoen, Audit log): aanmaken, bewerken, pauzeren/activeren, verwijderen, en een handmatige testknop om een nieuwe melding direct te proberen zonder op de eerstvolgende 5-minuten-tik van de achtergrondfunctie te hoeven wachten.

---

## 26-27 juli 2026 — Navigatie, weekberekening, en het complete ledenuitnodigingensysteem


Twee losse dagen, in elkaar overlopend. Begon met navigatie- en weergaveverbeteringen, groeide uit tot de grootste architecturale wijziging van het project: open registratie is vervangen door een volwaardig, server-side gevalideerd uitnodigingensysteem, inclusief onboarding en ledenbeheer.

### Navigatie-consolidatie (beheerder)

**Aanleiding**: beheerder gaf aan overal gemakkelijk bij te willen kunnen, zoals het hoort, en dat kas-werkzaamheden nu vaak een rolwissel vereisten. Onderzoek wees uit: `/trekkingen` en `/ranglijst` hadden **helemaal geen** rol-afhankelijke navigatie (altijd de lid-versie, ook voor een ingelogde beheerder) — bij bezoek verloor een beheerder daar al zijn andere tabs. Daarnaast had de beheerder-navigatie geen vaste link naar `/kashouder/financieel` (waar storten/corrigeren staat) — alleen als sneltoets op het eigen startscherm, nergens anders.

**Gefixt**: rol-afhankelijke navigatie op alle 9 relevante pagina's, "Financieel" toegevoegd als vast item, "Profiel" verplaatst naar een klikbare avatar rechtsboven (bespaart een navigatie-slot), terugknoppen overal waar ze nog ontbraken. Bijvangst: `/leden` bleek zelf ook geen rolcheck te hebben — een kashouder die daar "Dashboard" aantikte, kwam bij het beheerder-dashboard terecht in plaats van het eigen kashouder-dashboard.

**Eén bouwfout onderweg**: bij het toevoegen van de terugknop aan `/trekkingen` kwamen `NAV`/`dashboardHref` per ongeluk in de verkeerde van twee componenten in hetzelfde bestand terecht (de invoer-modal in plaats van de hoofdpagina) — TypeScript ving dit bij de build (`Cannot find name 'dashboardHref'`), in één bestand hersteld.

### Prijzenpot vs. kassaldo — beheerder kreeg dezelfde kaart als leden

Beheerder die zelf speelt (Dick Veerman Speler) miste de "Te winnen deze speelreeks"-kaart, die alleen op het lid-dashboard stond. Toegevoegd aan `/beheerder`, maar **alleen zichtbaar als het ingelogde account zelf een ticket heeft** — het andere beheerder-account (dat bewust niet speelt) ziet 'm terecht niet. Sneltoetsen-sectie op het beheerder-dashboard vervolgens grotendeels verwijderd (5 van de 6 knoppen waren letterlijk dubbelop met de nu-permanente navigatie-tabs); de enige unieke actie ("Mijn inleg betalen") verhuisde naar een knop binnen de prijzenpot-kaart zelf.

### Weekberekening — drie rondes, telkens een laag dieper

Dit werd de langste, meest iteratieve fix van de twee dagen.

**Ronde 1**: op zaterdagavond, ná de trekking maar vóór maandag, toonden `/betalen` en het dashboard nog de allang-afgelopen week (bijv. "week 30, 25 juli") in plaats van de al-actieve nieuwe week (W31) — terwijl de automatische afschrijving daarvoor allang had plaatsgevonden. Oorzaak: `huidigTrekkingWeek()` berekent puur de kalenderweek van vandaag, wat op zaterdagavond nog steeds de oude week is. Eerste fix: `relevanteTrekkingWeek()` — neemt de hoogste `trekkingWeek` die daadwerkelijk in iemands betalingen voorkomt, niet de kalenderdatum.

**Ronde 2**: bleek breder te spelen dan alleen `/betalen` — óók dashboard, kashouder-dashboard (bepaalt de Openstaand-lijst!) en beheerder-dashboard gebruikten dezelfde, kapotte berekening. `relevanteTrekkingWeek()` verplaatst naar de gedeelde `lib/firestore-payments.ts` en overal consistent toegepast.

**Ronde 3**: "Trekking betaald"-label op zowel `/betalen` als het dashboard toonde de bevestigings**datum** (wanneer de transactie werd verwerkt) in plaats van de trekkings**datum** (waarvoor die geldt) — bij een automatische afschrijving vlak na een trekking staan die twee vaak dicht bij elkaar, maar niet altijd. Nieuwe gedeelde functie `weekStringNaarDatum()` (ISO-weekstring → leesbare Nederlandse datum, berekend vanuit de weekstring zelf, niet vanuit "vandaag") lost dit consistent op beide plekken op.

**Bijvangst**: prijzenpot-kaart en het "weken speelplezier"-label telden niet correct als de huidige week al was afgeschreven — "Bijna op" in plaats van "Deze trekking + nog X weken extra". Gecorrigeerd op zowel `/betalen` als dashboard.

### Het ledenuitnodigingensysteem — kern van de sessie

**Aanleiding**: gebruiker vroeg of nieuwe leden bij het opstarten informatie kregen (welkomstscherm, regels, installatie-instructie). Bij het uitzoeken bleek een veel fundamenteler gat: **de app had geen enkele toegangscontrole**. Elke bezoeker kon zichzelf via Google, e-mail/wachtwoord, of magic-link gewoon lid maken — alle drie maakten automatisch een `'lid'`-profiel aan bij een eerste succesvolle login.

**Overlegtraject, drie versies**: eerste voorstel was een volledig multi-tenant, multi-club platform-herontwerp (clubId op elke collectie, "club aanmaken"-flow, Owner-rol) — afgewezen als overengineering voor een productie-app met echt geld en precies één club; het risico van een gemiste `clubId`-filter (een datalek tussen clubs) paste niet bij de manier van werken (rechtstreeks naar productie, geen staging). Tweede versie: uitsluitend een uitnodigingensysteem voor de huidige club, geen multi-tenant. Derde versie (definitief): dezelfde scope, met concrete technische keuzes vastgelegd na overleg — zie hieronder.

**Vastgelegde architectuur:**
- Uitnodigingslink (`/uitnodiging/[token]`) bewaart het token, toont dan pas de gewone inlogopties (Google/e-mail/magic-link) — de uitnodiging bepaalt **of** iemand mag, nooit **hoe** ze inloggen
- Validatie + profiel aanmaken gebeurt **server-side**, in een Cloud Function (`verzilverUitnodiging`), in één Firestore-transactie — voorkomt dubbel gebruik, ook bij een race condition
- Geen e-mail/telefoon-koppeling aan een uitnodiging (bewust uitgesteld, MVP eerst)
- Geen "Account aanmaken"-knop meer op de gewone inlogpagina
- `/geen-toegang`: nette melding voor wie wél technisch inlogt maar geen geldig profiel heeft — Firebase Auth-account blijft gewoon bestaan

**Gebouwd**: `lib/firestore-invites.ts` (token genereren met `crypto.getRandomValues`, geen verwarrende tekens in het alfabet), Cloud Function `verzilverUitnodiging` (transactie: token bestaat/nog geldig/nog niet gebruikt/gebruiker heeft nog geen profiel → user-document aanmaken + invite markeren als gebruikt + auditlog), `app/uitnodiging/[token]/page.tsx`, `/leden` uitgebreid met een "➕ Nieuw lid uitnodigen"-knop + kant-en-klare WhatsApp-deelknop, `firestore.rules` uitgebreid met een bewust **publiek leesbare** `/invites`-regel (nodig zodat de uitnodigingspagina de geldigheid kan checken vóórdat iemand is ingelogd — de catch-all-regel zou dat anders geblokkeerd hebben).

**`registerWithEmail`, Google-login, en magic-link** in `lib/auth-context.tsx` maken sindsdien **nooit** meer automatisch een profiel aan — dat gebeurt uitsluitend via de Cloud Function. `ensureUserDoc()` (de oude, automatische aanmaak-functie) volledig verwijderd.

### Twee race conditions, gevonden via herhaald, stap-voor-stap testen

Geen van beide was zichtbaar in de code zelf — beide kwamen pas aan het licht door de uitnodigingsflow letterlijk meerdere keren, in exact dezelfde volgorde, te doorlopen en het resultaat elke keer te vergelijken.

**Bug 1 — bestaande leden soms per ongeluk "Geen toegang".** `profileLoading` was een eigen `useState`, apart bijgewerkt in een losse `useEffect` die op `user` reageerde. Vlak na inloggen kon er daardoor kort een render bestaan met een NIEUWE `user` maar nog de OUDE `profileLoading`-waarde (`false`, van vóór het inloggen) — `ProtectedRoute` concludeerde dan heel even ten onrechte "geen profiel, dus geen toegang". Gebeurde niet elke keer (vandaar: eerste keer niet, tweede keer wel — een klassiek race-condition-symptoom), maar trof zowel nieuwe als **bestaande** leden. Fix: `profileLoading` is geen eigen state meer, maar een **afgeleide waarde** (`!!user && profileFetchedForUid !== user.uid`), herberekend bij elke render — kan niet meer uit sync raken, want er is geen aparte state meer die dat zou kunnen.

**Bug 2 — nieuwe registraties belandden soms op "Geen toegang", ook in gewone Safari (dus geen browserkwestie).** Subtielere variant: Firestore's `onSnapshot` vuurt **direct** één keer, óók voor een nog-niet-bestaand document — dat gebeurt bij een gloednieuw account, ruim vóórdat de Cloud Function het profiel daadwerkelijk heeft aangemaakt. De code interpreteerde dat eerste, lege signaal als "klaar met laden" en zette `profileFetchedForUid` alvast op de nieuwe uid — terwijl het echte profiel er nog niet was. Navigeerde de uitnodigingspagina op dat moment al door naar `/welkom` (want de Cloud Function had intussen wél al succes gemeld), dan kwam die daar te vroeg aan. Fix: de uitnodigingspagina navigeert niet meer direct na een succesvolle server-respons, maar wacht via een aparte `useEffect` tot het eigen, lokale `profile`-object ook daadwerkelijk niet-null is — pas dan is de client zelf echt bij.

**Bug 3 — onboarding werd voor ieder nieuw lid overgeslagen.** Na het oplossen van de twee race conditions bleek de 5-stappen-introductie helemaal niet te verschijnen — direct door naar het dashboard. Oorzaak: het nieuwe `onboardingCompleted`-veld stond wél correct in de Cloud Function en dus in Firestore, maar was **vergeten in drie separate, handmatige veldmappingen** (`lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`) — exact hetzelfde, al meermaals eerder geconstateerde patroon in dit project (zie architectuurregel 6). `profile.onboardingCompleted` was daardoor voor iedereen altijd `undefined`, wat de "onboarding nodig?"-check (`=== false`) altijd naar "nee" liet uitvallen.

**Alle drie bevestigd gefixt via een volledige, 6-stappen testronde**: bestaande leden loggen normaal in, open registratie is dicht, uitnodiging aanmaken + WhatsApp-delen werkt, verzilveren toont de onboarding en komt daarna pas op het dashboard, een token werkt maar één keer, en de onboarding verschijnt na een herhaalde login nooit meer.

### Onboarding + Startinfo & Speluitleg

**5-stappen-introductie** (`/welkom`): Welkom, Spelregels (cumulatief, correct beschreven — zie hieronder), Betalen (actuele, storting-only flow), Belangrijkste schermen, App op het beginscherm zetten (iPhone + Android apart uitgelegd, met de reden: pushmeldingen werken alleen zo). Verschijnt precies één keer, via `onboardingCompleted`, zonder migratie voor bestaande leden nodig — een ontbrekend veld wordt overal expliciet als `true` behandeld (architectuurregel 7, hetzelfde principe als eerder bij `actief`).

**`/spelregels` en `/help` samengevoegd tot `/startinfo`.** Bij het samenvoegen bleek dat de twee oude, losse pagina's elkaar al een tijd tegenspraken: `/spelregels` beschreef nog de allang-vervangen **niet-cumulatieve** matching ("alle 6 in één trekking"), en `/help` had nog complete instructies voor "Account aanmaken" en "betaling melden in de app" — beide sinds eerdere wijzigingen niet meer bestaand. De oude routes blijven bestaan als simpele redirects, zodat bestaande bladwijzers/links blijven werken.

### Leden verwijderen/heractiveren

**Ontwerpconflict ontdekt tijdens het bouwen, ter plekke opgelost**: het oorspronkelijke plan zei "terugkeren kan alleen via een nieuwe uitnodiging" — maar aangezien een verwijderd lid zijn profiel behoudt (bewuste keuze: historische data blijft), zou een nieuwe uitnodiging bij hetzelfde account altijd worden geweigerd door `verzilverUitnodiging` (die expliciet weigert als er al een profiel bestaat, om te voorkomen dat een bestaand lid zijn eigen profiel per ongeluk reset). Opgelost door in plaats daarvan een directe **"Heractiveren"**-knop te bouwen — functioneel gelijkwaardig (alleen beheerder, gecontroleerd, gelogd), zonder de tegenstrijdigheid.

**Gebouwd**: `verwijderLid`/`heractiveerLid` in `lib/firestore-users.ts` (soft-delete via `actief: false`/`true`, nooit data verwijderen), ❌-knop op `/leden` (beheerder-only, niet bij het eigen account — voorkomt een lock-out, consistent met de bestaande "minimaal 1 beheerder"-bescherming), `ProtectedRoute` en de root-inlogpagina uitgebreid zodat een inactief profiel exact hetzelfde wordt behandeld als "geen profiel" — directe toegangsintrekking, geen aparte code-paden.

### Storting-verrekening — dezelfde weekberekening-les, nu in de Cloud-logica

Bij het narekenen van alle plekken die `huidigTrekkingWeek()` gebruikten, bleef één plek nog open staan: `verrekenLottoSaldoMetOpenstaandeWeek` (de functie die bij elke storting automatisch checkt of een openstaande week gedekt kan worden). Zelfde risico als de eerdere weekberekening-bugs: op zaterdagavond zou een storting voor een lid dat de zojuist-afgelopen week nog niet had betaald, verrekend worden met die oude week in plaats van de nieuwe. Gefixt met dezelfde `relevanteTrekkingWeek()`, ditmaal gebaseerd op de betaalhistorie van dat ene, specifieke lid (vereist een aparte, kleine Firestore-query — dit is de enige plek die niet al een kant-en-klare lijst van betalingen voorhanden had).

---

## 25 juli 2026 — Eén betaalsysteem, opruiming, audit


Vervolgsessie op 23-24 juli. Kern van de dag: de twee parallelle betaalroutes (LottoSaldo-storting vs. een "gewone" wekelijkse betaling) die telkens tot dubbeltellingen leidden, zijn samengevoegd tot één route. Daarna een grondige opruiming van alles wat daardoor overbodig werd, en een audit die nog één echte bug aan het licht bracht.

### Voorgeschiedenis: nog meer dubbeltellings-incidenten vóór de consolidatie

Voortbordurend op de Dick/Wim-incidenten van 23-24 juli, deed zich ook een geval voor bij **Ing**: een storting gemeld met een verkeerd bedrag (€10 in plaats van €12) door een UI-probleem — het vrije "ander bedrag"-invoerveld kon stilletjes overschreven worden door een eerder aangetikte preset-knop, afhankelijk van de volgorde van interactie. Gefixt door het vrije veld altijd voorrang te geven zodra het niet leeg is, plus een prominente "Je stort €X"-bevestigingsregel vlak boven de verzendknop als laatste check.

Ook ontdekt: **`stortLottoSaldo` (de kashouder-directe stortroute) verrekende nooit automatisch met een openstaande week** — alleen de andere route (lid meldt zelf, kashouder bevestigt) deed dat. Daardoor kon een storting geregistreerd worden terwijl de al openstaande week gewoon bleef openstaan, wat een kashouder er vervolgens toe verleidde om ook nog los op "✓ Betaald" te tikken — weer een dubbele boeking (dit keer bij Wim, €12 storting + losse €4-boeking). Gefixt door ook deze route de verrekeningscheck te laten uitvoeren.

**Nog een gat, ontdekt bij Ing**: de verrekenfunctie loste alleen een *bestaand* 'open'-document op — als er voor het lid **helemaal geen** document bestond voor de week (bijv. omdat ze het aanmaakmoment hadden gemist, zelfde klasse probleem als het oudere Ellen-incident), gebeurde er niets: saldo bleef onaangeroerd, lid bleef "niet betaald" tonen. Uitgebreid met een tweede tak: geen document + wel een ticket + genoeg saldo → direct een nieuw 'betaald'-document aanmaken.

**Eén foutieve correctie, één keer te veel toegepast**: bij het rechtzetten van Wim's dubbele boeking werd zowel een kascorrectie ALS een "markeer als gecorrigeerd" op de betaling zelf toegepast — maar dat laatste was te veel: de saldo-correctie (€12→€8) representeerde al dat €4 van de storting terecht deze week dekte, dus de betaling had gewoon op 'betaald' moeten blijven staan. Enige echt onterechte correctie van de sessie, in dezelfde beweging rechtgezet en een **"↺ Herstel"-knop** gebouwd (tegenhanger van "markeer als gecorrigeerd") voor dit soort gevallen in de toekomst.

**Prijzenpot vs. kassaldo — belangrijk, niet-triviaal onderscheid ontdekt door de gebruiker.** Het dashboard toonde altijd `kasSaldo` (het totale, cumulatieve clubsaldo all-time) onder het label "Huidige pot" — maar sinds LottoSaldo-stortingen direct meetellen in de kas, ook al zijn ze nog niet "verbruikt" als wekelijkse inleg, klopte dat niet meer met "wat kun je winnen deze speelreeks". Nieuwe, aparte berekening gebouwd (`lib/firestore-prijzenpot.ts`): telt alleen bevestigde wekelijkse inleg binnen de huidige speelreeks (sinds de laatste winnaar, of vanaf het begin), sluit stortingen zelf expliciet uit, telt wél alle al-bevestigde toekomstige weken mee zodra die daadwerkelijk zijn afgehandeld — niets meer, niets minder dan wat al zeker is.

### De grote consolidatie: van twee betaalsystemen naar één

**Aanleiding, letterlijk van de gebruiker**: *"Ik moet toch altijd kijken op Tikkie"* — het bevestigingsstapje voor de kashouder voegde niets toe bovenop wat hij toch al deed, en *"de leden vergeten het toch altijd"* voor het meld-stapje aan de kant van de leden. Twee losse observaties die samen tot dezelfde conclusie leidden: schrap beide tussenstappen, laat alles verlopen via directe kashouder-registratie.

**Ontwerp, expliciet bevestigd vóór het bouwen:**
- Alles is voortaan een storting, geen apart "gewoon €4 betalen"-pad meer.
- Kashouder-verificatie (het moment waarop iemand in Tikkie kijkt) blijft nodig — dat kán de app niet vervangen, geen Tikkie-API-toegang — maar het aparte *bevestigingsstapje bovenop* die verificatie niet.
- Leden melden niet meer zelf: geen "ik heb gestort"-knop meer in de app.
- Later, apart bevestigd: ook het minimumbedrag (was: standaard inleg) mag weg — de kashouder registreert exact wat ze in Tikkie zien, een kunstmatig minimum paste daar niet bij (concreet: een test met €2 liep vast op de destijds bestaande €4-ondergrens).

**Gebouwd/verwijderd, in volgorde:**
1. `meldBetaling` en `markeerBetaaldDoorKashouder` volledig verwijderd uit `lib/firestore-payments.ts`. `meldLottoSaldoStorting` en `stortLottoSaldo` kregen allebei (tijdelijk) een minimumbedrag-validatie.
2. `app/betalen/page.tsx` volledig herschreven naar één enkele storting-flow (bedrag kiezen, Tikkie-knop, melden) — geen aparte route meer.
3. `app/kashouder/page.tsx`: "✓ Betaald" werd "💰 Storten", roept nu `stortLottoSaldo` aan met het standaardbedrag in plaats van de verwijderde functie.
4. `app/kashouder/financieel/page.tsx`: minimumbedrag-validatie + duidelijke foutmelding toegevoegd aan het bestaande stortingsformulier.
5. Verouderde teksten op `/help` en `/spelregels` bijgewerkt (geen "Ik heb betaald"-knop meer).
6. **Tweede ronde**: op expliciet verzoek ("de leden vergeten het toch altijd") is ook `meldLottoSaldoStorting` verwijderd — leden melden helemaal niets meer. `/betalen` werd daarmee een puur informatieve pagina: saldo tonen, een directe "Open Tikkie om te storten"-knop, geen vervolgstap.
7. **Derde ronde**: het minimumbedrag zelf ook geschrapt uit `stortLottoSaldo` (client én tekst) — elk positief bedrag mag nu.
8. **Vierde ronde, opruiming van wat daardoor dood werd**: `bevestigBetaling` en `wijsBetalingAf` verwijderd (niets maakte meer een `'verificatie'`-status document aan om te bevestigen/afwijzen). De "Te verifiëren betalingen"-secties op zowel Financieel als het kashouder-dashboard volledig weg, inclusief de bijbehorende tegel in het maandoverzicht. Op het kashouder-dashboard is de "Alles in orde"-conditie zorgvuldig vereenvoudigd (de oude `verificatieUserIds`-afhankelijkheid weggehaald zonder de "ontbrekend document telt ook als niet-betaald"-logica van eerder te breken).
9. WhatsApp-herinneringstekst bijgewerkt: `buildWhatsappBetaalverzoek` bleek zelf ook dode code (nergens meer aangeroepen) en is verwijderd; `buildWhatsappHerinnering` verwijst niet meer naar een meld-stap ("Meld je betaling in de app" → "Stort via Tikkie — je hoeft verder niks te melden, ik verwerk het zelf zodra ik het zie").

### Kleine UI-verbeteringen, dezelfde sessie
- **Dashboard**: nieuwe "Mijn LottoSaldo"-kaart voor leden — saldo, weken-tegoed-status, expliciete uitleg over de automatische wekelijkse afschrijving.
- **Dubbele "Storten"-knop ontdekt en weggehaald**: stond zowel in de prijzenpot-kaart als in de nieuwe LottoSaldo-kaart, beide naar dezelfde plek. Weg uit de prijzenpot-kaart, blijft alleen bij LottoSaldo staan waar het thematisch hoort.
- **"Betaling bevestigd"-scherm was blokkerend**: liet geen ruimte om ook nog te storten voor toekomstige weken zodra de huidige week al betaald was. Omgezet naar een klein, niet-blokkerend groen label bovenaan de gewone betaalpagina — saldo-kaart en storten blijven er altijd naast/onder zichtbaar.
- **Nieuwe Cloud Function `onTikkieCheckHerinnering`**: elke vrijdag 20:00 een pushmelding naar kashouder/beheerder om Tikkie te checken — compenseert dat er, sinds leden niet meer melden, geen enkel signaal meer bestaat wanneer er geld is binnengekomen.
- Restjes "minimaal €4"-tekst opgeruimd op `/betalen` (twee plekken) en `/spelregels` (die laatste ging eigenlijk over de nog steeds bestaande wekelijkse inleg van €4, niet over een storting-minimum — geherformuleerd om dat onderscheid duidelijk te maken).

### Eindaudit — op expliciet verzoek, "check alles, geen vergeten dingen"

Systematische controle na alle bovenstaande wijzigingen:

1. **Echte, functionele bug gevonden**: `firestore.rules`' `/betalingen`-`create`-regel eiste `request.resource.data.userId == request.auth.uid` — bedoeld voor "lid meldt voor zichzelf" (een pad dat inmiddels niet meer bestaat). Maar `verrekenLottoSaldoMetOpenstaandeWeek`'s "geen bestaand document"-tak (aangeroepen vanuit de kashouder-actie `stortLottoSaldo`) maakt soms een nieuw document aan **namens een ander lid** — waarbij `request.auth.uid` (kashouder) en `request.resource.data.userId` (het lid) per definitie verschillen. De regel zou dit stil hebben geblokkeerd. Precies dit scenario deed zich waarschijnlijk voor bij het Ing-incident eerder deze sessie. Gefixt: `create` staat nu ook toe als `isKashouderOfBeheerder()`, los van wiens `userId` het betreft.
2. Twee kleine, onschadelijke inconsistenties genoteerd maar bewust niet gefixt (geen risico, puur informatief voor toekomstig werk): `Betaling.isSaldoStorting` wordt nergens meer actief gezet (stortingen zijn geen los `Betaling`-document meer sinds punt 6 hierboven) — overal defensief gelezen, dus geen crash. Dashboard's `inVerificatie`-state checkt op een status die nooit meer voorkomt — toont gewoon nooit.
3. Bevestigd: geen enkele restverwijzing meer naar de vijf verwijderde functies (`meldBetaling`, `bevestigBetaling`, `wijsBetalingAf`, `meldLottoSaldoStorting`, `markeerBetaaldDoorKashouder`) ergens in de codebase. Alle Cloud Functions compileren schoon.

### Vraag-en-antwoord, voor de context
- **"Krijgen leden nog bericht bij laag saldo?"** — Ja, automatisch, maar via een gewone pushmelding (FCM), niet WhatsApp. WhatsApp-berichten gaan altijd via de kashouder zelf (handmatige "💬 Herinner"-knop) — geen WhatsApp Business API beschikbaar voor automatisch versturen, zelfde beperking als eerder bij Tikkie vastgesteld.
- Exacte pushtekst bij 2 weken tegoed: 🟡 "LottoSaldo wordt laag" / "Je hebt nog 2 weken LottoSaldo over. Denk aan bijstorten om automatisch te blijven meedoen." Bij 1 week: 🔴 "LottoSaldo bijna op" / "Je hebt nog maar 1 week LottoSaldo over. Stort bij zodat je automatisch blijft meedoen."

---

## 23 juli 2026 — LottoSaldo, Vereniging-instellingen, Firestore-rules-avontuur, opruiming

Lange sessie in meerdere delen. Samengevat per onderwerp.

### LottoSaldo — vooruitbetalen, automatisch verrekend

**Aanleiding**: handmatig wekelijks betalen is voor een klein clubje overbodig gedoe. Voorstel (van de gebruiker, na overleg over automatiseringsgraad): een lid stort één keer een bedrag, de app trekt daarna zelf elke week de inleg af.

**Ontwerpkeuzes, expliciet besproken vóór het bouwen:**
- Geen Mollie/iDEAL-automatisering — vereist een echt zakelijk Mollie-account met API-key dat er niet is (zelfde categorie beperking als eerder bij Tikkie/WhatsApp Business API vastgesteld). In plaats daarvan: dezelfde "meld → kashouder bevestigt"-flow als de rest van de app.
- **Storting = direct kasmutatie.** De kashouder ontvangt het geld namelijk direct — economisch is het vanaf dat moment al clubgeld, ook al wordt het pas later als wekelijkse inleg "verbruikt". Eerste ontwerp deed dit andersom (kasmutatie pas bij wekelijkse afboeking) — op aanwijzing gecorrigeerd.
- Betaalpagina: LottoSaldo als **primaire, prominente flow**, de oude wekelijkse €4-knop als kleinere secundaire optie eronder. Eenmalige uitlegbanner ("Begrepen"), opgeslagen in Firestore (niet lokaal) zodat 'm niet opnieuw verschijnt op een ander apparaat.

**Gebouwd**: `lib/firestore-vereniging.ts`-achtig patroon voor het saldo zelf in `lib/firestore-payments.ts` (`meldLottoSaldoStorting`, `stortLottoSaldo`, `verrekenLottoSaldoMetOpenstaandeWeek`, later `corrigeerLottoSaldo`), Cloud Function `onBetalingenAanmaken` uitgebreid met de wekelijkse saldo-check, lage-saldo pushmeldingen, kas-uitsplitsing op de Financieel-pagina.

**Noot (25 juli)**: de wekelijkse €4-knop en de meld/bevestig-stap uit dit ontwerp zijn een sessie later alsnog verwijderd — zie hierboven. Dit was destijds de juiste eerste stap, maar bleek na een paar dagen live gebruik meer complexiteit te geven dan nodig.

### Twee bugs gevonden tijdens het eerste echte testen (met een echte €10-storting)

1. **`markeerBetaaldDoorKashouder` ("✓ Betaald"-knop) kende het LottoSaldo-systeem niet.** Bij een lid zonder open betaaldocument (bijv. omdat het al gedekt zou moeten zijn door saldo) maakte de knop blind een **nieuwe** betaling + kasmutatie aan — ook als er al 'betaald' stond. Concreet gebeurd: een test-tik op deze knop creëerde een spookboeking van €4 in de kas, terwijl het LottoSaldo van €10 onaangeroerd bleef. Gefixt met een striktere volgorde: al betaald deze week? weigeren → bestaand open document? bevestigen → genoeg saldo? dekken zonder kasmutatie → anders pas een nieuwe boeking. **(Deze functie zelf is 25 juli alsnog volledig verwijderd — zie hierboven.)**
2. **De bestaande, foutieve boeking moest handmatig gecorrigeerd worden** — opgelost met de al bestaande Kascorrectie-functie (−€4, nette audit-regel), en met een nieuw **saldo-correctietool** (potloodje bij elk lid op de Financieel-pagina, beheerder-only in de UI) voor dit soort gevallen in de toekomst.

### Vereniging-instellingen — van decoratie naar functie

Beheer → Instellingen toonde al maanden drie regels ("Naam vereniging", "Standaard inleg", "Kashouder") die **niets deden** — letterlijk hardcoded tekst zonder `onClick`. Nu:
- Nieuwe `/verenigingConfig/main`-collectie, `lib/firestore-vereniging.ts`
- Naam en inleg echt bewerkbaar
- Kashouder automatisch afgeleid uit de rol-toewijzing op de Leden-pagina
- **Standaard inleg overal doorgevoerd** — dit raakte uiteindelijk 12 bestanden: elke client-pagina die het bedrag toonde, `lib/firestore-payments.ts`, en een hardcoded `INLEG = 4` in de Cloud Function die nooit synchroon liep met de client-constante

### Het Firestore-rules-avontuur

Wat begon als "voeg een regel toe voor de nieuwe collectie" werd een langere speurtocht:

1. Eerste poging: nieuwe rule toegevoegd aan de `firestore.rules` **in de repo**, zonder te beseffen dat de repo-versie **niet overeenkwam met wat er echt in Firebase actief stond** (fcmTokens, notificationSettings, en een aantal andere regels stonden er wél live, maar niet in de repo — kennelijk ooit los via de Console gewijzigd).
2. Gebruiker plakte de daadwerkelijke, live regels — bleek significant uitgebreider. Regels samengevoegd: alles uit de live versie behouden, alleen de kashouder-lottoSaldo-uitzondering en `verenigingConfig` toegevoegd.
3. **Nieuwe architectuurregel als gevolg**: vertrouw niet blind op `firestore.rules` in de repo voor de werkelijke staat — Firestore rules kunnen driften van code, in tegenstelling tot alle andere bestanden in dit project.
4. Automatische deploy gebouwd (`.github/workflows/deploy-firestore-rules.yml`) om toekomstige drift te voorkomen. Twee losse levering-problemen onderweg (niet code-gerelateerd): CodeSync/Working Copy kreeg de nieuwe verborgen map `.github/workflows/` niet succesvol gesynchroniseerd (opgelost door het bestand rechtstreeks via github.com aan te maken), en een eigen fout in de zip-commando's (`-x ".*"` sloot per ongeluk de hele `.github`-map uit — geleerd: wees specifiek met excludepatronen, niet breed).
5. Eerste deploy-run faalde met `403` op `firebaserules.googleapis.com` — de service-account miste de IAM-rol **Firebase Rules Admin** (`roles/firebaserules.admin`), los van de rollen die al voor Cloud Functions-deploys bestonden. Rol toegevoegd via Google Cloud Console (IAM & Admin → service-account → Manage access), daarna geslaagd.

### Opruiming
- Ongebruikte `rondes`-collectie en bijbehorende code volledig verwijderd (`Ronde`-interface, `subscribeRondes`, `maakRonde`, de Firestore-rule) — nooit afgemaakt, nergens gebruikt, bevatte zelf een `orderBy()`-bug.
- WhatsApp-herinneringstekst uitgebreid met een tip over LottoSaldo. **(Deze tip is 25 juli alsnag herschreven — zie hierboven, samen met het verwijderen van de bijbehorende meld-stap.)**
- `tikkieLink`/`trekkingWeek`/`isSaldoStorting` formeel toegevoegd aan de TypeScript-types (stonden er eerder nooit echt in, werden steeds met type-assertions omheen gewerkt).

### Terugkerend patroon deze sessie: handmatige Firestore-veldmappings
Alweer een paar keer een bug veroorzaakt: een nieuw veld op `User` (`lottoSaldo`, `lottoSaldoIntroSeen`) toegevoegd aan het type, maar vergeten in de **handmatige** field-by-field mapping in `lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`. Dit keer proactief in alle drie tegelijk gefixt in plaats van er telkens achteraf achter te komen — maar het blijft een terugkerend risico bij elk nieuw veld.

---

## 12 juli 2026 — PWA, cumulatieve clubmodus, navigatie- en datacorrecties

Grote, meerdaagse sessie. Samengevat per onderwerp:

### PWA / offline caching
- `next-pwa` overwogen, verworpen (niet onderhouden, geen goede App Router-ondersteuning)
- Serwist geïmplementeerd, eerst via `@serwist/next` (webpack) — bleek incompatibel met Next.js 16's Turbopack-productiebuilds
- Overgestapt op `@serwist/turbopack` — werkende oplossing, service worker via `app/serwist/[path]/route.ts`
- Offline fallback-pagina (`/offline`) toegevoegd
- `NetworkOnly`-guard voor `/api/`-routes (defensief, voorkomt ooit stale betaalstatus tonen)

### Navigatie-fixes
- `app/kas/page.tsx`, `app/profiel/page.tsx`, `app/kashouder/financieel/page.tsx` hadden allemaal een **hardcoded** bottom nav + terugknop (altijd Lid- of Kashouder-versie), waardoor een beheerder op die pagina's zijn eigen "Beheer"-tab kwijtraakte. Alle drie omgezet naar rol-afhankelijke navigatie.
- `app/dashboard/page.tsx`: betaalvoortgang-teller ("Deelnemers") telde leden die *ooit* een week hadden betaald, niet alleen de huidige week. Gefixt met dezelfde weekfilter die `app/kashouder/page.tsx` al gebruikte.
- Naamgeving "Kasboek" → consistent "Kas" op alle plekken.
- Spelregels/Deelnemers hadden geen ingang in de UI — toegevoegd aan Profiel → Informatie.
- "FCM Diagnostiek"-link op Profiel was zichtbaar voor alle rollen — nu alleen Beheerder.

### Cumulatieve "clubmodus" — kern van deze sessie
Grondige herbouw van de spellogica. Voorheen berekende `controle-engine.ts` per trekking een onafhankelijke score (zoals een echte loterij). De werkelijke clubregel is anders: goede nummers stapelen zich op binnen een speelreeks totdat iemand alle 6 heeft verzameld.

**Nieuw datamodel**: `Resultaat.matchedNumbers` (cumulatief) naast het bestaande `nummersGoed` (nu: alleen nieuw die trekking). `aantalGoed` = `matchedNumbers.length`.

**Beslissing**: geen aparte `Ronde`-databasestructuur bouwen/repareren (die bestond al half, ongebruikt, met een eigen `orderBy()`-bug). In plaats daarvan wordt de speelreeks-grens *afgeleid* uit de trekkingsgeschiedenis: alles ná de laatste trekking met een winnaar. (Deze halve `Ronde`-structuur is op 23 juli alsnog volledig opgeruimd.)

**Beslissing**: geen eenmalig migratiescript. In plaats daarvan de herbruikbare `herberekenSpeelreeks` Cloud Function (callable, alleen beheerder) — knop in Beheer → Prijzen.

**Beslissing**: `PrijsConfig` (meerdere spelmodi) volledig geschrapt. LottoClub is geen generieke loterij-app maar een clubje met precies één vaste spelregel. Minder code, minder bugs, simpeler beheer.

### Bugs gevonden en gefixt tijdens het testen
Stuk voor stuk ontdekt door de nieuwe functionaliteit daadwerkelijk tegen productiedata te draaien, niet in theorie:

1. **Build-fout**: `functions/tsconfig.json` heeft `noUnusedLocals: true`. Een reeds langer ongebruikte functie (`getAllFcmTokens`) blokkeerde de Cloud Functions-deploy al vóór deze sessie — niemand had het gemerkt omdat de deploy-workflow alleen bij wijzigingen in `functions/` draait. Verwijderd.
2. **`matchedNumbers` ontbrak in client-mapping**: `lib/firestore-trekkingen.ts` → `subscribeResultaten` mapt Firestore-velden handmatig; het nieuwe veld was vergeten. Zonder fix zou de server het wél opslaan maar de app het nooit zien.
3. **Overgeslagen weken verloren cumulatieve voortgang**: `getVorigeMatchesPerTicket` keek alleen naar de laatste trekking van de speelreeks. Sloeg een lid een week over (niet betaald), dan verloor die zijn eerder verzamelde nummers bij de eerstvolgende deelname. Gefixt: nu wordt over alle trekkingen van de speelreeks gelopen, met het meest recente resultaat per ticket.
4. **Verdwaald testresultaat blokkeerde speelreeks-detectie**: een handmatig aangemaakt resultaat met `isWinnaar: true` (2/6 goed — onmogelijk onder de echte regels) zorgde ervoor dat de speelreeks-grens verkeerd werd gedetecteerd. Document verwijderd via Firestore Console.
5. **`herberekenSpeelreeks` filterde niet op betaalstatus**: nam iedereen met een ticket mee, ook niet-betalers. Gefixt met dezelfde `getBetalersVoorWeek`-check die de live trigger al gebruikte.
6. **`ranglijstPunten`-drift**: de eerste versie van de puntencorrectie in `herberekenSpeelreeks` gebruikte een optel/aftrek-delta die bij herhaald herberekenen kon afwijken van de werkelijke som (geconstateerd: 40 punten getoond, 20 correct). Vervangen door een harde herberekening als exacte som van alle `punten`-velden — zelfherstellend, ongeacht hoe vaak de knop wordt gebruikt.
7. **`subscribeRanglijst` gebruikte `orderBy()`** gecombineerd met `where()` — schending van architectuurregel 1. Werkte toevallig (index bestond al) maar fragiel. Sortering nu in JS.
8. **Ranglijst/Hall of Fame gebruikten cumulatief `aantalGoed`** voor "gemiddelde score" en "hoogste score" — sinds die cumulatief is, gaf dat geen zinnige per-trekking-statistiek meer. Omgezet naar `nummersGoed.length` (nieuwe matches per trekking). Hall of Fame-categorie "Hoogste score ooit" hernoemd naar "Meeste nummers in één trekking"; nieuwe categorie "Snelste winnaar" toegevoegd (minste trekkingen tot 6/6 — kon pas bestaan sinds de cumulatieve regel).
9. **Beheerder-dashboard "Vereist aandacht" signaleerde niets** ondanks een lid dat niet had betaald. Oorzaak: Ellen Veerman had voor die week helemaal geen betaaldocument (zie bekende beperking in README, `onBetalingenAanmaken` slaat leden zonder ticket over). De alert-logica keek alleen naar bestaande `'open'`-documenten, niet naar ontbrekende. Gefixt met dezelfde "vergelijk tegen betaald-lijst"-aanpak als de kashouder-pagina.

### UI-toevoegingen (product van de cumulatieve regel)
- Blauw balletje = geraakt binnen de speelreeks (`matchedNumbers`), blauw + goud randje = nieuw deze trekking (`nummersGoed`) — op dashboard én trekking-detail
- "Nog X nodig"-indicator per deelnemer op de trekking-detailpagina
- Waarschuwingsbalk op de betaalpagina (vóór en ná de deadline) dat niet-betalen de cumulatieve matching overslaat
- Pushmelding voor niet-betalers uitgebreid met expliciete uitleg
- Niet-betaald-balk op de trekking-detailpagina, toont wie er die specifieke trekking niet meetelde

### Werkwijze-afspraak
Claude kan bestanden voortaan rechtstreeks ophalen uit `stuctech-eng/LottoApp` (publieke repo, branch `main`) via `curl` naar `raw.githubusercontent.com`, zonder dat bestanden geplakt hoeven te worden. Alleen gecommitte + gepushte wijzigingen zijn zichtbaar; geen live-verbinding, elke fetch is een snapshot.

---

## 7 juli 2026 en eerder

Zie de oudere versie van README.md in de git-geschiedenis voor de status vóór deze sessie (PWA offline caching, navigatie-audit, betaalcyclus-automatisering, `alle_goed_wint`-prijsmodus als toenmalige standaardinstelling).
