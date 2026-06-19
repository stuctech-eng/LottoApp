# LottoClub 🎱

Digitale lottovereniging app — Next.js 14, TypeScript, Tailwind CSS, Firebase

## Live
🌐 https://lotto-app-eight-chi.vercel.app

## Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind + custom CSS (1-op-1 uit HTML prototypes)
- **Language**: TypeScript
- **Auth + DB**: Firebase (Auth + Firestore)
- **Deploy**: Vercel (auto-deploy via GitHub)
- **Workflow**: iPhone → Working Copy → GitHub → Vercel
- **Betalingen**: provider-architectuur — `offline` (actief, MVP) + `mollie` (stub, klaar voor activatie)

## Authenticatie
Drie inlogmethoden actief en getest op iPhone:
- ✅ Email + wachtwoord (login + registratie)
- ✅ Wachtwoord vergeten (reset via email)
- ✅ Magic link (passwordless via email)
- ✅ Google Sign-In (via redirect, werkt op mobiele Safari)
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
```

Schema voor toekomstige fases staat al klaar in `lib/types.ts`
(Seizoen, Ronde, Betaling, Trekking, Kasmutatie, SpelConfig, PrijsConfig) —
collecties worden pas aangemaakt zodra de bijbehorende beheerflow bestaat
(Fase 3-5), om lege placeholder-data te voorkomen.

Security rules: `firestore.rules` — ingelogde users mogen alles lezen, alleen eigen documenten schrijven.

## Rollen & toegang (Fase 2B)
- **Lid**: `/dashboard`, `/profiel`, `/trekkingen`, `/ranglijst`, `/kas`, `/betalen`
- **Kashouder**: + `/kashouder`, `/kashouder/financieel`, `/leden`
- **Beheerder**: + `/beheerder`, `/beheerder/admin`, `/leden` (incl. rollen wijzigen)

`/dashboard` is een rol-router: kashouder → `/kashouder`, beheerder → `/beheerder`, lid → eigen dashboard.
Route-toegang wordt afgedwongen via `ProtectedRoute` met `allowedRoles`. Bij ongeldige rol → redirect naar `/dashboard`.

**Rollen wijzigen**: beheerder kan op `/leden` de rol van elk lid direct aanpassen via een dropdown (lid/kashouder/beheerder). Elke wijziging wordt gelogd in `/auditLog` (`rol_gewijzigd`).

**Systeemvoorwaarde — altijd minstens 1 beheerder**: het wijzigen van de rol van de **laatste beheerder** naar iets anders wordt geblokkeerd met een waarschuwing. Dit voorkomt dat het systeem onbestuurbaar wordt (geen enkele beheerder meer over om rollen te wijzigen). Wijs eerst een andere gebruiker aan als beheerder voordat je de huidige laatste beheerder demote.

⚠️ **Eenmalige bootstrap**: de allereerste beheerder moet handmatig via Firebase Console → Firestore → `users/{uid}` → `rol: "beheerder"` ingesteld worden (er is nog niemand om dit via de app te doen). Daarna geldt de bovenstaande bescherming en is Firebase Console niet meer nodig voor rolbeheer.

## Tickets (Fase 2C)
Elk lid beheert eigen lotto-tickets via `/profiel`:
- Ticket toevoegen, bewerken, verwijderen
- Validatie: 7 unieke nummers, 1-45 (zie `lib/constants.ts`)
- **Aanname**: ticket-validatie (6 nummers, 1-45) is nu live uit `/spelConfig` in Firestore (Fase 4 ✅).

## Pagina's

| Route | Beschrijving |
|---|---|
| `/` | Login (email/wachtwoord, magic link, Google) |
| `/dashboard` | Dashboard lid |
| `/profiel` | Persoonlijk profiel + uitloggen |
| `/trekkingen` | Trekking overzicht |
| `/trekkingen/[id]` | Trekking detail |
| `/ranglijst` | Seizoen ranglijst |
| `/hall-of-fame` | Hall of Fame |
| `/kas` | Kasboek |
| `/betalen` | iDEAL betaalflow |
| `/leden` | Ledenbeheer |
| `/kashouder` | Kashouder dashboard |
| `/kashouder/financieel` | Financieel beheer |
| `/beheerder` | Beheerder dashboard |
| `/beheerder/admin` | Admin paneel |

## Voortgang

- **Fase 0** ✅ UI Prototype (14 HTML schermen)
- **Fase 0b** ✅ Next.js structuur gebouwd
- **Fase 0c** ✅ Live op Vercel + styling 1-op-1 prototypes
- **Fase 1** ✅ Firebase Auth volledig getest op iPhone (email/wachtwoord, wachtwoord-vergeten, magic link, Google redirect, uitloggen, beveiligde routes) + Firestore
- **Fase 2** ✅ Echte ledendata uit Firestore (2A) + rol-gebaseerde routing/toegang (2B) + ticketbeheer per lid (2C). Schema voor seizoenen/rondes/trekkingen/kas/uitbetalingen/Hall of Fame staat klaar in `types.ts`, nog niet aan UI gekoppeld.
- **Fase 3** ✅ Provider-architectuur betalingen (`offline` actief, `mollie` stub) + WhatsApp-provider + `/betalingen`, `/kasmutaties`, `/auditLog`, `/paymentConfig` (Firestore)
- **Fase 4** ✅ SpelConfig + PrijsConfig uit Firestore, seizoenen aanmaken/afsluiten, trekkingen invoeren, controle-engine (pure functie, platform-onafhankelijk), resultaten per ticket per ronde, ranglijstpunten automatisch bijgewerkt
- **Fase 5** ✅ Ranglijst + Hall of Fame live data (ranglijstPunten, resultaten, all-time records uit Firestore)
- **Fase 6** ✅ Cloud Functions (server-side), push notificaties, GitHub Actions CI/CD, FCM tokens

## Push Notificaties — Firebase Cloud Messaging (Fase 6)

### Hoe het werkt

```
Beheerder voert trekking in
  ↓ Firestore /trekkingen (verwerkt: false)
  ↓ Cloud Function onTrekkingVerwerkt getriggerd
  ↓ Controle-engine berekent resultaten
  ↓ FCM token ophalen uit /users/{uid}/fcmTokens
  ↓ Push notificatie verstuurd via Firebase Admin SDK
  ↓ Notificatie verschijnt op vergrendeld iPhone scherm
```

### Vereisten

**iOS Push Notificaties werken ALLEEN als:**
1. De app is geïnstalleerd als PWA (via Safari → Deel → "Zet op beginscherm")
2. De gebruiker toestemming heeft gegeven in de app
3. De VAPID key correct is ingesteld (publieke sleutel, begint met `B`)

**Niet via gewone Safari browser** — alleen via het beginscherm-icoon (standalone PWA).

### Setup checklist

- [x] VAPID key genereren: Firebase Console → ⚙️ → Project Settings → Cloud Messaging → Web Push certificates → **Key pair** (publiek, begint met `B`)
- [x] VAPID key opslaan in Vercel: `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (niet sensitive)
- [x] Firestore rules voor `fcmTokens` subcollectie aanwezig
- [x] `public/firebase-messaging-sw.js` aanwezig (service worker)
- [x] App geïnstalleerd als PWA op beginscherm

### Veelgemaakte fout — VAPID key

```
❌ Fout: "Show private key" kopiëren → begint NIET met 'B' → getToken() faalt
✅ Goed: "Key pair" kopiëren → begint met 'B' → werkt correct
```

Foutmelding als VAPID key ongeldig is:
```
applicationServerKey must contain a valid P-256 public key
```

### FCM Diagnostiek pagina

De app bevat een ingebouwde diagnostiek pagina: `/debug-fcm`

**Alleen toegankelijk via PWA** (beginscherm-icoon), niet via Safari.

Toont stap voor stap:
1. User ID (ingelogd?)
2. Notification.permission (granted/denied/default)
3. Standalone modus (PWA of Safari?)
4. PushManager beschikbaar?
5. VAPID key aanwezig?
6. Toestemming na request
7. Service Worker geregistreerd
8. Firestore write test (los van FCM)
9. getToken() resultaat
10. Token opgeslagen in Firestore

**Gebruik bij problemen:** open `/debug-fcm` → "Start diagnostiek" → screenshot → diagnose in één oogopslag.

### Firestore structuur FCM tokens

```
/users/{userId}/fcmTokens/{token}
  token: "dxZsO9D0d0HZMSMMcmkgcw:APA91b..."
  platform: "ios"
  aangemaakt: Timestamp
  actief: true
```

Meerdere apparaten per gebruiker worden ondersteund — elk apparaat heeft zijn eigen token document.

### Push payload — DATA-ONLY (sinds 19 juni, bugfix dubbele notificatie)

**Belangrijke architectuurregel:** Cloud Functions sturen push-payloads **altijd alleen via `data`**, nooit via een top-level `notification`-veld.

Reden: een top-level `notification`-veld in het FCM-payload laat de browser/OS **automatisch** een notificatie tonen. Omdat `firebase-messaging-sw.js` in `onBackgroundMessage` ZELF ook `self.registration.showNotification()` aanroept, zorgde de combinatie van beide voor **2x dezelfde notificatie** per verzonden bericht (bevestigd: 1 token, 1 functie-invocatie, toch 2 meldingen op het scherm — root cause gevonden in Cloud Logging + service worker code, 19 juni).

```javascript
// ✅ Goed — alleen data, service worker toont 1x
await messaging.sendEachForMulticast({
  tokens,
  data: { title, body, ...extra },
  webpush: { fcmOptions: { link: '/' } },
});

// ❌ Fout — top-level notification + eigen showNotification() = dubbel
await messaging.sendEachForMulticast({
  tokens,
  notification: { title, body },  // FCM toont automatisch...
  webpush: { notification: { ... } },
});
// ...en service worker toont via showNotification() óók nog een keer
```

Geldt voor alle drie notificatie-typen via de gedeelde `sendToTokens()`-helper: `betalingBevestigd`, `trekkingResultaten`, `herinneringen`.

### Service Worker versie

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
```

⚠️ Gebruik Firebase versie **11.10.0 of hoger** — versie 10.0.0 heeft iOS token problemen.

## Firebase setup (uitgevoerd)
- Project: `lottoclub`
- Authentication: Email/Password, Email link, Google — alle 3 actief
- Firestore: eur3 (europe-west), test mode
- Web app geregistreerd, config in `lib/firebase.ts`

## Betalingen & Kas (Fase 3)

**Provider-architectuur** (`lib/providers/payments/`, `lib/providers/notifications/`):
- `offline` (actief): lid meldt betaling → kashouder bevestigt → kasmutatie + auditLog
- `mollie` (stub, niet actief): klaar voor activatie zodra Mollie API-key beschikbaar is — vereist server-side API-route + webhook (niet gebouwd)
- `tikkie`/`stripe`/`incasso`: placeholders, nog niet geïmplementeerd
- `whatsapp` notificatie-provider: genereert `wa.me`-links (geen Business API, geen kosten)

**Firestore collecties (nieuw):**
```
/betalingen/{id}     — bedrag, omschrijving, provider, status, userId
/kasmutaties/{id}    — bedrag (+ of −), type, datum, omschrijving
/auditLog/{id}       — actie, omschrijving, userId, datum
/paymentConfig/main  — activeProvider + per-provider enabled (valt terug op
                        DEFAULT_PAYMENT_CONFIG als doc niet bestaat)
```

**Belangrijke regel:** `kasSaldo` wordt nooit opgeslagen — altijd `som(kasmutaties.bedrag)`, zie `berekenKasSaldo()` in `lib/firestore-payments.ts`.

**Flow (offline, huidige MVP):**
1. Lid → `/betalen` → "Ik heb betaald €4" → Betaling met status `verificatie`
2. Kashouder → `/kashouder/financieel` → "Te verifiëren betalingen" → ✓ bevestigen
3. Bevestiging schrijft kasmutatie (+€4, type `inleg`) + auditLog-entry
4. `/kas` toont live kasSaldo + kasboek

**WhatsApp herinneringen**: kashouder kan via `/kashouder/financieel` een vooraf ingevuld WhatsApp-bericht openen naar leden met een telefoonnummer (in te stellen via `/profiel`).

**Mollie activeren (toekomst):** zet in Firestore `/paymentConfig/main`:
```
activeProvider: "mollie"
providers.mollie.enabled: true
```
plus een server-side API-route + webhook (Fase 3D, nog te bouwen zodra API-key beschikbaar is).

## Audit log (Fase 3E)
Actief gelogd: `gebruiker_aangemaakt`, `ticket_toegevoegd/gewijzigd/verwijderd`, `betaling_gemeld/bevestigd/afgewezen`, `uitbetaling_geregistreerd`, `kascorrectie`.
Gedefinieerd maar nog niet getriggerd (wachten op Fase 4/5 UI): `gebruiker_verwijderd`, `rol_gewijzigd`, `trekking_ingevoerd/gewijzigd`, `seizoen_gestart/gesloten`.
Zichtbaar in `/beheerder/admin` → tab "Audit log".


## Belangrijke opmerking voor volgende fase
Firestore staat nog in **test mode** — dit verloopt na 30 dagen of moet handmatig naar de rules in `firestore.rules`. `firestore.rules` is al uitgebreid met rollen-checks voor `/betalingen`, `/kasmutaties`, `/auditLog`, `/paymentConfig` — controleer of deze in de Firebase Console actief staan vóór test-mode verloopt.

## Trekkingen & Controle-engine (Fase 4)

**Architectuurregel:**
> *Alle berekeningen die invloed hebben op geld, winnaars of ranglijsten draaien server-side (toekomst: Cloud Functions). De controle-engine is gebouwd as pure functie zonder Firestore/React/Next.js afhankelijkheden zodat migratie later kosteloos is.*

**`lib/controle-engine.ts`** — pure functie:
```
verwerkTrekking({ trekking, deelnemers, spelConfig, prijsConfig })
→ { resultaten, winnaars, ranglijstUpdates }
```

**Nieuwe Firestore collecties:**
```
/spelConfig/default    — naam, aantalGetallen, minGetal, maxGetal, bonusBal
/prijsConfig/default   — modus: hoogste_score_wint | meerdere_winnaars | vaste_prijzen
/seizoenen/{id}        — naam, startDatum, eindDatum, status
/rondes/{id}           — seizoenId, nummer, inleg, status (nog niet in UI gekoppeld)
/trekkingen/{id}       — nummers[], bonusBal, seizoenId, verwerkt, ingevoerdDoor
/resultaten/{id}       — userId, ticketId, aantalGoed, nummersGoed, isWinnaar, punten
```

**Flow:**
1. Beheerder voert nummers in → `/trekkingen` → "+ Invoeren"
2. Controle-engine vergelijkt alle tickets van alle actieve leden
3. Resultaten worden atomisch opgeslagen (Firestore batch)
4. RanglijstPunten per user automatisch bijgewerkt (`increment`)
5. AuditLog entry aangemaakt

**Stap 2 (toekomst):** zelfde controle-engine naar Firebase Cloud Functions verplaatsen. Vereist Blaze plan — acceptabel zodra echte leden meedoen.

## Bekende aandachtspunten (Fase 4)
- Rondes zijn nog niet gekoppeld aan trekkingen in de UI — trekking wordt direct onder een seizoen gezet zonder expliciete ronde-selectie. Wordt gekoppeld in Fase 5/6 wanneer betalingen per ronde nodig zijn.

- Aanname over validatie ticket-nummers (6 uit 45) is nu vervangen door live spelConfig uit Firestore.
- Eerste account dat je aanmaakt krijgt automatisch rol `lid`. Wil je jezelf als `beheerder` of `kashouder` instellen om die schermen te testen, pas dit handmatig aan in Firebase Console → Firestore → `users/{jouw-uid}` → veld `rol`.
- `/betalen` gebruikt een vaste `STANDAARD_INLEG` (€4, `lib/constants.ts`) — er bestaat nog geen "ronde" met eigen inlegbedrag (volgt in Fase 4).
- `mockUser`/`mockLeden` in `lib/mock-data.ts` worden nog gebruikt door `/trekkingen`, `/trekkingen/[id]`, `/ranglijst`, `/hall-of-fame` — bewust niet aangepast, deze pagina's krijgen hun eigen Firestore-koppeling in Fase 4/5.
- WhatsApp-herinneringen werken alleen voor leden die een telefoonnummer hebben ingevuld via `/profiel`.

---

## STATUS PER 19 juni 2026 — WAAR WE NU MEE BEZIG ZIJN

### Volledig werkend en getest
- ✅ Fase 0-6 alle gebouwd en gepusht naar productie (`main` branch)
- ✅ Cloud Functions live: `onTrekkingVerwerkt`, `onBetalingBevestigd`, `onBetalingsHerinnering`
- ✅ GitHub Actions CI/CD werkt — push naar `main` deployt automatisch Cloud Functions + Vercel
- ✅ Push notificaties werken end-to-end bevestigd:
  - Trekking ingevoerd → "🎱 Trekking resultaten" notificatie ontvangen
  - Betaling bevestigd → "✅ Betaling bevestigd" notificatie ontvangen
- ✅ Tweede echt lid toegevoegd: Wim Kraaij (naast Dick Veerman als beheerder)
- ✅ "Laatste beheerder" safeguard werkt zichtbaar in `/leden`
- ✅ Modal trekking-invoer verbeterd: sluitknop (✕), auto-focus, auto-advance bij 2 cijfers, rode validatie-randen
- ✅ Beheerder-dashboard heeft nu ook "💳 Mijn inleg betalen" knop (kon eerst niet als beheerder zelf betalen)

### ✅ OPGELOST — 19 juni 2026: dubbele push notificatie bij betalingsbevestiging

**Probleem (gerapporteerd):** bij het bevestigen van een betaling kwamen er 2x dezelfde push notificatie binnen.

**Onderzoek (Guardian Mode — root cause analyse, geen quick fix):**
1. ✅ Gecontroleerd `users/{dick-uid}/fcmTokens` in Firestore Console → **slechts 1 token-document** → hypothese "meerdere geregistreerde tokens" weerlegd
2. ✅ Gecontroleerd Cloud Function logs in Google Cloud Logging voor `onBetalingBevestigd` rond testmoment (19 juni, ±09:11) → **functie 1x getriggerd** (1x `logger.info('Betaling bevestigd voor...')` regel, naast standaard cold-start logs) → hypothese "dubbele Firestore-write / dubbele trigger" weerlegd
3. ✅ Service worker code (`firebase-messaging-sw.js`) gecontroleerd → **root cause gevonden**:
   - Cloud Function stuurde een top-level `notification`-veld mee in het FCM-payload → FCM toont dit **automatisch**
   - Service worker's `onBackgroundMessage` riep **zelf ook** `self.registration.showNotification()` aan
   - Resultaat: 1 functie-aanroep, 1 token → 2 zichtbare notificaties (FCM automatisch + service worker handmatig)

**Fix toegepast (19 juni):**
- `functions/src/index.ts` → `sendToTokens()`: top-level `notification`-veld verwijderd, alles via `data` verstuurd (data-only payload)
- `public/firebase-messaging-sw.js` → `onBackgroundMessage` leest title/body nu uit `payload.data` i.p.v. `payload.notification`
- Geldt voor alle drie notificatie-typen (gedeelde `sendToTokens()`-helper): `betalingBevestigd`, `trekkingResultaten`, `herinneringen`
- Architectuurregel toegevoegd aan README (zie sectie "Push payload — DATA-ONLY")

**Risico van de fix:** LOW — alleen payload-formaat gewijzigd, geen Firestore-structuur/architectuur/UI-routes geraakt.

**✅ Bevestigd na deploy (19 juni):** 2x herhaalde test (betaling melden → bevestigen → telefoon vergrendeld) — beide keren precies 1x notificatie op het vergrendelscherm. Fix werkt, definitief afgesloten.

### Nog niet getest
- ❓ `onBetalingsHerinnering` (wekelijkse scheduled function, draait vrijdag 09:00) — nog nooit gecontroleerd of deze daadwerkelijk afgaat
- ❓ De FCM debug pagina (`/debug-fcm`) staat nog live in productie — beslissen of die blijft staan als ingebouwde tool of verwijderd wordt
- ❓ Node.js 20 → 22 upgrade voor Cloud Functions (deprecation warning in build logs, nog niet kritiek)
- ❓ Auto-advance in trekking-modal bij 1-cijferige getallen werkt niet helemaal goed op iOS (2-cijferige werkt wel) — bewust uitgesteld naar "volgende stap", nooit opgepakt
- ❓ **Nieuw, 19 juni:** Google Sign-In fix (zie hieronder) nog te bevestigen via `/debug-auth` na deploy — eerstvolgende sessie

### 🔧 FIX TOEGEPAST, NOG TE BEVESTIGEN — 19 juni 2026: Google Sign-In faalt stil in standalone PWA

**Probleem (gerapporteerd):** bij inloggen met Google in de PWA (beginscherm-icoon) doorloop je Google's eigen inlogscherm volledig, maar je komt daarna terug op het gewone LottoClub inlogscherm — alsof er niets gebeurd is. Geen zichtbare foutmelding.

**Root cause:** `loginWithGoogle()` gebruikte `signInWithRedirect()`, wat een volledige paginanavigatie naar Google vereist. In een standalone iOS PWA verliest die navigatie regelmatig de sessie/storage-context, waardoor `getRedirectResult()` bij terugkomst niets vindt. De fout werd alleen naar `console.error` gelogd — onzichtbaar voor de gebruiker, dus de login "faalde stil."

**Fix toegepast (19 juni):**
- `lib/auth-context.tsx` → nieuwe `isStandalonePwa()` detectie (via `window.navigator.standalone` en `matchMedia('(display-mode: standalone)')`)
- `loginWithGoogle()`: in standalone PWA → `signInWithPopup()` (blijft binnen dezelfde JS-context, geen navigatie-verlies). In gewone Safari → ongewijzigd `signInWithRedirect()` (werkte daar al goed, README bevestigt dit)
- Nieuwe `googleSignInError` state + `clearGoogleSignInError()` toegevoegd aan `AuthContextType`, zodat een mislukte Google-login niet langer stil verdwijnt in de console
- Nieuwe diagnostiek pagina **`/debug-auth`** (alleen relevant via PWA): toont auth-status, standalone-detectie resultaat, en heeft een "Test Google login" knop met live logging

**Impact:** LOW-MEDIUM — raakt alleen `loginWithGoogle()` en de redirect-`useEffect` in `auth-context.tsx`. Email/wachtwoord/magic-link ongewijzigd.

**⏳ Nog te bevestigen na deploy:**
1. Google-login testen via PWA (beginscherm-icoon) — moet nu via popup gaan i.p.v. terugvallen op inlogscherm
2. Google-login testen via gewone Safari — moet ongewijzigd blijven werken (redirect-pad)
3. `/debug-auth` openen via PWA → "Start diagnostiek" → controleren of "Standalone PWA modus: ja" verschijnt


### Handige links/IDs voor volgende sessie
- Live app: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp (branch: main is productie, develop bestaat ook maar wordt nauwelijks gebruikt)
- Firebase project: `lottoclub` (project nummer 455488693325)
- Test-gebruikers: Dick Veerman (beheerder, t.e.veerman@ziggo.nl), Wim Kraaij (lid)
