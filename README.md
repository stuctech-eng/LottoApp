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
- **Aanname/ONBEVESTIGD**: deze validatie is gebaseerd op de bestaande mock-tickets, niet op een live spelConfig. Wordt in Fase 4 vervangen door een query op `/spelConfig`.

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
- **Fase 4** 🔜 Seizoenen, rondes, trekkingen + controle-engine (Firestore), spelConfig live — koppelt betalingen aan rondes
- **Fase 5** 🔜 Ranglijst + Hall of Fame + statistieken (Firestore)
- **Fase 6** 🔜 Notificaties + afwerking

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

## Bekende aandachtspunten (Fase 3)
- Eerste account dat je aanmaakt krijgt automatisch rol `lid`. Wil je jezelf als `beheerder` of `kashouder` instellen om die schermen te testen, pas dit handmatig aan in Firebase Console → Firestore → `users/{jouw-uid}` → veld `rol`.
- `/betalen` gebruikt een vaste `STANDAARD_INLEG` (€4, `lib/constants.ts`) — er bestaat nog geen "ronde" met eigen inlegbedrag (volgt in Fase 4).
- `mockUser`/`mockLeden` in `lib/mock-data.ts` worden nog gebruikt door `/trekkingen`, `/trekkingen/[id]`, `/ranglijst`, `/hall-of-fame` — bewust niet aangepast, deze pagina's krijgen hun eigen Firestore-koppeling in Fase 4/5.
- WhatsApp-herinneringen werken alleen voor leden die een telefoonnummer hebben ingevuld via `/profiel`.
