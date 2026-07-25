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

---

## Rollen

| Rol | Wat |
|---|---|
| **Beheerder** | Alles — trekkingen, kas, leden, instellingen, meespelen |
| **Kashouder** | Kas beheren + meespelen |
| **Lid** | Alleen meespelen |

Navigatie (bottom nav + terugknoppen) is overal **rol-afhankelijk**. `Naam vereniging`, `Standaard inleg` en `Kashouder` (Beheer → Instellingen) zijn echt bewerkbaar/afgeleid.

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

### Wat er niet meer bestaat, en waarom
| Verwijderd | Reden |
|---|---|
| `meldBetaling`, `meldLottoSaldoStorting` (lid meldt zelf) | Leden vergaten het structureel — de knop werd simpelweg niet gebruikt |
| `bevestigBetaling`, `wijsBetalingAf` (verificatie bevestigen/afwijzen) | Overbodig zodra er niets meer bestaat dat een `'verificatie'`-status document aanmaakt |
| `markeerBetaaldDoorKashouder` ("✓ Betaald"-knop met eigen 4-stappenlogica) | Viel samen met `stortLottoSaldo` — twee routes die elkaar niet kenden was precies de bron van de dubbeltellings-bugs (zie changelog, 23-25 juli) |
| Minimumbedrag bij storten (was: standaard inleg) | Kashouder registreert exact wat ze in Tikkie zien — een kunstmatig minimum paste niet bij die realiteit |
| "Te verifiëren betalingen"-secties (Financieel + kashouder-dashboard) | Dode UI sinds er niets meer bestaat dat zo'n document aanmaakt |

### Belangrijkste boekhoudregel
> Een storting telt **direct** mee in de kas. De wekelijkse afboeking daarna raakt **nooit** de kas opnieuw aan — alleen het `lottoSaldo`-veld. Andersom een kasmutatie aanmaken bij zowel storting als afboeking zou het bedrag dubbel tellen.

De Financieel-pagina toont een expliciete **kas-uitsplitsing**: Totale kas → min Gereserveerd als LottoSaldo → Vrij beschikbaar.

### Correctietools (Beheerder)
- **Financieel → LottoSaldo → potloodje (✎)** naast een lid → saldo direct naar een specifiek bedrag zetten, **geen kasmutatie** (puur boekhoudkundige correctie).
- **Financieel → Betaling corrigeren** → een reeds bevestigde betaling achteraf als `'gecorrigeerd'` markeren (document blijft zichtbaar in de geschiedenis, telt nergens meer mee als betaald) — met een **"↺ Herstel"**-knop om dit ongedaan te maken. **Let op**: dit corrigeert alleen de betaalstatus, nooit het geld — gebruik daarvoor altijd de Kascorrectie ernaast. De twee tools door elkaar gebruiken voor hetzelfde incident leidt tot een inconsistente staat (saldo zegt "gedekt", betaalstatus zegt "niet betaald").

### Dashboard (lid)
Eigen "Mijn LottoSaldo"-kaart, met vier statussen (geen saldo / te weinig voor deze week / bijna op / genoeg) en een expliciete regel: *"Bij elke nieuwe speelweek wordt hier automatisch €X van afgeschreven — geen actie nodig zolang er saldo is."* Losstaand van de "Betaalstatus"-kaart (toont specifiek of déze week al is afgehandeld) — bewust twee aparte kaarten, want saldo en betaalstatus kunnen tijdelijk uit elkaar lopen.

Het "Betaling bevestigd"-scherm op `/betalen` is **niet langer blokkerend** — een klein groen label bovenaan toont de status, maar de saldo-kaart en de Tikkie-storten-knop blijven altijd bereikbaar eronder (je kunt dus tegelijk zien dat je betaald hebt én meteen bijstorten).

---

## Vereniging-instellingen

Beheer → Instellingen → "Vereniging": **Naam vereniging** en **Standaard inleg** zijn echt bewerkbaar. Opgeslagen in `/verenigingConfig/main`, met `lib/firestore-vereniging.ts` als toegangslaag (`subscribeVerenigingConfig` voor componenten, `haalVerenigingConfigOp` voor eenmalige lezingen in actiefuncties).

**Standaard inleg is overal dynamisch** — betaalpagina, kashouder-dashboard, financieel, profiel, dashboard-knop, spelregels, help-pagina, én de Cloud Function (`getStandaardInleg`).

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
Meerdere `==`-filters op verschillende velden zijn wél veilig zonder composite index — maar **let op combinaties met `in`**: `where('actief','==',true).where('rol','in',[...])` kán ook een composite index vereisen. Bij twijfel: twee losse simpele queries en de resultaten samenvoegen in JS, in plaats van te gokken (zie `onTikkieCheckHerinnering` in `functions/src/index.ts` als voorbeeld).

### 2. ISO-8601 weekberekening
Maandag t/m zondag. Identiek in `lib/firestore-payments.ts` (`huidigTrekkingWeek`) en `functions/src/index.ts` (`getTrekkingWeek`).

### 3. Data-only FCM payload
Nooit top-level `notification` veld.

### 4. kasSaldo nooit opslaan
Altijd `berekenKasSaldo(kasmutaties)`.

### 5. Controle-engine identiek
`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` altijd byte-voor-byte identiek. Pure functie — geen Firestore, geen React.

### 6. Cumulatieve matching + handmatige veldmappings
- `nummersGoed` = nieuw deze trekking · `matchedNumbers` = cumulatief · `aantalGoed` = `matchedNumbers.length` · `punten` op basis van `nummersGoed.length`, nooit cumulatief.
- **Handmatige Firestore-veldmappings zijn een terugkerende bronfout** — meerdere velden (`matchedNumbers`, `lottoSaldo`, `lottoSaldoIntroSeen`) zijn ooit vergeten in een manuele mapping (`lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`, `lib/firestore-trekkingen.ts`). **Check bij elk nieuw veld op `User`/`Resultaat` of het overal waar dat type handmatig gemapt wordt, ook echt is toegevoegd.**

### 7. Herberekenen in plaats van migratiescripts
`herberekenSpeelreeks` (Beheer → Prijzen): herberekent alleen de huidige speelreeks, `ranglijstPunten` altijd hard herberekend als som (nooit delta), filtert correct op betalers per specifieke week.

### 8. Geen alternatieve spelmodi
`PrijsConfig` bewust volledig verwijderd.

### 9. Firestore rules: repo en productie kunnen driften — controleer altijd de live regels
De `firestore.rules` in de repo kan afwijken van wat er daadwerkelijk in Firebase actief staat (ooit gebeurd na handmatige Console-wijzigingen). Sinds 23 juli deployt `.github/workflows/deploy-firestore-rules.yml` de repo-versie automatisch bij elke push die `firestore.rules` raakt. De service-account heeft hiervoor de IAM-rol **Firebase Rules Admin** (`roles/firebaserules.admin`) nodig.

**Regels moeten kloppen met wíe de schrijfactie daadwerkelijk uitvoert, niet alleen wíe de data betreft.** Concreet voorbeeld (gevonden en gefixt 25 juli): `/betalingen`'s `create`-regel eiste `request.resource.data.userId == request.auth.uid` — bedoeld voor "lid meldt voor zichzelf". Maar `stortLottoSaldo` (kashouder-actie) kan óók een nieuw document aanmaken **namens een ander lid** wanneer die nog geen betaaldocument voor de week heeft. `request.auth.uid` (de kashouder) en `request.resource.data.userId` (het lid) zijn dan verschillend — de regel zou dit stil hebben geblokkeerd. Fix: `allow create` staat nu ook `isKashouderOfBeheerder()` toe, los van wiens `userId` het betreft. **Bij elke wijziging aan wie-doet-wat in de applicatielaag: nagaan of de Firestore-regels nog kloppen met de nieuwe uitvoerder van die actie**, niet er automatisch van uitgaan dat een bestaande regel blijft passen.

`/users/{userId}` heeft een veld-beperkte uitzondering: kashouder/beheerder mogen `lottoSaldo` van een ander lid wijzigen (`hasOnly(['lottoSaldo'])`), beheerder mag daarnaast `rol` wijzigen. Geen brede "mag alles van iedereen"-regel.

---

## Firestore Structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, notificationSettings,
  lottoSaldo, lottoSaldoIntroSeen

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

**Bekende, onschadelijke inconsistenties (25 juli, gevonden bij audit, bewust niet gefixt):**
- `BetalingStatus` kent nog `'verificatie'` als mogelijke waarde, maar niets maakt die status meer aan. Laten staan voor het geval een toekomstige feature 'm weer nodig heeft — geen risico, gewoon nooit gebruikt.
- `Betaling.isSaldoStorting` bestaat nog als veld in het type, maar `stortLottoSaldo` zet dit nooit meer (stortingen worden nu alleen als kasmutatie + saldo-verhoging vastgelegd, niet meer als los `Betaling`-document). Overal waar het nog gelezen wordt, gebeurt dat defensief (`?? '—'` / `if (x) return`) — geen crash-risico, gewoon altijd `undefined`.
- Dashboard's `inVerificatie`-state (`mijnLaatsteBetaling?.status === 'verificatie'`) is dode code — checkt op een status die nooit meer voorkomt. Toont gewoon nooit, geen risico.

**Verwijderd (23 juli)**: de `rondes`-collectie en bijbehorende code — nooit afgemaakt/aangesloten, nergens gebruikt, bevatte zelf een `orderBy()`-bug.

**Verwijderd (eerder)**: `/prijsConfig/default` wordt niet meer gelezen/geschreven.

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking | Cumulatieve controle-engine, resultaten, punten, push |
| `onBetalingBevestigd` | Betaling → betaald (update) | Push naar lid. **Let op**: vuurt alleen bij een *update* naar 'betaald', niet als een document al direct met status 'betaald' wordt aangemaakt (gebeurt bij de automatische wekelijkse afboeking en bij `verrekenLottoSaldoMetOpenstaandeWeek`'s "geen bestaand document"-tak) — in die gevallen mist het lid dus de losse pushmelding, ziet het resultaat wel gewoon terug in de app |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar wie deze week nog open staat |
| `onTikkieCheckHerinnering` | Vrijdag 20:00 | Push naar kashouder/beheerder: Tikkie checken op nieuwe stortingen |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | Nieuwe week: LottoSaldo-check per lid (automatisch afboeken of 'open' aanmaken) |
| `onTikkieLinkVerval` | Wekelijks | Push naar beheerders als Tikkie-link 12+ dagen oud is (tijd-gebaseerde inschatting, geen echte detectie) |
| `herberekenSpeelreeks` | Callable, alleen beheerder | Herberekent de huidige speelreeks volledig opnieuw |

`getStandaardInleg()` en `getSpelConfig()` zijn interne helpers die de actuele instellingen live uit Firestore lezen, met fallback.

---

## Pagina's

| Route | Rol |
|---|---|
| `/dashboard` | Lid — confetti winnaar-scherm, cumulatieve bal-highlighting, "Mijn LottoSaldo"-kaart, prijzenpot van de huidige speelreeks |
| `/betalen` | Lid — puur informatief: saldo tonen, directe Tikkie-storten-knop, **geen meld-stap** |
| `/trekkingen` | Lid+ — invoer modal |
| `/trekkingen/[id]` | Lid+ — cumulatieve/nieuwe kleurcodering, niet-betaald-balk |
| `/deelnemers`, `/spelregels`, `/help` | Lid — bereikbaar via Profiel → Informatie, bedragen dynamisch |
| `/profiel` | Lid — eigen LottoSaldo met kleurindicator, naam, ticket, notificaties |
| `/kas` | Alle rollen — alleen-lezen kasoverzicht |
| `/kashouder` | Kashouder — "💰 Storten"-knop (was "✓ Betaald") registreert direct via `stortLottoSaldo` |
| `/kashouder/financieel` | Kashouder + Beheerder — kas-uitsplitsing, LottoSaldo-overzicht + storten, saldo-correctie + betaling-corrigeren (beheerder-only) |
| `/leden` | Kashouder+ — rollen beheren |
| `/beheerder` | Beheerder — dashboard |
| `/beheerder/admin` | Beheerder — Instellingen (Naam vereniging, Standaard inleg, Kashouder-lookup), Spel, Prijzen (herbereken-knop), Seizoen |
| `/ranglijst`, `/hall-of-fame` | Alle rollen — nieuwe-matches-per-trekking, niet cumulatief |
| `/offline`, `/serwist/[path]` | PWA-ondersteuning, geen UI |

---

## STATUS PER 25 JULI 2026

### Volledig werkend ✅
- **Betaalsysteem geconsolideerd tot één route** — alles is een storting, geen minimum, kashouder registreert direct na het zelf checken van Tikkie
- LottoSaldo: automatische wekelijkse afschrijving, verrekening bij storting, lage-saldo-pushmeldingen, kas-uitsplitsing, twee correctietools (saldo + betaalstatus, met herstel-optie)
- Nieuwe vrijdagavond-herinnering voor kashouder/beheerder
- Firestore-rule voor `/betalingen`-create gefixt zodat kashouder ook namens een ander lid mag aanmaken
- Vereniging-instellingen (Naam, Standaard inleg) overal dynamisch doorgevoerd
- Firestore rules gesynchroniseerd met productie, automatische deploy-workflow werkend
- Cumulatieve "6 goed is winnaar"-spelmodus, `herberekenSpeelreeks`, rol-afhankelijke navigatie — nog steeds werkend zoals eerder bevestigd

### Openstaand ⏳
- Eerste **live, automatische** LottoSaldo-afboeking bij een echte trekking nog niet gezien — tot nu toe alles handmatig getest/geverifieerd
- Backfill voor leden die een ticket toevoegen ná het aanmaken van de weekbetalingen
- Nog geen automatische tests
- Drie bekende, onschadelijke inconsistenties in het datamodel (zie Firestore Structuur hierboven) — geen actie vereist, wel goed om te weten bij toekomstig werk aan `Betaling`/`BetalingStatus`
- `firestore.rules` in de repo is nu gesynchroniseerd met productie, maar er is geen manier om toekomstige handmatige Console-wijzigingen automatisch te detecteren — bij twijfel altijd de live Console-regels checken

---

## Handige links
- Live: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase: console.firebase.google.com
- Google Cloud (IAM, Functions/Logs): console.cloud.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
- Wijzigingsgeschiedenis: [`docs/changelog.md`](docs/changelog.md)
