# LottoClub 🎱

Digitale lottovereniging app — Next.js 14, TypeScript, Tailwind CSS

## Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deploy**: Vercel
- **Auth + DB**: Firebase (Fase 1 — nog te koppelen)
- **Betalingen**: Mollie iDEAL (Fase 3)

## Snel starten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Vercel deploy

1. Push naar GitHub
2. Importeer repo in [vercel.com](https://vercel.com)
3. Klik Deploy — klaar

## Pagina's

| Route | Beschrijving |
|---|---|
| `/` | Login |
| `/dashboard` | Dashboard lid |
| `/profiel` | Persoonlijk profiel |
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

## Fases

- **Fase 0** ✅ UI Prototype (HTML)
- **Fase 0b** ✅ Next.js structuur (dit project)
- **Fase 1** 🔜 Firebase Auth + Firestore
- **Fase 2** 🔜 Ledenbeheer + seizoenen
- **Fase 3** 🔜 Mollie iDEAL
- **Fase 4** 🔜 Trekkingen automatisch
- **Fase 5** 🔜 Ranglijst + Hall of Fame live
- **Fase 6** 🔜 Push notificaties
