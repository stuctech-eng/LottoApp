# LottoClub 🎱

Digitale lottovereniging app — Next.js 16, TypeScript, Firebase

## Live
🌐 https://lotto-app-eight-chi.vercel.app

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Auth + DB**: Firebase (Auth + Firestore + Cloud Functions + FCM)
- **PWA**: Serwist (`@serwist/turbopack`) — offline caching **én** Firebase Cloud Messaging in **één** service worker (`app/sw.ts`, via `app/serwist/[path]/route.ts`) — zie architectuurregel 11 voor waarom dit niet twee losse workers meer zijn
- **Deploy**: Vercel (app, auto-deploy via GitHub) + GitHub Actions (Cloud Functions én Firestore rules, zie `.github/workflows/`)
- **Workflow**: iPhone → Working Copy → GitHub → Vercel/Actions

Voor de volledige wijzigingsgeschiedenis: zie [`docs/changelog.md`](docs/changelog.md).

---

## Gebruikers (productie)

| Naam | Email | Rol | Speelt mee |
|---|---|---|---|
| Dick Veerman | t.e.veerman@ziggo.nl | Beheerder | ❌ Nee — backup beheerder |
| Dick Veerman Speler | stuctech@gmail.com | Beheerder | ✅ Ja — heeft ticket |
| Wim Kraaij | — | Lid | ✅ Ja |
| Ing | — | Lid | ✅ Ja |
| Ellen Veerman | — | Lid | ✅ Ja |
| Neeltje Veerman | — | Lid | ✅ Ja — toegetreden tijdens een lopende speelreeks, zat tijdelijk in de wachtrij (zie hieronder) |

Plus incidentele testaccounts (`+alias`-adressen op stuctech@gmail.com) — na testen via Leden → Inactief → 🗑️ definitief verwijderd.

---

## Rollen

| Rol | Wat |
|---|---|
| **Beheerder** | Alles — trekkingen, kas, leden, instellingen, meespelen, leden uitnodigen/verwijderen |
| **Kashouder** | Kas beheren + meespelen + leden uitnodigen |
| **Lid** | Alleen meespelen |

Navigatie (bottom nav + terugknoppen) is overal **rol-afhankelijk**.

---

## Wachtrij voor nieuwe leden (15 augustus 2026)

**Een nieuw lid mag pas volledig meedoen zodra de huidige speelreeks eindigt.** Instappen halverwege een reeks zou oneerlijk zijn — andere spelers hebben dan al cumulatief nummers verzameld.

### Hoe het werkt
1. Bij het verzilveren van een uitnodiging checkt de Cloud Function (`heeftHuidigeSpeelreeksAlTrekkingen()`) of de huidige speelreeks al minstens 1 trekking heeft gehad
2. Zo ja → `wachtOpNieuweSpeelreeks: true` op het nieuwe profiel
3. **Wat wél mag**: ticket instellen, alvast storten op LottoSaldo (blijft gewoon onaangeroerd staan — geen aparte "bevries"-functie nodig, want er wordt simpelweg nooit iets van afgeschreven zolang deze vlag aan staat)
4. **Wat niet gebeurt**: `onBetalingenAanmaken` (wekelijkse cyclus) én `verrekenLottoSaldoMetOpenstaandeWeek` (storting-verrekening) slaan een wachtend lid allebei expliciet over — **beide plekken moesten apart worden gefixt**, zie het Neeltje-incident hieronder
5. Dashboard toont een duidelijke banner: *"⏳ Je wacht op de nieuwe speelreeks"*
6. Onboarding (`/welkom`, laatste stap) toont een aangepaste bevestiging afhankelijk van de situatie — geen pushmelding op dit moment (er bestaat nog geen FCM-token zo vroeg in het proces)
7. Zodra er een winnaar valt (`onTrekkingVerwerkt`): alle wachtende leden worden **in dezelfde stap** vrijgegeven (`wachtOpNieuweSpeelreeks: false`) **en** krijgen een pushmelding — gegarandeerd ná de vrijgave, nooit ervoor (de vrijgave zelf triggert de Cloud Function die de nieuwe week aanmaakt)

### Het Neeltje-incident — een echte bug, gevonden door een echt nieuw lid
Een écht nieuw lid (geen testaccount) kreeg ondanks de wachtrij-vlag toch €4 automatisch afgeschreven. Oorzaak: `verrekenLottoSaldoMetOpenstaandeWeek` (aangeroepen bij elke storting-registratie) checkte de wachtrij-vlag niet — alleen de wekelijkse cyclus deed dat. **Twee plekken die hetzelfde principe moeten afdwingen, en er was er één vergeten.** Handmatig gecorrigeerd (saldo terug, betaling ongedaan gemaakt via de bestaande correctietools, geen kascorrectie nodig want de storting zelf klopte al) en de code gefixt op de gemiste plek.

---

## Leden verwijderen — twee niveaus (27 juli + 15 augustus 2026)

**Niveau 1 — soft-delete (❌, iedereen):** Leden → ❌ naast een actief lid (beheerder-only, niet bij jezelf) → `actief: false`. Account en alle historische data blijven volledig bewaard. Terugkeren via de **"Heractiveren"**-knop (niet via een nieuwe uitnodiging — dat zou altijd worden geweigerd, want `verzilverUitnodiging` staat nooit een tweede profiel voor hetzelfde account toe).

**Niveau 2 — definitief verwijderen (🗑️, alleen bij al-inactieve leden):** Leden → filter "Inactief" → 🗑️. **Onomkeerbaar** — het Firestore-profiel wordt echt verwijderd (`deleteDoc`), bedoeld voor test-accounts, niet voor leden die echt hebben meegespeeld. Raakt bewust **niet** het onderliggende Firebase Auth-account (vereist Admin SDK, niet beschikbaar vanaf de client) — dat blijft onschadelijk, technisch bestaan; een nieuwe uitnodiging op hetzelfde e-mailadres zou gewoon een vers profiel aanmaken.

---

## Ledenbeheer & Authenticatie (26-27 juli 2026)

**Open registratie bestaat niet meer.** Nieuwe leden kunnen **uitsluitend** via een geldige, eenmalige uitnodiging toetreden — zie `/uitnodiging/[token]`, de Cloud Function `verzilverUitnodiging` (server-side, één transactie, voorkomt dubbel gebruik), en `/geen-toegang` voor wie geen geldig profiel heeft.

**Startinfo & Speluitleg**: `/spelregels` en `/help` zijn beide redirects naar **`/startinfo`** — de enige, officiële informatiepagina.

---

## Spelregel (definitief — vaste, enige spelmodus)

**"6 goed is winnaar" — cumulatief per speelreeks.**

1. **Betaling = deelname** — alleen bevestigde betaling voor die specifieke week telt mee.
2. **1 ticket per persoon.**
3. **Cumulatieve matching**: elk nummer dat een speler goed heeft, wordt permanent bijgeschreven binnen de huidige speelreeks.
4. **Winnen bij 6 unieke goede nummers**, cumulatief over eventueel meerdere trekkingen.
5. **Meerdere winnaars mogelijk.**
6. **Geen winnaar → rollover.**
7. **Na winnaar(s) → nieuwe speelreeks**, automatisch — grens wordt afgeleid uit de trekkingsgeschiedenis.
8. **Ranglijstpunten** gebaseerd op alleen de nieuwe matches die trekking, niet het cumulatieve totaal.
9. **Storten mag alleen maandag t/m zaterdag 18:00.**
10. **Nieuwe leden wachten op de eerstvolgende winnaar** als ze instappen tijdens een lopende reeks — zie hierboven.

### Voorbeeld
```
Ticket:        6 - 12 - 18 - 23 - 31 - 44
Trekking 1:     6 -  8 - 19 - 27 - 33 - 41  →  1 nieuw   → totaal 1/6
Trekking 2:    12 - 16 - 22 - 35 - 39 - 44  →  2 nieuw   → totaal 3/6
Trekking 3:    18 - 23 - 31 - 40 - 42 - 45  →  3 nieuw   → totaal 6/6 → WINNAAR
```

---

## Betalen — één enkele route

**Alles is een storting**, geen minimum. `stortLottoSaldo` verhoogt saldo + kasmutatie + verrekent direct een openstaande week (mits het lid niet in de wachtrij zit — zie hierboven). `onBetalingenAanmaken` (wekelijkse cyclus, na elke trekking) doet hetzelfde automatisch als er genoeg saldo is.

`verrekenLottoSaldoMetOpenstaandeWeek` gebruikt `relevanteTrekkingWeek()` (niet de kalenderdatum) én checkt sinds 15 augustus ook `wachtOpNieuweSpeelreeks`.

### Belangrijkste boekhoudregel
> Een storting telt **direct** mee in de kas. De wekelijkse afboeking daarna raakt **nooit** de kas opnieuw aan — alleen het `lottoSaldo`-veld.

### Correctietools (Beheerder)
- **Financieel → LottoSaldo → potloodje (✎)** → saldo direct zetten, geen kasmutatie.
- **Financieel → Betaling corrigeren** → status naar `'gecorrigeerd'`, met **"↺ Herstel"**. Nooit door elkaar gebruiken met de saldo-correctie voor hetzelfde incident.

### Tikkie laatst gecontroleerd (15 augustus 2026)
Financieel-pagina toont bovenaan *"💳 Tikkie laatst gecontroleerd: [datum/tijd]"* — puur afgeleid uit de meest recente `'inleg'`-kasmutatie, geen aparte knop of veld nodig. Elke storting-registratie is zelf al het bewijs dat Tikkie is gecheckt.

---

## Notificaties — een lange speurtocht, drie losse bugs (15 augustus 2026)

Meldingen "werkten eerder wel" maar leken op een gegeven moment niet meer aan te komen. Grondig regressieonderzoek (git-geschiedenis, Cloud Logging) vond **drie onafhankelijke problemen**, na elkaar ontdekt:

### Bug 1 — dode tokens werden nooit echt opgeruimd
`sendToTokens()` in de Cloud Function **logde** dat ongeldige tokens "worden opgeschoond", maar deed dat in werkelijkheid nooit (`deleteDoc()` ontbrak). Dode tokens (ontstaan door PWA-herinstallaties, cache-wissen) stapelden zich voor altijd op, en werden bij élke melding opnieuw geprobeerd — tot er geen enkel geldig token meer overbleef. **Gefixt**: echte verwijdering toegevoegd, op alle 9 plekken die `sendToTokens` aanroepen (functie kreeg een verplichte `userId`-parameter om te weten uit welke subcollectie te verwijderen).

### Bug 2 — het token werd nooit automatisch ververst
De notificatie-toggle op Profiel (`notifActief`) begon **altijd** op `false` bij elke page-load, ongeacht of er al eerder toestemming was gegeven. Het token werd daardoor alleen ververst op het exacte moment dat iemand de toggle handmatig omzette — in de praktijk bijna nooit. **Gefixt**: een nieuwe `useEffect` in `lib/auth-context.tsx` ververst het token automatisch bij **elke** ingelogde sessie (gebaseerd op de echte `Notification.permission`, niet op React-state) — werkt nu voor de hele app, niet alleen wie toevallig de togglet aanraakt.

### Bug 3 — twee service workers streden om de controle (de uiteindelijke hoofdoorzaak)
Firebase Messaging draaide in een **apart** bestand (`public/firebase-messaging-sw.js`) naast de Serwist PWA-caching-worker (`app/sw.ts`, met `skipWaiting: true` + `clientsClaim: true`). Twee actieve service workers op hetzelfde origin kunnen elkaar als "controller" verdringen — de caching-worker nam bij elke page-load de controle over, waardoor de messaging-worker er niet meer was om `showNotification()` aan te roepen. **Resultaat**: de server meldde "succes" (het bericht kwam echt aan bij Apple/Firebase), maar er verscheen nooit iets. **Gefixt**: Firebase Messaging is nu **samengevoegd** in dezelfde ene worker als de caching-logica (`app/sw.ts`, via `firebase/messaging/sw` — de moderne, module-gebaseerde API). `public/firebase-messaging-sw.js` bestaat niet meer (leeg, veilig te verwijderen uit de repo).

**Diagnose-aanpak die hielp**: bij elke stap een test gebouwd die de échte foutmelding **in de app zelf** toont (niet verstopt achter Firebase's generieke "internal") — inclusief een testfunctie die bewust een `notification`-veld meestuurt om te isoleren of het probleem in de data-only-aanpak zat (bleek van niet — sloot dat uit als oorzaak, wat uiteindelijk naar de service-worker-conflict-hypothese leidde).

### Nieuwe, samengevoegde notificatiepagina: `/profiel/notificaties`
Verving zowel de losse toggle op Profiel als de aparte, beheerder-only `/debug-fcm`-pagina (nu een redirect):
- **Tab "Instellingen"**: hoofdschakelaar + 5 losse categorieën (`trekkingResultaten`, `betalingBevestigd`, `herinneringen`, `winnaars`, `ranglijstUpdates`) — nieuw `NotificationSettings`-type, ook client-kant toegevoegd (was er al server-kant)
- **Tab "Test"**: volledige diagnostiek, testmelding-knop (voor iedereen, test alleen het eigen account), en de handmatige zaterdag-herinnering-trigger (beheerder-only binnen de tab, want die stuurt naar iedereen)

---

## Zaterdag-saldo-herinnering (15 augustus 2026)

Elke zaterdag 12:00 (`onZaterdagSaldoHerinnering`) — persoonlijk bericht per spelend lid (niet-wachtend), gebaseerd op actueel saldo:
- Genoeg saldo: *"🎱 Vanavond vallen de ballen! Je saldo staat op €X — genoeg om mee te doen! 🍀"*
- Te weinig: *"...dat is niet genoeg. Stort vóór 18:00 vandaag via Tikkie om mee te doen!"*

Schrijft een volledig statusverslag naar `debug/zaterdagSaldoHerinnering` (per-lid reden zichtbaar: verstuurd/geen ticket/wacht op speelreeks/geen token), zichtbaar op `/profiel/notificaties` (Test-tab, beheerder) — inclusief een knop om **handmatig** te triggeren zonder een week te hoeven wachten.

---

## Vereniging-instellingen

Beheer → Instellingen → "Vereniging": **Naam vereniging** en **Standaard inleg** bewerkbaar, opgeslagen in `/verenigingConfig/main`.

---

## Betaalcyclus (grotendeels automatisch)

```
Maandag: nieuwe ISO-week begint
Ma t/m za 18:00: LottoSaldo dekt automatisch, anders: lid stort, kashouder registreert
Vrijdag 09:00: push naar wie deze week nog open staat
Vrijdag 20:00: push naar kashouder/beheerder — "Tikkie checken"
Zaterdag 12:00: persoonlijke saldo-herinnering naar spelende leden
Zaterdag 18:00: storten geblokkeerd
Zaterdag 19:30: beheerder krijgt push "uitslag invoeren"
Zaterdag avond: trekking verwerkt → resultaten, push, wachtende leden vrijgegeven bij winnaar
Zondag: geblokkeerd tot maandag
```

---

## KRITIEKE ARCHITECTUURREGELS

### 1. Geen orderBy in Firestore queries
**NOOIT `orderBy()` gebruiken.** Vereist een composite index; zonder index: stille lege array.

### 2. ISO-8601 weekberekening — "kalenderweek" ≠ "relevante week"
Gebruik voor weergave en verrekening altijd `relevanteTrekkingWeek(betalingen)`, nooit blind `huidigTrekkingWeek()`.

### 3. Data-only FCM payload
Nooit top-level `notification` veld in `sendToTokens` — de (samengevoegde) service worker toont de melding zelf via `showNotification()`. Zie ook regel 11.

### 4. kasSaldo nooit opslaan
Altijd `berekenKasSaldo(kasmutaties)`.

### 5. Controle-engine identiek
`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` altijd byte-voor-byte identiek.

### 6. Cumulatieve matching + handmatige veldmappings
**Handmatige Firestore-veldmappings zijn dé terugkerende bronfout van dit project** — inmiddels misgegaan bij: `matchedNumbers`, `lottoSaldo`, `lottoSaldoIntroSeen`, `onboardingCompleted`, en (bijna) `wachtOpNieuweSpeelreeks`/`notificationSettings` (dit keer wel in één keer goed gedaan, met een geautomatiseerd script dat de exacte inspringing per bestand overnam). **Check bij elk nieuw veld op `User`/`Resultaat`, zonder uitzondering, alle plekken waar dat type handmatig gemapt wordt**: `lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`, `lib/firestore-trekkingen.ts`.

### 7. Herberekenen in plaats van migratiescripts
Ontbrekend veld = impliciete default, overal consistent toegepast (`actief`, `onboardingCompleted`, en nu ook `wachtOpNieuweSpeelreeks`/`notificationSettings`) — nooit een los migratiescript nodig.

### 8. Geen alternatieve spelmodi
`PrijsConfig` bewust volledig verwijderd.

### 9. Firestore rules: repo en productie kunnen driften
Regels moeten kloppen met wíe de schrijfactie daadwerkelijk uitvoert, niet alleen wíe de data betreft. `.github/workflows/deploy-firestore-rules.yml` deployt automatisch.

### 10. React state die uit sync kan raken — gebruik afgeleide waarden
`profileLoading` is een **afgeleide waarde**, geen eigen state. Zie ook: navigeer nooit direct na een succesvolle server-respons zonder te wachten tot de lokale state ook echt is bijgewerkt (`app/uitnodiging/[token]/page.tsx`) — en let op wanneer twee `useEffect`s die eigenlijk hetzelfde randgeval afvangen (bijv. "bestaand lid opent per ongeluk een link" én "nieuw lid net geregistreerd") niet van elkaar te onderscheiden zijn zonder een expliciete ref-vlag.

### 11. Eén service worker per origin voor push + caching (nieuw, 15 augustus 2026)
**Registreer nooit een tweede, aparte service worker naast de PWA-caching-worker voor iets anders (zoals push-meldingen).** Meerdere actieve service workers op hetzelfde origin/dezelfde scope verdringen elkaar als "controller" — vooral met `skipWaiting: true` + `clientsClaim: true` (nodig voor een PWA die altijd de nieuwste cache-versie wil) kan de ene worker de andere onopgemerkt buitenspel zetten. Gevolg was hier: de server meldde succesvolle verzending, maar er verscheen nooit een melding — geen foutmelding nergens, want de techniek "werkte" gewoon, alleen niet de juiste worker was er nog om te reageren. **Vuistregel**: alle service-worker-functionaliteit (caching, push, sync) hoort in **één** bestand, of expliciet in bewust verschillende scopes met een duidelijke reden.

---

## Firestore Structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, lottoSaldo, lottoSaldoIntroSeen,
  onboardingCompleted, wachtOpNieuweSpeelreeks,
  notificationSettings { trekkingResultaten, betalingBevestigd,
    herinneringen, winnaars, ranglijstUpdates }
  /fcmTokens/{token}
    token, platform, aangemaakt, actief

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

/debug/zaterdagSaldoHerinnering
  laatsteRun, succes, foutmelding, aantalGebruikersGevonden,
  aantalMetTicket, aantalNietWachtend, aantalMetToken,
  aantalVerstuurd, details[]
```

**Ontbrekend veld = impliciete default** geldt nu voor: `actief` (true), `onboardingCompleted` (true), `wachtOpNieuweSpeelreeks` (false/onwaar), `notificationSettings` (alle categorieën aan behalve ranglijstUpdates) — nooit een migratiescript nodig, zie architectuurregel 7.

**Bekende, onschadelijke inconsistenties (bewust niet gefixt):**
- `BetalingStatus` kent nog `'verificatie'` als mogelijke waarde, nooit meer aangemaakt.
- `Betaling.isSaldoStorting` bestaat nog als veld, wordt nooit meer gezet.
- Dashboard's `inVerificatie`-state is dode code.

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking | Cumulatieve controle-engine, resultaten, punten, push, **geeft wachtende leden vrij bij een winnaar** |
| `onBetalingBevestigd` | Betaling → betaald (update) | Push naar lid |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar wie deze week nog open staat |
| `onTikkieCheckHerinnering` | Vrijdag 20:00 | Push naar kashouder/beheerder |
| `onZaterdagSaldoHerinnering` | Zaterdag 12:00 | Persoonlijke saldo-herinnering naar spelende leden, met statusverslag naar `/debug/zaterdagSaldoHerinnering` |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | Nieuwe week: LottoSaldo-check per lid, **slaat wachtende leden over** |
| `onTikkieLinkVerval` | Wekelijks | Push naar beheerders bij oude Tikkie-link |
| `herberekenSpeelreeks` | Callable, alleen beheerder | Herberekent de huidige speelreeks |
| `verzilverUitnodiging` | Callable, ingelogde gebruikers | Valideert + verzilvert een uitnodigingstoken, bepaalt `wachtOpNieuweSpeelreeks` |
| `stuurTestNotificatie` | Callable, ingelogde gebruikers | Testmelding naar het eigen account, met zichtbare foutmelding i.p.v. generiek "internal" |
| `stuurTestNotificatieMetNotificationVeld` | Callable, ingelogde gebruikers | Tijdelijke diagnosefunctie (notification-veld i.p.v. data-only) — kan weg zodra de SW-fix structureel bevestigd is |
| `stuurZaterdagSaldoHerinneringNu` | Callable, alleen beheerder | Handmatige trigger van de zaterdag-melding, voor testen zonder te wachten |

`sendToTokens()` verwijdert sinds 15 augustus **echt** ongeldige tokens (was eerder alleen een logregel).

---

## Pagina's

| Route | Rol |
|---|---|
| `/` | Publiek — inloggen, geen registratie-optie |
| `/uitnodiging/[token]` | Publiek — enige plek waar een nieuw lid kan toetreden |
| `/welkom` | Nieuw lid, eenmalig — 5-stappen-onboarding, met wachtrij-bevestiging op de laatste stap |
| `/geen-toegang` | Ingelogd maar geen geldig/actief profiel |
| `/dashboard` | Lid — wachtrij-banner indien van toepassing, prijzenpot, "Mijn LottoSaldo" |
| `/betalen` | Lid — puur informatief, directe Tikkie-storten-knop |
| `/trekkingen`, `/trekkingen/[id]` | Lid+ |
| `/startinfo` | Lid — samengevoegde informatiepagina (8 tabs) |
| `/spelregels`, `/help`, `/debug-fcm` | Redirects (naar `/startinfo` resp. `/profiel/notificaties`) |
| `/profiel` | Lid — naam, ticket, telefoon, link naar Notificaties |
| **`/profiel/notificaties`** | **Lid — nieuw: Instellingen-tab (per categorie) + Test-tab (diagnostiek, testmelding, zaterdag-trigger beheerder-only)** |
| `/kas` | Alle rollen — alleen-lezen kasoverzicht |
| `/kashouder`, `/kashouder/financieel` | Kashouder(+) — inclusief "Tikkie laatst gecontroleerd" |
| `/leden` | Kashouder+ — uitnodigen, ❌ soft-delete, 🗑️ definitief verwijderen (bij inactief), Heractiveren |
| `/beheerder`, `/beheerder/admin` | Beheerder |
| `/ranglijst`, `/hall-of-fame` | Alle rollen |
| `/offline`, `/serwist/[path]` | PWA-ondersteuning, geen UI |

---

## STATUS PER 15 AUGUSTUS 2026

### Volledig werkend ✅ (bevestigd via testen)
- Ledenuitnodigingensysteem, onboarding, Startinfo & Speluitleg
- Leden verwijderen (soft-delete + definitief), heractiveren
- Betaalsysteem, storting-verrekening, Tikkie-laatst-gecontroleerd
- Wachtrij voor nieuwe leden — inclusief de gefixte storting-verrekening-check
- Notificatie-token-opschoning en automatische verversing bij elke sessie (bevestigd met eigen ogen: van 7 naar 1 token, testmelding kwam aan)
- Cumulatieve spelmodus, rol-afhankelijke navigatie

### Openstaand ⏳
- **Service worker-samenvoeging (bug 3, notificaties)** — sterk onderbouwde hypothese, nog niet bevestigd met een geslaagde testmelding ná deze specifieke fix
- Eerste automatische vrijgave van wachtende leden bij een echte winnaar — nog niet meegemaakt (moet nog een winnaar vallen)
- Eerste volledige run van `onZaterdagSaldoHerinnering` op de geplande tijd (i.p.v. handmatig getriggerd) nog niet apart bevestigd
- Backfill voor leden die een ticket toevoegen ná het aanmaken van de weekbetalingen
- Geen automatische tests — alles handmatig, stap-voor-stap getest

---

## Handige links
- Live: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase: console.firebase.google.com
- Google Cloud (Logging/IAM): console.cloud.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
- Wijzigingsgeschiedenis: [`docs/changelog.md`](docs/changelog.md)
