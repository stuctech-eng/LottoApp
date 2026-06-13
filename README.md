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
  - naam
  - email
  - foto
  - rol: 'lid' | 'kashouder' | 'beheerder'
  - tickets: []
  - lidSinds
  - ranglijstPunten
  - actief
```

Security rules: `firestore.rules` — ingelogde users mogen alles lezen, alleen eigen documenten schrijven.

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
- **Fase 2** 🔜 Echte ledendata uit Firestore (i.p.v. mock data), seizoenen, rollen toepassen in UI
- **Fase 3** 🔜 Mollie iDEAL
- **Fase 4** 🔜 Trekkingen invoer/verwerking
- **Fase 5** 🔜 Ranglijst + Hall of Fame live data
- **Fase 6** 🔜 Push notificaties

## Firebase setup (uitgevoerd)
- Project: `lottoclub`
- Authentication: Email/Password, Email link, Google — alle 3 actief
- Firestore: eur3 (europe-west), test mode
- Web app geregistreerd, config in `lib/firebase.ts`

## Belangrijke opmerking voor volgende fase
Firestore staat nog in **test mode** — dit verloopt na 30 dagen of moet handmatig naar de rules in `firestore.rules`. In Fase 2 passen we de rules aan in de Firebase Console (Firestore Database → Rules tab) zodat rollen (lid/kashouder/beheerder) echt afgedwongen worden.
