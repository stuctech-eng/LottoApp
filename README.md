# LottoClub 🎱

Digitale lottovereniging app — Next.js 16, TypeScript, Firebase

## Live
🌐 https://lotto-app-eight-chi.vercel.app

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Auth + DB**: Firebase (Auth + Firestore + Cloud Functions + FCM)
- **PWA**: Serwist (`@serwist/turbopack`) — offline caching, service worker via `app/serwist/[path]/route.ts`
- **Deploy**: Vercel (app, auto-deploy via GitHub) + GitHub Actions (Cloud Functions én Firestore rules, zie `.github/workflows/`)
- **Workflow**: iPhone → Working Copy → GitHub → Vercel/Actions

Voor de volledige wijzigingsgeschiedenis: zie [`docs/changelog.md`](docs/changelog.md).

---

## Gebruikers (productie)

| Naam | Email | Rol | Speelt mee |
|---|---|---|---|
| Dick Veerman | t.e.veerman@ziggo.nl | Beheerder | ❌ Nee — backup beheerder, account heet in de app "Kashouder" (rol staat los van de weergavenaam) |
| Dick Veerman Speler | stuctech@gmail.com | Beheerder | ✅ Ja — heeft ticket |
| Wim Kraaij | — | Lid | ✅ Ja |
| Ing | — | Lid | ✅ Ja |
| Ellen Veerman | — | Lid | ✅ Ja |

Plus incidentele testaccounts (`+alias`-adressen op stuctech@gmail.com) uit de uitnodigingssysteem-test — die zijn na testen weer verwijderd of blijven als inactief lid staan, zie Ledenbeheer hieronder.

---

## Rollen

| Rol | Wat |
|---|---|
| **Beheerder** | Alles — trekkingen, kas, leden, instellingen, meespelen, leden uitnodigen/verwijderen |
| **Kashouder** | Kas beheren + meespelen + leden uitnodigen |
| **Lid** | Alleen meespelen |

Navigatie (bottom nav + terugknoppen) is overal **rol-afhankelijk**. `Naam vereniging`, `Standaard inleg` en `Kashouder` (Beheer → Instellingen) zijn echt bewerkbaar/afgeleid.

---

## Ledenbeheer & Authenticatie (nieuw, 26-27 juli 2026)

**Open registratie bestaat niet meer.** Tot 26 juli kon letterlijk iedereen die de site bezocht zichzelf lid maken (via Google, e-mail/wachtwoord, of magic-link — alle drie maakten automatisch een `'lid'`-profiel aan bij een eerste succesvolle login, zonder enige controle). Dat gat is dicht: nieuwe leden kunnen **uitsluitend** via een geldige, eenmalige uitnodiging toetreden.

### Hoe een lid wordt uitgenodigd
1. **Leden → "➕ Nieuw lid uitnodigen"** (kashouder of beheerder) → maakt een uniek token aan in `/invites/{token}`, 7 dagen geldig
2. Kant-en-klare **WhatsApp-deelknop** met vooraf ingevuld bericht en de link `.../uitnodiging/{token}`
3. Nieuw lid opent de link → `/uitnodiging/[token]/page.tsx` → kiest zelf een inlogmethode (Google, e-mail/wachtwoord, magic-link — de uitnodiging bepaalt **of** iemand mag, niet **hoe** ze inloggen)
4. **Pas ná succesvol inloggen** wordt het token gecontroleerd en het profiel aangemaakt — nooit automatisch, nooit vooraf
5. Bij succes: eenmalige **5-stappen-onboarding** (`/welkom`) vóór het echte dashboard — Welkom, Spelregels, Betalen, Schermen, Installatie
6. Token wordt direct als gebruikt gemarkeerd — een tweede poging met dezelfde link wordt geweigerd

### De Cloud Function `verzilverUitnodiging` — waarom server-side
Het valideren + verzilveren gebeurt in **één Firestore-transactie**, server-side (Admin SDK), nooit client-side: controleert bestaan/vervaldatum/al-gebruikt, maakt het `/users/{uid}`-document aan, markeert de uitnodiging als gebruikt, logt naar het auditlog. Garandeert dat een token nooit twee keer kan slagen, ook niet bij een race condition (dezelfde link twee keer snel geopend).

### Zonder geldige uitnodiging: `/geen-toegang`
Iemand die wél technisch inlogt (Firebase Auth-account bestaat) maar **geen** geldig profiel heeft — nooit een uitnodiging verzilverd, of verwijderd uit de club (zie hieronder) — komt op een aparte pagina terecht, nooit op het dashboard. `ProtectedRoute` en de root-inlogpagina checken dit allebei, apart van elkaar (zie architectuurregel 10).

### Leden verwijderen (27 juli 2026)
**Altijd een soft-delete.** Leden → ❌ naast een actief lid (beheerder-only, niet bij jezelf mogelijk — voorkomt een lock-out) → zet `actief: false`. Account en **alle** historische data (betalingen, trekkingen, resultaten, auditlog) blijven volledig bewaard. Een verwijderd lid verliest direct alle toegang (zelfde `/geen-toegang`-pad als hierboven).

**Bewuste afwijking van het oorspronkelijke ontwerp:** "terugkeren kan alleen via een nieuwe uitnodiging" bleek technisch onmogelijk — `verzilverUitnodiging` weigert altijd als er al een profiel bestaat voor die uid (bewust, voorkomt overschrijven van bestaande leden). Terugkeren gaat daarom via een directe **"Heractiveren"**-knop bij het inactieve lid, beheerder-only, zonder nieuwe uitnodigingscyclus.

### Startinfo & Speluitleg — één bron, geen dubbele documentatie
`/spelregels` en `/help` zijn beide simpele redirects geworden naar **`/startinfo`** — de enige, officiële informatiepagina (8 tabs: Welkom, Spelregels, Betalen, Schermen, Installatie, Rollen, FAQ, Contact). Ontstaan nadat bleek dat de twee oude, losse pagina's elkaar tegenspraken (één beschreef nog de allang-vervangen niet-cumulatieve spelregel, de ander had nog complete instructies voor "Account aanmaken" die niet meer bestaat).

---

## Spelregel (definitief — vaste, enige spelmodus)

**"6 goed is winnaar" — cumulatief per speelreeks.**

LottoClub gebruikt één vaste spelmodus. Er is bewust géén ondersteuning voor andere modi — de `PrijsConfig`-infrastructuur is verwijderd.

1. **Betaling = deelname** — alleen bevestigde betaling voor die specifieke week telt mee.
2. **1 ticket per persoon.**
3. **Cumulatieve matching**: elk nummer dat een speler goed heeft, wordt permanent bijgeschreven binnen de huidige speelreeks.
4. **Winnen bij 6 unieke goede nummers**, cumulatief over eventueel meerdere trekkingen.
5. **Meerdere winnaars mogelijk.**
6. **Geen winnaar → rollover.**
7. **Na winnaar(s) → nieuwe speelreeks**, automatisch — grens wordt afgeleid uit de trekkingsgeschiedenis, geen aparte datastructuur.
8. **Ranglijstpunten** gebaseerd op alleen de nieuwe matches die trekking, niet het cumulatieve totaal.
9. **Storten mag alleen maandag t/m zaterdag 18:00** — technisch afgedwongen in `app/betalen/page.tsx`.

### Voorbeeld
```
Ticket:        6 - 12 - 18 - 23 - 31 - 44
Trekking 1:     6 -  8 - 19 - 27 - 33 - 41  →  1 nieuw   → totaal 1/6
Trekking 2:    12 - 16 - 22 - 35 - 39 - 44  →  2 nieuw   → totaal 3/6
Trekking 3:    18 - 23 - 31 - 40 - 42 - 45  →  3 nieuw   → totaal 6/6 → WINNAAR
```

---

## Betalen — één enkele route (herzien 25 juli 2026)

**Alles is een storting.** Er bestaat geen apart "gewoon wekelijks betalen"-pad meer naast het LottoSaldo — dat kunstmatige onderscheid was precies de bron van meerdere dubbeltellings-bugs. Nu geldt voor élk bedrag, groot of klein, exact dezelfde route.

### Hoe het werkt
1. **Lid stort** een bedrag naar keuze via Tikkie (**geen minimum** — ook €2 mag). Leden melden dit **niet** meer zelf in de app; dat werd structureel vergeten.
2. **Kashouder checkt zelf Tikkie** en registreert het gezien bedrag direct: Financieel → Storting registreren, of de "💰 Storten"-knop op het kashouder-dashboard (voor de standaard inleg). Beide roepen dezelfde functie aan: `stortLottoSaldo`.
3. `stortLottoSaldo` verhoogt `lottoSaldo` van het lid, maakt **direct een kasmutatie** aan (het geld is vanaf ontvangst al clubgeld), en checkt meteen (`verrekenLottoSaldoMetOpenstaandeWeek`) of er een openstaande week is die hiermee al gedekt kan worden.
4. **Elke week, bij het aanmaken van nieuwe betalingen** (`onBetalingenAanmaken`, Cloud Function): genoeg saldo? → automatisch afgeschreven, week direct op 'betaald', **geen nieuwe kasmutatie** (dat geld zat al in de kas sinds de storting).
5. **Pushmeldingen bij laag saldo** — automatisch, naar het lid zelf, via FCM (niet WhatsApp): 🟡 bij nog 2 weken tegoed, 🔴 bij nog 1 week.
6. **Vrijdagavond 20:00**: kashouder/beheerder krijgt zelf een pushmelding om Tikkie te checken (`onTikkieCheckHerinnering`) — compenseert het ontbreken van een meld-signaal vanuit leden.

### `verrekenLottoSaldoMetOpenstaandeWeek` gebruikt de échte, relevante week (27 juli 2026)
Gebruikte tot 27 juli `huidigTrekkingWeek()` — pure kalenderdatum. Op zaterdagavond, tussen de trekking en maandag, kon een storting daardoor verrekend worden met de **allang-afgelopen** week in plaats van de nieuwe, eerstvolgende — het lid bleef dan ten onrechte "niet betaald" tonen ondanks een verse storting. Gefixt met `relevanteTrekkingWeek()` (dezelfde functie die dit soort probleem al eerder oploste op dashboard/kashouder/beheerder-schermen), nu gebaseerd op de eigen betaalhistorie van dat specifieke lid.

### Wat er niet meer bestaat, en waarom
| Verwijderd | Reden |
|---|---|
| `meldBetaling`, `meldLottoSaldoStorting` (lid meldt zelf) | Leden vergaten het structureel — de knop werd simpelweg niet gebruikt |
| `bevestigBetaling`, `wijsBetalingAf` (verificatie bevestigen/afwijzen) | Overbodig zodra er niets meer bestaat dat een `'verificatie'`-status document aanmaakt |
| `markeerBetaaldDoorKashouder` ("✓ Betaald"-knop met eigen 4-stappenlogica) | Viel samen met `stortLottoSaldo` — twee routes die elkaar niet kenden was precies de bron van de dubbeltellings-bugs |
| Minimumbedrag bij storten (was: standaard inleg) | Kashouder registreert exact wat ze in Tikkie zien — een kunstmatig minimum paste niet bij die realiteit |
| "Te verifiëren betalingen"-secties (Financieel + kashouder-dashboard) | Dode UI sinds er niets meer bestaat dat zo'n document aanmaakt |
| Open registratie (`registerWithEmail`'s automatische profiel, Google/magic-link auto-profiel) | Vervangen door het uitnodigingensysteem — zie hierboven |

### Belangrijkste boekhoudregel
> Een storting telt **direct** mee in de kas. De wekelijkse afboeking daarna raakt **nooit** de kas opnieuw aan — alleen het `lottoSaldo`-veld. Andersom een kasmutatie aanmaken bij zowel storting als afboeking zou het bedrag dubbel tellen.

De Financieel-pagina toont een expliciete **kas-uitsplitsing**: Totale kas → min Gereserveerd als LottoSaldo → Vrij beschikbaar.

### Correctietools (Beheerder)
- **Financieel → LottoSaldo → potloodje (✎)** naast een lid → saldo direct naar een specifiek bedrag zetten, **geen kasmutatie** (puur boekhoudkundige correctie).
- **Financieel → Betaling corrigeren** → een reeds bevestigde betaling achteraf als `'gecorrigeerd'` markeren (document blijft zichtbaar in de geschiedenis, telt nergens meer mee als betaald) — met een **"↺ Herstel"**-knop om dit ongedaan te maken. **Let op**: dit corrigeert alleen de betaalstatus, nooit het geld — gebruik daarvoor altijd de Kascorrectie ernaast. De twee tools door elkaar gebruiken voor hetzelfde incident leidt tot een inconsistente staat (saldo zegt "gedekt", betaalstatus zegt "niet betaald").

### Dashboard (lid)
Eigen "Mijn LottoSaldo"-kaart, met vier statussen (geen saldo / te weinig voor deze week / bijna op / genoeg) en een expliciete regel: *"Bij elke nieuwe speelweek wordt hier automatisch €X van afgeschreven — geen actie nodig zolang er saldo is."* Losstaand van de "Betaalstatus"-kaart (toont specifiek of déze week al is afgehandeld) — bewust twee aparte kaarten, want saldo en betaalstatus kunnen tijdelijk uit elkaar lopen.

Het "Betaling bevestigd"-scherm op `/betalen` is **niet langer blokkerend** — een klein groen label bovenaan toont de status, maar de saldo-kaart en de Tikkie-storten-knop blijven altijd bereikbaar eronder (je kunt dus tegelijk zien dat je betaald hebt én meteen bijstorten).

### Prijzenpot ≠ kassaldo
Dashboard toont "🏆 Te winnen deze speelreeks" (`berekenActuelePrijzenpot()` in `lib/firestore-prijzenpot.ts`) — telt alleen bevestigde wekelijkse inleg binnen de huidige speelreeks, sluit LottoSaldo-stortingen zelf expliciet uit (nog niet-verbruikt geld telt niet als prijzengeld). Dat is iets anders dan het kassaldo (all-time, cumulatief), wat apart en kleiner wordt getoond eronder.

---

## Vereniging-instellingen

Beheer → Instellingen → "Vereniging": **Naam vereniging** en **Standaard inleg** zijn echt bewerkbaar. Opgeslagen in `/verenigingConfig/main`, met `lib/firestore-vereniging.ts` als toegangslaag (`subscribeVerenigingConfig` voor componenten, `haalVerenigingConfigOp` voor eenmalige lezingen in actiefuncties).

**Standaard inleg is overal dynamisch** — betaalpagina, kashouder-dashboard, financieel, profiel, dashboard-knop, startinfo, én de Cloud Function (`getStandaardInleg`).

**Kashouder** wordt automatisch afgeleid uit de rol-toewijzing op de Leden-pagina — geen aparte instelling.

---

## Betaalcyclus (grotendeels automatisch)

```
Maandag: nieuwe ISO-week begint
Ma t/m za 18:00: LottoSaldo dekt automatisch (indien toereikend), anders: lid stort via Tikkie, kashouder registreert
Vrijdag 09:00: automatische push naar leden die deze week nog open staan
Vrijdag 20:00: automatische push naar kashouder/beheerder — "Tikkie checken"
Zaterdag 18:00: storten geblokkeerd
Zaterdag 19:30: beheerder krijgt push "uitslag invoeren"
Zaterdag avond: trekking verwerkt → resultaten, push
→ Nieuwe week aangemaakt: LottoSaldo-check per lid, anders 'open' betaling
Zondag: geblokkeerd tot maandag
```

⚠️ **Bekende beperking**: `onBetalingenAanmaken` maakt alleen een betaaldocument aan voor leden die op dat moment al ≥1 ticket hebben. Beheerder-dashboard signaleert dit correct, maar er is nog geen automatische backfill.

---

## KRITIEKE ARCHITECTUURREGELS

### 1. Geen orderBy in Firestore queries
**NOOIT `orderBy()` gebruiken.** Vereist een composite index; zonder index: stille lege array. Trof al `betalingen`, `resultaten` (ranglijst), en de verwijderde `rondes`-collectie.

```javascript
// ❌ FOUT
const q = query(collection(db, 'betalingen'), orderBy('aangemaakt', 'desc'));
// ✅ CORRECT — sorteer client-side
const q = query(collection(db, 'betalingen'));
betalingen.sort((a, b) => (b.aangemaakt?.toMillis() ?? 0) - (a.aangemaakt?.toMillis() ?? 0));
```
Meerdere `==`-filters op verschillende velden zijn wél veilig zonder composite index — maar **let op combinaties met `in`**: kán ook een composite index vereisen. Bij twijfel: twee losse simpele queries en de resultaten samenvoegen in JS.

### 2. ISO-8601 weekberekening — en het verschil tussen "kalenderweek" en "relevante week"
Maandag t/m zondag. `huidigTrekkingWeek()` (client) en `getTrekkingWeek()` (Cloud Function) berekenen de **kalenderweek van nu** — dat is NIET altijd hetzelfde als de week die relevant is voor weergave/verrekening. Op zaterdagavond, ná de trekking maar vóór maandag, is de kalenderweek nog steeds de zojuist-afgelopen week, terwijl de nieuwe, eerstvolgende week al volop actief is (automatische afschrijving is al geweest). **Gebruik voor weergave en verrekening altijd `relevanteTrekkingWeek(betalingen)`** — bepaalt de relevante week op basis van de hoogste `trekkingWeek` die daadwerkelijk in de data voorkomt, niet op basis van de kalender. Toegepast op: dashboard, kashouder-dashboard, beheerder-dashboard, betaalpagina, én (sinds 27 juli) `verrekenLottoSaldoMetOpenstaandeWeek`.

### 3. Data-only FCM payload
Nooit top-level `notification` veld.

### 4. kasSaldo nooit opslaan
Altijd `berekenKasSaldo(kasmutaties)`.

### 5. Controle-engine identiek
`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` altijd byte-voor-byte identiek. Pure functie — geen Firestore, geen React.

### 6. Cumulatieve matching + handmatige veldmappings
- `nummersGoed` = nieuw deze trekking · `matchedNumbers` = cumulatief · `aantalGoed` = `matchedNumbers.length` · `punten` op basis van `nummersGoed.length`, nooit cumulatief.
- **Handmatige Firestore-veldmappings zijn dé terugkerende bronfout van dit project** — inmiddels meerdere keren misgegaan: `matchedNumbers`, `lottoSaldo`, `lottoSaldoIntroSeen`, en op 27 juli opnieuw `onboardingCompleted` (vergeten in `lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts` tegelijk — met als concreet gevolg dat de onboarding voor elk nieuw lid werd overgeslagen, ontdekt via een testronde). **Check bij elk nieuw veld op `User`/`Resultaat`, zonder uitzondering, alle plekken waar dat type handmatig gemapt wordt**: `lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`, `lib/firestore-trekkingen.ts`.

### 7. Herberekenen in plaats van migratiescripts
`herberekenSpeelreeks` (Beheer → Prijzen): herberekent alleen de huidige speelreeks, `ranglijstPunten` altijd hard herberekend als som (nooit delta), filtert correct op betalers per specifieke week. Zelfde principe toegepast op `onboardingCompleted`: geen migratie voor bestaande leden, een ontbrekend veld wordt overal expliciet als `true` behandeld.

### 8. Geen alternatieve spelmodi
`PrijsConfig` bewust volledig verwijderd.

### 9. Firestore rules: repo en productie kunnen driften — controleer altijd de live regels
De `firestore.rules` in de repo kan afwijken van wat er daadwerkelijk in Firebase actief staat. Sinds 23 juli deployt `.github/workflows/deploy-firestore-rules.yml` de repo-versie automatisch bij elke push die `firestore.rules` raakt. De service-account heeft hiervoor de IAM-rol **Firebase Rules Admin** (`roles/firebaserules.admin`) nodig.

**Regels moeten kloppen met wíe de schrijfactie daadwerkelijk uitvoert, niet alleen wíe de data betreft.** Zie het `/betalingen`-create-incident van 25 juli. `/invites/{token}` moet bewust **publiek leesbaar** zijn (`allow read: if true`) — iemand die een uitnodigingslink opent is per definitie nog niet ingelogd op het moment dat de pagina de geldigheid checkt; anders zou de catch-all regel (`allow read: if ingelogd()`) dat blokkeren.

### 10. React state die uit sync kan raken met een andere state — gebruik afgeleide waarden (nieuw, 26 juli 2026)
**De duurste les van deze sessie.** `profileLoading` was oorspronkelijk een eigen `useState`, apart bijgewerkt in een `useEffect` die op `user` reageerde. Gevolg: vlak na inloggen kon er kort een render bestaan met een NIEUWE `user` maar nog de OUDE `profileLoading`-waarde (`false`) — `ProtectedRoute` concludeerde dan ten onrechte "geen profiel, dus geen toegang", willekeurig, afhankelijk van timing. Ontdekt via herhaald, stap-voor-stap testen (niet in de code zelf zichtbaar).

**Fix**: `profileLoading` is nu een **afgeleide waarde**, geen eigen state — `!!user && profileFetchedForUid !== user.uid`, herberekend bij elke render. Kan niet meer uit sync raken, want er is geen aparte state meer die dat zou kunnen.

**Een tweede, subtielere variant van hetzelfde probleem**: Firestore's `onSnapshot` vuurt **direct** één keer, ook voor een nog-niet-bestaand document (met `exists: false`) — dat gebeurt bij een gloednieuw account, ruim vóórdat de Cloud Function het profiel daadwerkelijk heeft aangemaakt. Code die dat eerste, lege signaal interpreteert als "klaar met laden" trekt een verkeerde conclusie. Fix in `app/uitnodiging/[token]/page.tsx`: navigeer nooit direct na een succesvolle server-respons — wacht tot het eigen, lokale `profile`-object ook daadwerkelijk is bijgewerkt, pas dan is de client zelf bij.

**Vuistregel**: als twee stukjes state (bijv. `user` en `profile`/`profileLoading`) een oorzakelijk verband hebben maar in aparte `useEffect`s worden bijgewerkt, kan er altijd een render bestaan waarin ze niet bij elkaar horen. Bereken de afhankelijke waarde waar mogelijk als derived state in plaats van als eigen `useState`.

---

## Firestore Structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, notificationSettings,
  lottoSaldo, lottoSaldoIntroSeen, onboardingCompleted

/invites/{token}
  token, aangemaaktDoor, aangemaaktDoorNaam, aangemaaktOp, vervalOp,
  gebruikt, gebruiktOp, gebruiktDoorUid, gebruiktDoorNaam

/verenigingConfig/main
  naam, standaardInleg

/spelConfig/default
  naam, aantalGetallen, minGetal, maxGetal, bonusBal

/paymentConfig/main
  activeProvider, providers, tikkieLink, tikkieLinkBijgewerkt

/seizoenen/{id}
  naam, startDatum, eindDatum, status

/trekkingen/{id}
  nummers[], bonusBal, seizoenId, verwerkt, ingevoerdDoor, datum

/resultaten/{id}
  userId, userNaam, ticketId, ticketNaam,
  nummersGoed[], matchedNumbers[], aantalGoed, bonusGoed, punten,
  isWinnaar, trekkingId, seizoenId, verwerktOp

/betalingen/{id}
  userId, userNaam, bedrag, omschrijving, provider, status,
  trekkingWeek, tikkieGeopend, aangemaakt, bevestigd, bevestigdDoor,
  gecorrigeerdReden

/kasmutaties/{id}
  bedrag, type, omschrijving, datum, userId, betalingId
```

**`onboardingCompleted` volgt hetzelfde patroon als eerder `actief` bij een nieuw veld**: ontbrekend = behandel als `true` (bestaand lid, nooit onboarding nodig). Alleen expliciet `false` (gezet door `verzilverUitnodiging` bij een nieuw lid) toont de introductie. Geen migratie voor bestaande leden nodig — zie architectuurregel 7.

**Bekende, onschadelijke inconsistenties (25 juli, gevonden bij audit, bewust niet gefixt):**
- `BetalingStatus` kent nog `'verificatie'` als mogelijke waarde, maar niets maakt die status meer aan.
- `Betaling.isSaldoStorting` bestaat nog als veld in het type, maar `stortLottoSaldo` zet dit nooit meer. Overal defensief gelezen, geen crash-risico.
- Dashboard's `inVerificatie`-state is dode code — checkt op een status die nooit meer voorkomt.

**Verwijderd (23 juli)**: de `rondes`-collectie en bijbehorende code.

**Verwijderd (eerder)**: `/prijsConfig/default` wordt niet meer gelezen/geschreven.

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking | Cumulatieve controle-engine, resultaten, punten, push |
| `onBetalingBevestigd` | Betaling → betaald (update) | Push naar lid. Vuurt alleen bij een *update*, niet bij een document dat al direct met status 'betaald' wordt aangemaakt |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar wie deze week nog open staat |
| `onTikkieCheckHerinnering` | Vrijdag 20:00 | Push naar kashouder/beheerder: Tikkie checken op nieuwe stortingen |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | Nieuwe week: LottoSaldo-check per lid (automatisch afboeken of 'open' aanmaken) |
| `onTikkieLinkVerval` | Wekelijks | Push naar beheerders als Tikkie-link 12+ dagen oud is |
| `herberekenSpeelreeks` | Callable, alleen beheerder | Herberekent de huidige speelreeks volledig opnieuw |
| `verzilverUitnodiging` | Callable, alleen ingelogde gebruikers | Valideert + verzilvert een uitnodigingstoken in één transactie — zie Ledenbeheer hierboven |

`getStandaardInleg()` en `getSpelConfig()` zijn interne helpers die de actuele instellingen live uit Firestore lezen, met fallback.

---

## Pagina's

| Route | Rol |
|---|---|
| `/` | Publiek — inloggen (geen registratie-optie meer) |
| `/uitnodiging/[token]` | Publiek (vóór inloggen) — enige plek waar een nieuw lid kan toetreden |
| `/welkom` | Nieuw lid, eenmalig — 5-stappen-onboarding, daarna nooit meer |
| `/geen-toegang` | Ingelogd maar geen geldig profiel (geen uitnodiging verzilverd, of verwijderd) |
| `/dashboard` | Lid — confetti winnaar-scherm, cumulatieve bal-highlighting, "Mijn LottoSaldo"-kaart, prijzenpot van de huidige speelreeks |
| `/betalen` | Lid — puur informatief: saldo tonen, directe Tikkie-storten-knop, geen meld-stap |
| `/trekkingen` | Lid+ — invoer modal |
| `/trekkingen/[id]` | Lid+ — cumulatieve/nieuwe kleurcodering, niet-betaald-balk |
| `/startinfo` | Lid — de enige, samengevoegde informatiepagina (8 tabs), bereikbaar via Profiel |
| `/spelregels`, `/help` | Redirects naar `/startinfo` (bestaande links blijven werken) |
| `/profiel` | Lid — eigen LottoSaldo met kleurindicator, naam, ticket, notificaties |
| `/kas` | Alle rollen — alleen-lezen kasoverzicht |
| `/kashouder` | Kashouder — "💰 Storten"-knop registreert direct via `stortLottoSaldo` |
| `/kashouder/financieel` | Kashouder + Beheerder — kas-uitsplitsing, LottoSaldo-overzicht + storten, saldo-correctie + betaling-corrigeren (beheerder-only) |
| `/leden` | Kashouder+ — rollen beheren, uitnodigen, verwijderen/heractiveren (verwijderen beheerder-only) |
| `/beheerder` | Beheerder — dashboard, eigen prijzenpot-kaart als het account zelf speelt |
| `/beheerder/admin` | Beheerder — Instellingen, Spel, Prijzen, Seizoen |
| `/ranglijst`, `/hall-of-fame` | Alle rollen — nieuwe-matches-per-trekking, niet cumulatief |
| `/offline`, `/serwist/[path]` | PWA-ondersteuning, geen UI |

---

## STATUS PER 27 JULI 2026

### Volledig werkend ✅ (getest via een volledige, 6-stappen testronde)
- **Ledenuitnodigingensysteem** — open registratie dicht, uitnodiging aanmaken/delen/verzilveren, token eenmalig, race conditions gefixt
- **Onboarding** — 5-stappen-introductie voor nieuwe leden, verschijnt precies één keer
- **Startinfo & Speluitleg** — samengevoegde, actuele informatiepagina, oude pagina's redirecten
- **Leden verwijderen/heractiveren** — soft-delete, historie blijft, directe toegangsintrekking
- **Betaalsysteem** — één route, geen minimum, automatische wekelijkse afschrijving, storting-verrekening nu ook tijdzone-veilig
- LottoSaldo, kas-uitsplitsing, correctietools, vrijdagavond-herinnering, prijzenpot-berekening — nog steeds werkend zoals eerder bevestigd
- Cumulatieve "6 goed is winnaar"-spelmodus, `herberekenSpeelreeks`, rol-afhankelijke navigatie

### Openstaand ⏳
- Storting-verrekening-fix (27 juli) nog niet live getest tegen een echte zaterdagavond-situatie — logica hergebruikt wel een al 3x beproefd patroon
- Eerste **live, automatische** LottoSaldo-afboeking bij een echte trekking nog niet apart bevestigd sinds de laatste ronde wijzigingen
- Backfill voor leden die een ticket toevoegen ná het aanmaken van de weekbetalingen
- Nog geen automatische tests — alles handmatig, stap-voor-stap getest
- Bekende, onschadelijke datamodel-inconsistenties (zie Firestore Structuur)

---

## Handige links
- Live: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase: console.firebase.google.com
- Google Cloud (IAM, Functions/Logs): console.cloud.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
- Wijzigingsgeschiedenis: [`docs/changelog.md`](docs/changelog.md)
