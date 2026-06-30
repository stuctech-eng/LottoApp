# LottoClub 🎱

Digitale lottovereniging app — Next.js 15, TypeScript, Tailwind CSS, Firebase

## Live
🌐 https://lotto-app-eight-chi.vercel.app

## Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind + custom CSS (1-op-1 uit HTML prototypes)
- **Language**: TypeScript
- **Auth + DB**: Firebase (Auth + Firestore)
- **Deploy**: Vercel (auto-deploy via GitHub)
- **Workflow**: iPhone → Working Copy → GitHub → Vercel
- **Betalingen**: provider-architectuur — `offline` (actief, MVP) + `mollie` (stub, klaar voor activatie)

## Authenticatie
Vijf inlogmethoden actief en getest op iPhone:
- ✅ Email + wachtwoord (login + registratie)
- ✅ Wachtwoord vergeten (reset via email)
- ✅ Magic link (passwordless via email) — useRef-guard fix toegepast (29 juni)
- ✅ Google Sign-In — popup in standalone PWA, redirect in gewone Safari (fix toegepast 19 juni)
- ✅ Uitloggen
- ✅ Beveiligde routes (niet ingelogd = redirect naar `/`)

Bij registratie/eerste Google login wordt automatisch een gebruikersdocument aangemaakt in Firestore (`/users/{uid}`) met rol `lid`.

## Firestore structuur (huidig)
```
/users/{uid}
  - naam: string
  - email: string
  - foto: string | null
  - rol: 'lid' | 'kashouder' | 'beheerder'
  - tickets: { id, naam, nummers[] }[]
  - lidSinds: Timestamp
  - ranglijstPunten: number
  - actief: boolean
  - telefoon?: string
  - notificationSettings?: NotificationSettings

/spelConfig/default
  - naam, aantalGetallen, minGetal, maxGetal, bonusBal

/prijsConfig/default
  - modus: hoogste_score_wint | meerdere_winnaars | vaste_prijzen

/paymentConfig/main
  - activeProvider: string
  - providers: { [id]: { enabled: boolean } }
  - tikkieLink?: string   ← nieuw, 29 juni

/seizoenen/{id}
  - naam, startDatum, eindDatum, status

/trekkingen/{id}
  - nummers[], bonusBal, seizoenId, verwerkt, ingevoerdDoor

/resultaten/{id}
  - userId, ticketId, aantalGoed, nummersGoed, isWinnaar, punten

/betalingen/{id}
  - bedrag, omschrijving, provider, status, userId, userNaam

/kasmutaties/{id}
  - bedrag (+ of −), type, datum, omschrijving

/auditLog/{id}
  - actie, omschrijving, userId, datum
```

Security rules: `firestore.rules` — ingelogde users mogen alles lezen, alleen eigen documenten schrijven.

## Rollen & toegang
- **Lid**: `/dashboard`, `/profiel`, `/trekkingen`, `/ranglijst`, `/hall-of-fame`, `/kas`, `/betalen`
- **Kashouder**: + `/kashouder`, `/kashouder/financieel`, `/leden`
- **Beheerder**: + `/beheerder`, `/beheerder/admin`, `/leden` (incl. rollen wijzigen), trekking invoeren

`/dashboard` is een rol-router: kashouder → `/kashouder`, beheerder → `/beheerder`, lid → eigen dashboard.

**Systeemvoorwaarde:** altijd minimaal 1 beheerder. Laatste beheerder kan niet gedemote worden.

**Bootstrap:** eerste beheerder handmatig instellen via Firebase Console → Firestore → `users/{uid}` → `rol: "beheerder"`.

## Pagina's

| Route | Beschrijving | Rol |
|---|---|---|
| `/` | Login | Iedereen |
| `/dashboard` | Rol-router naar juist dashboard | Ingelogd |
| `/profiel` | Profiel + tickets + notificaties | Lid+ |
| `/trekkingen` | Trekking overzicht + invoer | Lid+ (invoer: beheerder) |
| `/trekkingen/[id]` | Trekking detail + resultaten | Lid+ |
| `/ranglijst` | Seizoen ranglijst | Lid+ |
| `/hall-of-fame` | All-time records | Lid+ |
| `/kas` | Kasboek | Lid+ |
| `/betalen` | Betaalflow | Lid+ |
| `/leden` | Ledenbeheer + rollen | Kashouder+ |
| `/kashouder` | Kashouder dashboard (live) | Kashouder+ |
| `/kashouder/financieel` | Financieel beheer + WhatsApp | Kashouder+ |
| `/beheerder` | Beheerder dashboard (live) | Beheerder |
| `/beheerder/admin` | Admin paneel | Beheerder |
| `/debug-fcm` | FCM diagnostiek (PWA only) | Ingelogd |
| `/debug-auth` | Auth diagnostiek (PWA only) | Ingelogd |

## Cloud Functions

| Functie | Trigger | Wat doet het |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking in Firestore | Controle-engine, resultaten opslaan, push naar alle leden |
| `onBetalingBevestigd` | Betaling status → 'betaald' | Push notificatie naar lid |
| `onBetalingsHerinnering` | Elke vrijdag 09:00 | Push herinnering naar leden met open betaling |
| `onTrekkingHerinnering` | Elke zaterdag 19:30 | Push herinnering naar beheerders om uitslag in te voeren |

**Runtime:** Node.js 22 (geüpgraded 29 juni, deadline was Oct 30 2026)

## Push Notificaties — Firebase Cloud Messaging

### DATA-ONLY PAYLOAD (architectuurregel, bugfix 19 juni)
Cloud Functions sturen push-payloads **altijd alleen via `data`**, nooit via een top-level `notification`-veld. Een top-level `notification`-veld laat FCM automatisch een notificatie tonen, wat samen met `showNotification()` in de service worker dubbele meldingen veroorzaakte.

```javascript
// ✅ Correct
sendEachForMulticast({ tokens, data: { title, body }, webpush: { fcmOptions } })

// ❌ Fout — geeft dubbele notificatie
sendEachForMulticast({ tokens, notification: { title, body }, webpush: { notification } })
```

### iOS vereisten
- iOS 16.4+
- PWA geïnstalleerd via Safari → Deel → "Zet op beginscherm"
- App geopend via beginscherm-icoon (NIET Safari browser)
- Toestemming gegeven in app

### VAPID key
Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → **Key pair** (begint met `B`, NIET "Show private key")

### FCM token structuur
```
/users/{userId}/fcmTokens/{token}
  token: string
  platform: "ios"
  aangemaakt: Timestamp
  actief: true
```

### Service Worker versie
Firebase **11.10.0 of hoger** — versie 10.x heeft iOS token problemen.

## Betalingen & Kas

**Provider-architectuur** (`lib/providers/payments/`):
- `offline` (actief): lid meldt → kashouder bevestigt → kasmutatie + auditLog + push
- `mollie` (stub): klaar voor activatie zodra API-key beschikbaar
- `tikkie`/`stripe`/`incasso`: placeholders

**Tikkie-link:** beheerder stelt eenmalig in via `/beheerder/admin` → tab Instellingen → "Tikkie-link". Wordt automatisch opgenomen in WhatsApp-herinneringen.

**Regel:** `kasSaldo` wordt NOOIT opgeslagen — altijd `berekenKasSaldo(kasmutaties)`.

**Flow:**
1. Lid betaalt via Tikkie/overboeking → meldt in app (`/betalen`)
2. Kashouder bevestigt (`/kashouder` of `/kashouder/financieel`)
3. Kasmutatie (+€X) + auditLog aangemaakt
4. Lid krijgt push: "✅ Betaling bevestigd"

**WhatsApp herinneringen:** kashouder stuurt via `/kashouder/financieel` → inclusief Tikkie-link als ingesteld in `/paymentConfig/main`.

## Trekkingen & Controle-engine

**Architectuurregel:** alle berekeningen server-side (Cloud Functions). Controle-engine is pure functie zonder Firestore/React afhankelijkheden.

**`lib/controle-engine.ts`:**
```
verwerkTrekking({ trekking, deelnemers, spelConfig, prijsConfig })
→ { resultaten, winnaars, ranglijstUpdates }
```

**Flow:**
1. Beheerder krijgt zaterdagse push-herinnering (19:30)
2. Opent `/trekkingen` → tikt "🔗 Officiële uitslag opzoeken" voor nummers
3. Voert nummers in → "+ Invoeren"
4. Cloud Function `onTrekkingVerwerkt` vergelijkt alle tickets
5. Resultaten atomisch opgeslagen, ranglijstpunten bijgewerkt
6. Push naar alle leden met hun persoonlijk resultaat

## Spelconfiguratie

Beheerbaar via `/beheerder/admin` → tab "Spel":
- Aantal getallen (standaard: 6)
- Min. getal (standaard: 1)
- Max. getal (standaard: 45)
- Bonusbal aan/uit

## Documentatie

- `README.md` — dit bestand, projectgeheugen voor Claude
- `HANDLEIDING.md` — gebruikershandleiding voor leden/kashouder/beheerder

## Firebase setup
- Project: `lottoclub` (projectnummer: 455488693325)
- Authentication: Email/Password, Email link, Google — alle 3 actief
- Firestore: eur3 (europe-west), test mode
- Web app config: `lib/firebase.ts`

## GitHub / Deploy
- Repo: `github.com/stuctech-eng/LottoApp`
- Branch `main` = productie
- GitHub Actions deployt automatisch Cloud Functions + Vercel bij push naar main

## Bekende aandachtspunten
- Firestore staat nog in **test mode** — verloopt na 30 dagen. `firestore.rules` is bijgewerkt met rollen-checks — controleer of die actief staan in Firebase Console vóór test-mode verloopt.
- Rondes zijn nog niet gekoppeld aan trekkingen in de UI — trekking wordt direct onder een seizoen gezet zonder expliciete ronde-selectie.

---

## STATUS PER 29 juni 2026

### Volledig werkend en getest
- ✅ Fase 0-6 gebouwd en in productie
- ✅ Cloud Functions live: `onTrekkingVerwerkt`, `onBetalingBevestigd`, `onBetalingsHerinnering`, `onTrekkingHerinnering` (nieuw)
- ✅ GitHub Actions CI/CD werkt
- ✅ Push notificaties werken end-to-end (dubbele notificatie bug opgelost 19 juni)
- ✅ Google Sign-In fix standalone PWA (19 juni)
- ✅ Magic link prompt fix useRef-guard (19 juni)
- ✅ Volledige regressietest alle 5 inlogmethodes (19 juni)
- ✅ onBetalingsHerinnering bevestigd werkend (26 juni, 09:00)
- ✅ Node.js 20 → 22 upgrade (29 juni)
- ✅ Tikkie-link instelling toegevoegd aan `/beheerder/admin` (29 juni)
- ✅ Tikkie-knop toegevoegd aan `/betalen` pagina (30 juni)
- ✅ Tikkie-link URL-validatie toegevoegd (30 juni) — voorkomt 404 door per ongeluk de hele Tikkie-berichttekst plakken i.p.v. alleen de URL
- ✅ Nieuwe prijsmodus "alle_goed_wint" toegevoegd als default (30 juni) — alleen winnen bij ALLE nummers goed, geen winnaar = rollover naar volgende ronde
- ✅ 1 ticket per persoon ingesteld (30 juni) — "+ Toevoegen" knop verdwijnt zodra een lid al 1 ticket heeft, voor gelijke kansen tussen leden

## Prijsmodus — belangrijk om te weten
Vier prijsmodi beschikbaar via `/beheerder/admin` → tab Prijzen:
- **🎯 Alleen alle nummers goed wint (standaard/default)** — winnen kan alleen met een volledig correct ticket (alle 6 nummers). Geen winnaar deze ronde → pot blijft staan (rollover).
- 🏆 Hoogste score wint — wie de meeste nummers goed heeft wint, ook bij een gedeeltelijke score
- 👥 Meerdere winnaars — iedereen boven een ingestelde minimumscore wint
- 💰 Vaste prijzen per score — vast bedrag per aantal goed

**Let op:** de DEFAULT_PRIJSCONFIG in code is aangepast naar `alle_goed_wint`, maar als er al een `/prijsConfig/default` document in Firestore staat met de oude waarde (`hoogste_score_wint`), moet dat APART handmatig aangepast worden via Firebase Console of via de admin-UI — de codewijziging overschrijft geen bestaand Firestore-document.
- ✅ Kashouder dashboard live data gekoppeld (29 juni)
- ✅ Beheerder dashboard live data gekoppeld (29 juni)
- ✅ Lotto uitslag link toegevoegd aan trekking-invoer modal (29 juni)
- ✅ Firestore cleanup uitgevoerd — app schoon voor echte leden

### Gebruikers (productie)
- Dick Veerman — beheerder (`t.e.veerman@ziggo.nl`)
- stuctech — lid (`stuctech@gmail.com`) — apart speel-account, bewust laten staan
- Wim Kraaij — lid

### Nog te doen / open punten
- ⏳ `onBetalingsHerinnering` vandaag (29 juni) niet gedraaid om 09:00 — reminder staat op 3 juli 09:15 om te bevestigen of dit eenmalig was of structureel
- ❓ `/debug-fcm` en `/debug-auth` staan live in productie — bewust gelaten als ingebouwde diagnostiek tools
- ❓ Firestore test mode verloopt — production rules activeren voor verloop
- ❓ Mollie activeren: zet in `/paymentConfig/main` `activeProvider: "mollie"` + bouw server-side API-route + webhook zodra API-key beschikbaar
- ❓ Rondes koppelen aan trekkingen in UI (voor betalingen per ronde)
- ❓ Auto-advance in trekking-modal bij 1-cijferige getallen werkt niet helemaal goed op iOS

### Handige links
- Live app: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase project: lottoclub (455488693325)
- Firebase Console: console.firebase.google.com
- Google Cloud Console: console.cloud.google.com
