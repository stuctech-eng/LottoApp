# Interne werking — alleen voor de beheerder

Dit document is **niet** voor leden. Het legt uit hoe geld, betalingen en
correcties écht inwendig werken — vooral wat elke correctieknop wél en
NIET aanraakt. Bedoeld om te lezen vóórdat je een correctieknop indrukt
bij iets dat niet vanzelfsprekend is, en om een incident achteraf te
kunnen reconstrueren.

Zie `README.md` voor de technische architectuur en `docs/changelog.md`
voor de volledige geschiedenis van elke bug die hieronder genoemd wordt.

---

## De twee systemen die geld bijhouden — en waarom ze niet automatisch synchroon lopen

LottoClub houdt geld op **twee, losse plekken** bij:

1. **`kasmutaties`** — de kas: hoeveel geld zit er in totaal, wat is er binnengekomen, wat is er uitbetaald. Dit is de "boekhouding" in de klassieke zin.
2. **`betalingen`** — per lid, per week: heeft deze persoon voor déze specifieke week betaald, en telt hij dus mee voor die trekking. Dit bepaalt wie meespeelt, niet hoeveel geld er is.

**Dit zijn twee aparte collecties in de database, en niets update ze automatisch tegelijk.** Een storting (`stortLottoSaldo`) raakt beide (kasmutatie + eventueel een betaling-status). Maar een **kas-correctie** (`registreerCorrectie`, de vrije correctie-optie op Financieel) raakt **alléén** de kas — nooit een betaling. Dat is precies wat er misging bij het "dubbele-markering"-incident (23 juli): een correctie loste het kassaldo op, maar de onderliggende, foutieve `betaling` bleef gewoon op `'betaald'` staan en telde dus stilletjes door in latere berekeningen (o.a. de prijzenpot). **Onthoud dit als vuistregel: als je een fout corrigeert, vraag jezelf af of die fout ALLEEN de kas raakte, of ook een specifieke betaling — en corrigeer dan expliciet allebei, apart.**

---

## Elke correctie-/beheerknop, precies wat hij doet

### Financieel → 💰 Storten (bij een lid in de "Openstaand"-lijst)
Registreert een **nieuwe** storting — alsof je zelf in Tikkie hebt gezien dat er geld is binnengekomen.
- **Raakt aan**: `lottoSaldo` (+bedrag), een nieuwe kasmutatie (+bedrag, "Vooruitbetaling LottoSaldo"), en automatisch de eerstvolgende openstaande week (verrekend uit het nieuwe saldo).
- **Gebruik dit NOOIT** als iemand al genoeg saldo heeft liggen — dat boekt geld dat niet echt is binnengekomen. Gebruik dan 🔁 Verreken.

### Financieel → 🔁 Verreken (nieuw, 22 september 2026)
Verrekent **bestaand** LottoSaldo met een openstaande week — zonder nieuw geld te boeken.
- **Raakt aan**: alleen `lottoSaldo` (-bedrag) en de betaling-status van de openstaande week (naar `'betaald'`). **Geen nieuwe kasmutatie** — het geld stond er al.
- Verschijnt alleen als een lid al genoeg saldo heeft (≥ standaardinleg).
- **Gebruik dit** na een correctie waarbij iemands saldo intact bleef maar de verrekening naar de verkeerde week ging (precies het Kees-incident).

### Financieel → LottoSaldo → potloodje (✎) → saldo corrigeren
Zet `lottoSaldo` direct naar een door jou ingevoerd bedrag.
- **Raakt aan**: alléén het cijfer `lottoSaldo` op het profiel. **Geen kasmutatie, geen betaling-status.**
- **Gebruik dit** om een saldo-tekort of -overschot recht te zetten dat ontstaan is door een eerdere, foutieve verrekening — bijv. nadat je een foutieve betaling hebt gecorrigeerd (zie hieronder) maar het bijbehorende saldo niet vanzelf terugkwam.
- **Vergeet dit niet** na het corrigeren van een betaling die WEL uit iemands eigen saldo betaald werd — anders is dat lid per ongeluk geld kwijt dat nergens meer staat (dit was letterlijk de laatste stap in het Kees-incident).

### Financieel → een betaling → "Corrigeer" / "↺ Herstel"
Zet de status van één specifieke betaling naar `'gecorrigeerd'` (of terug).
- **Raakt aan**: alléén de betaalstatus van dat ene document. **Geen kasmutatie, geen saldo.**
- Een `'gecorrigeerd'`-betaling telt nergens meer mee: niet als deelname aan die trekking, niet in de prijzenpot-berekening.
- **Vervangt geen geld-correctie.** Als er echt geld mee gemoeid was (het lid had er zijn eigen saldo voor betaald, of de kashouder had er cash voor genoteerd), moet je dat apart rechtzetten met de saldo-correctie hierboven en/of `registreerCorrectie`/`registreerUitbetaling`.

### Financieel → Kascorrectie (`registreerCorrectie`)
Boekt een vrije, handmatige aanpassing op de kas — voor als er simpelweg een fout in het kassaldo zit die nergens anders bij hoort.
- **Raakt aan**: alléén een nieuwe kasmutatie. **Nooit een betaling, nooit een saldo.**
- Dit is precies het mechanisme dat bij het "dubbele-markering"-incident gebruikt werd om alleen de kas te repareren — waardoor de onderliggende betaling per ongeluk bleef staan. **Vraag jezelf bij elke kascorrectie af: hoort hier ook een betaling-correctie bij?**

### `/leden/[id]` → Acties (nieuw, 23 september 2026)
Dezelfde functies als hierboven, nu per lid op één pagina in plaats van los op Financieel:
- **Betaalstatus deze week** (Storten/Verreken) — verschijnt **alleen** als dit lid deze week nog niet `'betaald'` staat. Al betaald? Dan zie je gewoon "✓ Al betaald deze week — niets te doen", geen knoppen. Dit voorkwam een bug waarbij Verreken zich liet zien puur op basis van voldoende saldo, ook als er niks te verrekenen viel.
- **LottoSaldo aanvullen** — een vrij bedrag, los van de betaalstatus van deze week (dus ook bruikbaar als iemand al betaald heeft maar vooruit wil storten voor komende weken). Zelfde onderliggende functie (`stortLottoSaldo`) als de knop hierboven, alleen met een zelf ingevuld bedrag i.p.v. altijd precies de standaardinleg.
- **Saldo corrigeren, Rol wijzigen, Verwijderen/Heractiveren** — zelfde functies als altijd, nu hier gebundeld.
- **Telefoon bewerken** (Overzicht-tab) — nieuw; hiervoor kon een ontbrekend telefoonnummer wel gezien maar niet aangepast worden vanaf de adminkant.

### Financieel → Uitbetaling registreren (`registreerUitbetaling`)
Boekt geld dat de kas verlaat — bijv. een winnaar uitbetalen.
- **Raakt aan**: alléén een nieuwe (negatieve) kasmutatie, zichtbaar onder "Uitbetaald deze maand".
- **Doe dit altijd** nadat je een winnaar écht hebt uitbetaald (via Tikkie of anders) — zonder deze stap blijft de kas op papier rijker dan hij in werkelijkheid is.

### Beheer → Admin → 💰 Historisch prijsbedrag invullen
Vult `prijsBedrag` in bij winnaars van vóór dit veld bestond (of bij een nieuwe winnaar waar het om wat voor reden dan ook nog ontbreekt).
- **Raakt aan**: alléén het `prijsBedrag`-veld op de winnende `resultaten`-documenten. Slaat winnaars over die al een bedrag hebben.
- **Rekent het bedrag uit** als: de prijzenpot t/m de week van díe trekking, gedeeld door het aantal winnaars van diezelfde trekking.

### Beheer → Admin → ♻️ Alle winnaars herberekenen (na correctie)
Zelfde berekening als hierboven, maar herberekent **iedereen**, ook winnaars met een al ingevuld bedrag.
- **Gebruik dit** nadat je iets in de brondata hebt gecorrigeerd dat een eerder-vastgelegd prijsbedrag ongeldig maakt (bijv. een foutieve betaling die je alsnog corrigeerde — precies het Ing-incident).
- Vraagt een bevestiging, want dit overschrijft bestaande bedragen.

### Beheer → Admin → 🔍 Bekijk berekening laatste winnaar
**Wijzigt niets.** Toont itemized, per betaling (week + lid + bedrag), wat er precies is meegeteld in de prijzenpot-berekening van de meest recente winnende trekking.
- **Gebruik dit** als een prijsbedrag onverwacht is — dit is de manier om zelf de rare eend te vinden, zonder eindeloos door het auditlog te hoeven scrollen.

### Beheer → Admin → Herbereken huidige speelreeks
Verwijdert en herberekent alle resultaten van de **huidige, nog lopende** speelreeks vanaf de eerste trekking.
- **Raakt niet aan**: al-afgesloten speelreeksen (met een eerdere winnaar) blijven altijd ongewijzigd.
- **Gebruik dit** bij een fout in de matching/punten-logica zelf, niet voor geld-gerelateerde correcties.

---

## Wachtrij — hoe een nieuw lid wel/niet meedoet

- Een nieuw lid krijgt `wachtOpNieuweSpeelreeks: true` als de huidige speelreeks al minstens 1 trekking heeft gehad sinds de laatste winnaar (`heeftHuidigeSpeelreeksAlTrekkingen()`).
- Zolang dat vlaggetje aanstaat: geen betaaldocument wordt ooit aangemaakt of verrekend voor dat lid (zowel de wekelijkse cyclus als een handmatige storting slaan het over).
- Bij een winnaar (`onTrekkingVerwerkt`) worden **alle** wachtende leden in dezelfde stap vrijgegeven.
- **Heractiveren (na een soft-delete) raakt dit vlaggetje NIET aan** — het blijft staan zoals het was vóór de verwijdering. Een lid dat al vrij was vóór verwijdering, is dat ook meteen weer ná heractiveren. Een lid dat nog wachtte vóór verwijdering, wacht na heractiveren nog steeds — én kan, sinds 22 september, ook niet meer per ongeluk meedoen via een oud, bewaard ticket (zie architectuurregel-achtige toelichting in README, sectie "Wachtrij").

---

## Ticket wijzigen — het sluitingsvenster (22 september 2026)

- Een lid mag zijn ticketnummers alleen wijzigen in de **eerste week van een speelreeks** (vanaf een winnaar tot de eerstvolgende trekking), en dat sluit al op **vrijdag 24:00** — dus eerder dan de storten-deadline (zaterdag 18:00).
- Zodra die eerste trekking is geweest — winnaar of rollover, maakt niet uit — staat het ticket vast voor de **rest van de hele speelreeks**, ongeacht de dag, tot de volgende winnaar.
- Geldt alleen voor **wijzigen**. Een lid dat nog geen ticket heeft, kan er altijd één aanmaken, ook in het weekend of midden in een speelreeks — dat is geen wijziging en benadeelt niemand.
- **Zelfde grens-gedachte als de wachtrij hierboven** ("heeft de huidige speelreeks al een trekking gehad"), maar hier bewust client-side herleid in `app/profiel/page.tsx` uit data die de pagina toch al nodig heeft, i.p.v. een losse aanroep van de Cloud-Function-variant.
- **Los van deze regel, en los van elkaar te zien**: vóór deze regel bestond, kon een lid dat halverwege een speelreeks zijn nummers wijzigde eigenlijk al profiteren van een echte bug in de scoretelling (oude matches bleven ten onrechte meetellen). Die bug is apart gefixt in `lib/controle-engine.ts`/`functions/src/lib/controle-engine.ts` — zie README. Het sluitingsvenster hierboven is dus een bewuste spelregel, geen noodzakelijke lapmiddel voor die bug.

---

## Prijzenpot — welke week telt mee, en welke niet

- De pot = som van bevestigde (`status: 'betaald'`) betalingen, **niet** zelf een storting (`isSaldoStorting`, in de praktijk niet meer relevant — nergens meer gezet), vanaf de week ná de laatste winnende trekking.
- **Welke week een betaling telt**, wordt bepaald door `relevanteTrekkingWeek()` — dat moet **altijd club-breed** aangeroepen worden (alle betalingen van de hele club), nooit met alleen de data van één lid. Zie het Kees-incident: bij een lid zonder eigen historie viel de per-lid-variant terug op de kale kalenderweek van vandaag, wat op een zondag nog steeds "vorige week" oplevert.
- Bij het **historisch reconstrueren** van een bedrag (na de winst, met terugwerkende kracht) wordt de pot **begrensd tot en met de week van de winnende trekking zelf** — geld dat pas daarna bevestigd is, hoort bij de vólgende speelreeks.

---

## "Vereist aandacht" (beheerder-dashboard) — hoe de tegel kiest wat hij toont

Toont **nooit** een verzamellijst — altijd precies één probleem, in deze vaste volgorde (stopt bij het eerste dat van toepassing is):

1. **Trekking niet ingevoerd** — alleen ná de trekkingsavond (zaterdag vanaf 20:00, of zondag). Tegel gaat naar `/trekkingen`.
2. **Eerste lid zonder betaling deze week** — tegel gaat direct naar dát lid (`/leden/[id]`), niet naar de algemene lijst.
3. **Eerste lid zonder ticket.**
4. **Eerste lid zonder telefoonnummer.**
5. **Tikkie al >3 dagen niet gecontroleerd** — tegel gaat naar `/kashouder/financieel`, want dit is geen per-lid-actie.

**Wachtrij-leden tellen bewust niet mee** bij punt 2-4 (zij spelen deze week toch niet mee) — blijven wel gewoon zichtbaar via het wachtrij-filter op `/leden`. Los één probleem op, en de tegel herberekent zichzelf live — springt door naar het volgende, of verdwijnt als er niets meer is.

**"In verificatie" staat er bewust niet in** — die betaalstatus kan in de huidige app niet meer ontstaan (zie hierboven, "Betaling corrigeren").

---

## Wanneer moet je wát draaien — een korte beslisboom

**Een lid heeft te veel/te weinig LottoSaldo, maar de betalingen zelf kloppen** → alleen de saldo-correctie (✎).

**Een specifieke week is ten onrechte als betaald gemarkeerd** → "Corrigeer" op die betaling, dan navragen of het bijbehorende geld/saldo ook gecorrigeerd moet worden.

**Een lid heeft al genoeg saldo maar staat nog als "Openstaand"** → 🔁 Verreken, nooit 💰 Storten.

**Een lid klaagt dat hij zijn nummers niet kan wijzigen** → normaal gedrag als de speelreeks al een trekking heeft gehad, of als het weekend/na vrijdag 24:00 is. Geen correctietool voor nodig — dit is een bewuste spelregel, geen fout.

**Een prijsbedrag klopt niet** → eerst 🔍 Bekijken om de oorzaak te vinden, dan de onderliggende betaling/kasmutatie corrigeren, dan pas ♻️ Alle winnaars herberekenen.

**Een winnaar is uitbetaald** → altijd Uitbetaling registreren, ook al voelt het alsof "het geld toch al weg is" — zonder deze stap klopt de kas niet meer met de werkelijkheid.

**Een lid ontbreekt telefoonnummer** → `/leden/[id]` → Overzicht → er direct op tikken om te bewerken. Hoeft niet meer via het lid zelf te lopen.

**Je wilt meerdere weken vooruit storten voor iemand** → `/leden/[id]` → Acties → "LottoSaldo aanvullen" (vrij bedrag), niet de vaste-bedrag-knop erboven.
