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

Navigatie (bottom nav + terugknoppen) is overal **rol-afhankelijk**. `Naam vereniging`, `Standaard inleg` en `Kashouder` (Beheer → Instellingen) zijn nu echt bewerkbaar/afgeleid — voorheen hardcoded decoratie zonder functie.

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
9. **Betalen alleen maandag t/m zaterdag 18:00** — technisch afgedwongen in `app/betalen/page.tsx`.

### Voorbeeld
```
Ticket:        6 - 12 - 18 - 23 - 31 - 44
Trekking 1:     6 -  8 - 19 - 27 - 33 - 41  →  1 nieuw   → totaal 1/6
Trekking 2:    12 - 16 - 22 - 35 - 39 - 44  →  2 nieuw   → totaal 3/6
Trekking 3:    18 - 23 - 31 - 40 - 42 - 45  →  3 nieuw   → totaal 6/6 → WINNAAR
```

---

## LottoSaldo (nieuw sinds 23 juli — vooruitbetalen)

Een lid kan een bedrag naar keuze vooruit storten. Elke week wordt daar automatisch de standaard inleg vanaf geboekt — zonder dat het lid nog iets hoeft te doen.

### Hoe het werkt
1. **Lid stort** (via `/betalen` → "Saldo opwaarderen", bedrag naar keuze) → status `verificatie`, `isSaldoStorting: true`
2. **Kashouder/beheerder bevestigt** (ziet het bedrag in Tikkie) → `lottoSaldo` van het lid gaat omhoog **én** er wordt direct een kasmutatie aangemaakt — het geld is vanaf dit moment al clubgeld, ook al is het nog niet "verbruikt" als wekelijkse inleg
3. **Bij bevestiging wordt meteen gecheckt** of er een openstaande week is die hiermee direct gedekt kan worden (`verrekenLottoSaldoMetOpenstaandeWeek`) — zo niet, wacht het saldo gewoon tot de volgende cyclus
4. **Elke week, bij het aanmaken van nieuwe betalingen** (`onBetalingenAanmaken`): genoeg saldo? → automatisch afgeschreven, week direct op 'betaald', **geen nieuwe kasmutatie** (dat geld zat al in de kas sinds stap 2)
5. **Te weinig/geen saldo** → normale handmatige flow, ongewijzigd
6. **Pushmeldingen** bij nog 2 en nog 1 week tegoed

### Belangrijkste boekhoudregel
> Een storting telt **direct** mee in de kas. De wekelijkse afboeking daarna raakt **nooit** de kas opnieuw aan — alleen het `lottoSaldo`-veld. Andersom een kasmutatie aanmaken bij zowel storting als afboeking zou het bedrag dubbel tellen.

De Financieel-pagina toont daarom een expliciete **kas-uitsplitsing**: Totale kas → min Gereserveerd als LottoSaldo → Vrij beschikbaar.

### Correctietool (Beheerder)
Financieel → LottoSaldo → potloodje (✎) naast een lid → saldo direct naar een specifiek bedrag zetten, **geen kasmutatie** (puur boekhoudkundige correctie, voor als er per ongeluk een week buiten het saldo om is afgehandeld — zie `docs/changelog.md` voor het concrete incident waarvoor dit gebouwd is).

### "✓ Betaald"-knop (Kashouder-dashboard) — saldo-bewust sinds 23 juli
`markeerBetaaldDoorKashouder` checkt nu in deze volgorde: (1) al betaald deze week? → weigert, voorkomt dubbele boeking; (2) bestaand open document? → bevestigen; (3) genoeg LottoSaldo? → dekken vanuit saldo, geen kasmutatie; (4) anders → nieuwe betaling + kasmutatie zoals voorheen. **Vóór deze fix kon deze knop een dubbele, ongedekte kasmutatie veroorzaken** — zie changelog.

---

## Vereniging-instellingen (nieuw sinds 23 juli)

Beheer → Instellingen → "Vereniging": **Naam vereniging** en **Standaard inleg** zijn nu écht bewerkbaar (voorheen hardcoded tekst zonder functie). Opgeslagen in `/verenigingConfig/main`, met `lib/firestore-vereniging.ts` als toegangslaag (`subscribeVerenigingConfig` voor componenten, `haalVerenigingConfigOp` voor eenmalige lezingen in actiefuncties).

**Standaard inleg is overal dynamisch** — betaalpagina, kashouder-dashboard, financieel, profiel, dashboard-knop, spelregels, help-pagina, én de Cloud Function (`getStandaardInleg`, vervangt een eerder hardcoded `4` die nooit synchroon liep met de client).

**Kashouder** wordt automatisch afgeleid uit de rol-toewijzing op de Leden-pagina — geen aparte instelling.

---

## Betaalcyclus (grotendeels automatisch)

```
Maandag: nieuwe ISO-week begint
Ma t/m za 18:00: LottoSaldo dekt automatisch (indien toereikend), anders: betaal via Tikkie → meld in app
Vrijdag 09:00: automatische push-herinnering (alleen wie deze week nog open staat)
Zaterdag 18:00: betalen geblokkeerd
Zaterdag 19:30: beheerder krijgt push "uitslag invoeren"
Zaterdag avond: trekking verwerkt → resultaten, push
→ Nieuwe week aangemaakt: LottoSaldo-check per lid, anders 'open' betaling
Zondag: geblokkeerd tot maandag
```

⚠️ **Bekende beperking**: `onBetalingenAanmaken` maakt alleen een betaaldocument aan voor leden die op dat moment al ≥1 ticket hebben. Beheerder-dashboard signaleert dit correct, maar er is nog geen automatische backfill.

---

## KRITIEKE ARCHITECTUURREGELS

### 1. Geen orderBy in Firestore queries
**NOOIT `orderBy()` gebruiken.** Vereist een composite index; zonder index: stille lege array. Trof al `betalingen`, `resultaten` (ranglijst), en de inmiddels **verwijderde** `rondes`-collectie (`subscribeRondes` had dezelfde bug — nog een reden waarom die opruiming terecht was).

```javascript
// ❌ FOUT
const q = query(collection(db, 'betalingen'), orderBy('aangemaakt', 'desc'));
// ✅ CORRECT — sorteer client-side
const q = query(collection(db, 'betalingen'));
betalingen.sort((a, b) => (b.aangemaakt?.toMillis() ?? 0) - (a.aangemaakt?.toMillis() ?? 0));
```
Meerdere `==`-filters op verschillende velden zijn wél veilig zonder composite index.

### 2. ISO-8601 weekberekening
Maandag t/m zondag. Identiek in `lib/firestore-payments.ts` (`huidigTrekkingWeek`) en `functions/src/index.ts` (`getTrekkingWeek`).

### 3. Data-only FCM payload
Nooit top-level `notification` veld.

### 4. kasSaldo nooit opslaan
Altijd `berekenKasSaldo(kasmutaties)`.

### 5. Controle-engine identiek
`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` altijd byte-voor-byte identiek. Pure functie — geen Firestore, geen React.

### 6. Cumulatieve matching
- `nummersGoed` = nieuw deze trekking · `matchedNumbers` = cumulatief · `aantalGoed` = `matchedNumbers.length` · `punten` op basis van `nummersGoed.length`, nooit cumulatief.
- **Handmatige Firestore-veldmappings zijn een terugkerende bronfout** — `matchedNumbers`, en later `lottoSaldo`/`lottoSaldoIntroSeen`, zijn elk minstens één keer vergeten in een manuele mapping (`lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`, `lib/firestore-trekkingen.ts`). **Check bij elk nieuw veld op `User`/`Resultaat` of het overal waar dat type handmatig gemapt wordt, ook echt is toegevoegd.**

### 7. Herberekenen in plaats van migratiescripts
`herberekenSpeelreeks` (Beheer → Prijzen): herberekent alleen de huidige speelreeks, `ranglijstPunten` altijd hard herberekend als som (nooit delta — dat bleek te kunnen driften bij herhaald aanroepen), filtert correct op betalers per specifieke week.

### 8. Geen alternatieve spelmodi
`PrijsConfig` bewust volledig verwijderd.

### 9. Firestore rules: repo en productie kunnen driften — controleer altijd de live regels
De `firestore.rules` in de repo bleek een tijd lang **niet** overeen te komen met wat er daadwerkelijk in Firebase actief stond (handmatig via Console gewijzigd, nooit teruggesynchroniseerd). Sinds 23 juli deployt `.github/workflows/deploy-firestore-rules.yml` de repo-versie automatisch bij elke push die `firestore.rules` raakt — dat voorkomt nieuwe drift, maar **vertrouw bij twijfel niet blind op de repo** voor historische/externe wijzigingen.

De service-account voor deze workflow heeft de IAM-rol **Firebase Rules Admin** (`roles/firebaserules.admin`) nodig naast de rollen die al voor Functions-deploys bestonden — zonder die rol faalt de deploy met `403` op `firebaserules.googleapis.com`.

`/users/{userId}` heeft sinds de LottoSaldo-bouw een extra, veld-beperkte uitzondering: kashouder/beheerder mogen `lottoSaldo` van een ander lid wijzigen (`hasOnly(['lottoSaldo'])`), beheerder mag daarnaast `rol` wijzigen. Geen brede "mag alles van iedereen"-regel.

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
  trekkingWeek, tikkieGeopend, isSaldoStorting, aangemaakt,
  bevestigd, bevestigdDoor

/kasmutaties/{id}
  bedrag, type, omschrijving, datum, userId, betalingId
```

**Verwijderd (23 juli)**: de `rondes`-collectie en bijbehorende code (`Ronde`-interface, `subscribeRondes`, `maakRonde` in `lib/firestore-seizoenen.ts`, de Firestore-rule) zijn volledig opgeruimd — nooit afgemaakt/aangesloten, nergens gebruikt, bevatte zelf een `orderBy()`-bug. Het losse `rondeId`-veld op oudere `Trekking`/`Resultaat`-documenten kan nog voorkomen maar wordt nergens gelezen.

**Verwijderd (eerder)**: `/prijsConfig/default` wordt niet meer gelezen/geschreven.

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking | Cumulatieve controle-engine, resultaten, punten, push |
| `onBetalingBevestigd` | Betaling → betaald | Push naar lid |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar wie deze week nog open staat |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | Nieuwe week: LottoSaldo-check per lid (automatisch afboeken of 'open' aanmaken) |
| `onTikkieLinkVerval` | Wekelijks | Push naar beheerders als Tikkie-link 12+ dagen oud is (tijd-gebaseerde inschatting, geen echte detectie — geen Tikkie-API-toegang) |
| `herberekenSpeelreeks` | Callable, alleen beheerder | Herberekent de huidige speelreeks volledig opnieuw |

`getStandaardInleg()` en `getSpelConfig()` zijn interne helpers (niet los aanroepbaar) die de actuele instellingen live uit Firestore lezen, met fallback.

---

## Pagina's

| Route | Rol |
|---|---|
| `/dashboard` | Lid — confetti winnaar-scherm, cumulatieve bal-highlighting |
| `/betalen` | Lid — **LottoSaldo als primaire flow** ("Saldo opwaarderen" prominent, wekelijkse €-betaling als kleinere secundaire optie), eenmalige uitlegbanner |
| `/trekkingen` | Lid+ — invoer modal |
| `/trekkingen/[id]` | Lid+ — cumulatieve/nieuwe kleurcodering, niet-betaald-balk |
| `/deelnemers`, `/spelregels`, `/help` | Lid — bereikbaar via Profiel → Informatie, bedragen dynamisch |
| `/profiel` | Lid — eigen LottoSaldo met kleurindicator, naam, ticket, notificaties |
| `/kas` | Alle rollen — alleen-lezen kasoverzicht |
| `/kashouder` | Kashouder — "✓ Betaald"-knop nu saldo-bewust + voorkomt dubbele boeking |
| `/kashouder/financieel` | Kashouder + Beheerder — kas-uitsplitsing, LottoSaldo-overzicht + storten, saldo-correctie (beheerder-only) |
| `/leden` | Kashouder+ — rollen beheren |
| `/beheerder` | Beheerder — dashboard |
| `/beheerder/admin` | Beheerder — **Instellingen nu echt bewerkbaar** (Naam vereniging, Standaard inleg, Kashouder-lookup), Spel, Prijzen (herbereken-knop), Seizoen |
| `/ranglijst`, `/hall-of-fame` | Alle rollen — nieuwe-matches-per-trekking, niet cumulatief |
| `/offline`, `/serwist/[path]` | PWA-ondersteuning, geen UI |

---

## STATUS PER 23 JULI 2026

### Volledig werkend ✅
- LottoSaldo-systeem volledig: storten, automatische wekelijkse afboeking, verrekening bij bevestiging, lage-saldo-meldingen, kas-uitsplitsing, correctietool
- Vereniging-instellingen (Naam, Standaard inleg) écht bewerkbaar, overal dynamisch doorgevoerd inclusief Cloud Function
- Kashouder-"✓ Betaald"-knop voorkomt dubbele boekingen en is saldo-bewust
- Firestore rules gesynchroniseerd met productie, automatische deploy-workflow werkend (incl. de benodigde IAM-rol)
- `rondes`-collectie volledig opgeruimd
- Cumulatieve "6 goed is winnaar"-spelmodus, `herberekenSpeelreeks`, rol-afhankelijke navigatie — allemaal nog steeds werkend zoals eerder bevestigd

### Openstaand ⏳
- Eerste **live, automatische** LottoSaldo-afboeking nog niet gezien (moet gebeuren bij de eerstvolgende trekking na een geldige storting)
- Backfill voor leden die een ticket toevoegen ná het aanmaken van de weekbetalingen
- Nog geen automatische tests — alles handmatig geverifieerd tegen productiedata
- `firestore.rules` in de repo is nu gesynchroniseerd met productie, maar er is geen manier om toekomstige handmatige Console-wijzigingen automatisch te detecteren — bij twijfel altijd de live Console-regels checken, niet blind op de repo vertrouwen

---

## Handige links
- Live: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase: console.firebase.google.com
- Google Cloud (IAM, Functions/Logs): console.cloud.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
- Wijzigingsgeschiedenis: [`docs/changelog.md`](docs/changelog.md)
