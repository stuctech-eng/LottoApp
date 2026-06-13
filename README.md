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
- **Betalingen**: Mollie iDEAL (Fase 3 — nog te koppelen)

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
- **Beheerder**: + `/beheerder`, `/beheerder/admin`, `/leden`

`/dashboard` is een rol-router: kashouder → `/kashouder`, beheerder → `/beheerder`, lid → eigen dashboard.
Route-toegang wordt afgedwongen via `ProtectedRoute` met `allowedRoles`. Bij ongeldige rol → redirect naar `/dashboard`.

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
- **Fase 3** 🔜 Kas, betalingen, Mollie iDEAL, kasmutaties (Firestore)
- **Fase 4** 🔜 Seizoenen, rondes, trekkingen + controle-engine (Firestore), spelConfig live
- **Fase 5** 🔜 Ranglijst + Hall of Fame + statistieken (Firestore)
- **Fase 6** 🔜 Notificaties + afwerking

## Firebase setup (uitgevoerd)
- Project: `lottoclub`
- Authentication: Email/Password, Email link, Google — alle 3 actief
- Firestore: eur3 (europe-west), test mode
- Web app geregistreerd, config in `lib/firebase.ts`

## Belangrijke opmerking voor volgende fase
Firestore staat nog in **test mode** — dit verloopt na 30 dagen of moet handmatig naar de rules in `firestore.rules`. In Fase 3 (kas/betalingen) passen we de rules aan zodat alleen kashouder/beheerder kasmutaties en betalingen mogen schrijven, en lid alleen eigen betaling mag starten.

## Bekende aandachtspunten (Fase 2)
- Eerste account dat je aanmaakt krijgt automatisch rol `lid`. Wil je jezelf als `beheerder` of `kashouder` instellen om die schermen te testen, pas dit handmatig aan in Firebase Console → Firestore → `users/{jouw-uid}` → veld `rol`.
- `mockUser`/`mockLeden` in `lib/mock-data.ts` worden nog gebruikt door `/trekkingen`, `/trekkingen/[id]`, `/ranglijst`, `/hall-of-fame`, `/kas` — bewust niet aangepast, deze pagina's krijgen hun eigen Firestore-koppeling in Fase 4/5.
