# LottoClub 🎱

Digitale lottovereniging app — Next.js 15, TypeScript, Firebase

## Live
🌐 https://lotto-app-eight-chi.vercel.app

## Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Auth + DB**: Firebase (Auth + Firestore + Cloud Functions + FCM)
- **Deploy**: Vercel (auto-deploy via GitHub)
- **Workflow**: iPhone → Working Copy → GitHub → Vercel

---

## Gebruikers (productie)

| Naam | Email | Rol | Speelt mee |
|---|---|---|---|
| Dick Veerman | t.e.veerman@ziggo.nl | Beheerder | ❌ Nee — backup beheerder |
| Dick Veerman Speler | stuctech@gmail.com | Beheerder | ✅ Ja — heeft ticket |
| Wim Kraaij | — | Lid | ✅ Ja |
| Ing | — | Lid | ✅ Ja |
| Ellen Veerman | — | Lid | ✅ Ja |

**Twee beheerder-accounts bewust:** als één account problemen heeft kan de ander ingrijpen. Dick Veerman (t.e.veerman) speelt niet mee en heeft geen ticket. Dick Veerman Speler (stuctech) speelt wel mee.

---

## Rollen

| Rol | Wat |
|---|---|
| **Beheerder** | Alles — trekkingen, kas, leden, instellingen, meespelen |
| **Kashouder** | Kas beheren + meespelen |
| **Lid** | Alleen meespelen |

**Systeemregel:** altijd minimaal 1 beheerder. App blokkeert demoten van laatste beheerder.
**Bootstrap:** eerste beheerder handmatig via Firebase Console → `users/{uid}` → `rol: "beheerder"`.

---

## Spelregels (definitief vastgesteld)

1. **Betaling = deelname** — alleen wie betaald heeft én kashouder heeft bevestigd doet mee
2. **1 ticket per persoon** — gelijke kansen voor iedereen
3. **Alleen alle 6 nummers goed is winnen** — prijsmodus: `alle_goed_wint`
4. **Geen winnaar → rollover** — pot blijft staan, groeit volgende week
5. **Pot = som bevestigde betalingen** — wie niet betaalt legt niet in
6. **Meerdere winnaars mogelijk** — pot wordt gelijkelijk verdeeld
7. **Niet betaald → automatisch uitgesloten** — geen handmatige actie kashouder nodig

---

## Betaalcyclus (automatisch)

```
Zaterdag: trekking verwerkt
→ Cloud Function maakt automatisch betalingen aan (status: 'open') voor volgende week
→ Leden ontvangen geen aparte melding — ze zien het in de app

Zondag t/m donderdag: leden betalen via Tikkie en melden in de app

Vrijdag 09:00: automatische push-herinnering naar leden met status 'open'

Zaterdag 19:30: beheerder krijgt push "Lotto-uitslag invoeren"
Beheerder voert nummers in → trekking verwerkt → cyclus herhaalt
```

---

## Tikkie-blokkade (persistentie via Firestore)

Leden kunnen "Ik heb betaald" pas tikken nadat ze op "Betaal via Tikkie" hebben getikt.
- Bij tikken op Tikkie → `tikkieGeopend: true` opgeslagen in Firestore op het betaling-document
- Na herladen pagina blijft de blokkade correct (leest uit Firestore, niet uit browser-sessie)
- Alleen actief als er een Tikkie-link is ingesteld via Beheer → Admin → Instellingen

---

## Weekberekening (ISO-8601)

**BELANGRIJK:** De weekberekening gebruikt ISO-8601 (maandag t/m zondag).

```javascript
// Correct — ISO-8601
function huidigTrekkingWeek(datum?: Date): string {
  const d = new Date(Date.UTC(...));
  const dayNum = d.getUTCDay() || 7; // maandag=1 ... zondag=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // naar donderdag
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNr = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNr).padStart(2, '0')}`;
}
```

Resultaat: 1 juli (wo) én 4 juli (za) vallen allebei in W27. Identiek in `lib/firestore-payments.ts` én `functions/src/index.ts`.

---

## Firestore structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, notificationSettings

/spelConfig/default
  naam, aantalGetallen, minGetal, maxGetal, bonusBal

/prijsConfig/default
  modus: 'alle_goed_wint' | 'hoogste_score_wint' | 'meerdere_winnaars' | 'vaste_prijzen'

/paymentConfig/main
  activeProvider, providers, tikkieLink

/seizoenen/{id}
  naam, startDatum, eindDatum, status

/trekkingen/{id}
  nummers[], bonusBal, seizoenId, verwerkt, ingevoerdDoor, ingevoerdDoorNaam, datum

/resultaten/{id}
  userId, userNaam, ticketId, ticketNaam, nummersGoed[], aantalGoed,
  bonusGoed, punten, isWinnaar, trekkingId, seizoenId

/betalingen/{id}
  userId, userNaam, bedrag, omschrijving, provider, status,
  trekkingWeek, tikkieGeopend, aangemaakt, bevestigd, bevestigdDoor

/kasmutaties/{id}
  bedrag, type, omschrijving, datum, userId, betalingId, aangemaaktDoor

/auditLog/{id}
  actie, omschrijving, userId, userNaam, datum
```

**Regel:** `kasSaldo` wordt NOOIT opgeslagen — altijd `berekenKasSaldo(kasmutaties)`.

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking aangemaakt | Controle-engine, resultaten, ranglijst, push naar alle leden |
| `onBetalingBevestigd` | Betaling status → 'betaald' | Push naar lid |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar leden met status 'open' |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt (update) | Betalingen 'open' aanmaken voor volgende week |

**Runtime:** Node.js 22

### Push notificatie stijl (uitgebreid verhaal)

**Winnaar:** *"🎰 Jackpot! De ballen zijn gevallen... [nummers]. En jij had ze allemaal goed! 🏆 Gefeliciteerd [naam], jij wint de pot van €X! Wat een avond!"*

**Verliezer (winnaar wel):** *"🎱 De ballen zijn gevallen... Jij had X goed — helaas niet genoeg. [winnaar] won de pot! Volgende week weer een kans. 💪"*

**Geen winnaar:** *"🎱 Geen winnaar deze week! De ballen vielen op [nummers]. Jij had X goed. De pot groeit naar €X! Wie pakt hem volgende zaterdag? 🤞"*

**Niet betaald:** *"🎱 Trekking gemist. Je had deze week niet betaald. De pot staat nu op €X. Doe volgende week mee! 💪"*

### DATA-ONLY PAYLOAD (architectuurregel)
Geen top-level `notification` veld — dat veroorzaakte dubbele notificaties. Alleen via `data` sturen.

---

## Controle-engine (architectuurregel)

`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` zijn altijd **identiek**.
Pure functie — geen Firestore, geen React. Input → output.

Prijsmodi:
- `alle_goed_wint` — alleen bij alle nummers goed; geen match = rollover (**actief/default**)
- `hoogste_score_wint` — hoogste score wint
- `meerdere_winnaars` — iedereen boven minimumscore
- `vaste_prijzen` — vaste uitbetaling per score

---

## Pagina's

| Route | Beschrijving | Rol |
|---|---|---|
| `/` | Login | Iedereen |
| `/dashboard` | Lid dashboard (live data) | Lid |
| `/trekkingen` | Trekking overzicht + invoer | Lid+ |
| `/trekkingen/[id]` | Trekking detail (eigen nummers, naam uit profiel) | Lid+ |
| `/ranglijst` | Seizoen ranglijst | Lid+ |
| `/hall-of-fame` | All-time records | Lid+ |
| `/kas` | Kasboek | Lid+ |
| `/betalen` | Betaalflow met Tikkie-blokkade | Lid+ |
| `/deelnemers` | Simpele ledenlijst (alleen namen) | Lid+ |
| `/spelregels` | Spelregels + betaalcyclus uitleg | Lid+ |
| `/help` | Handleiding met 10 tabbladen | Lid+ |
| `/profiel` | Profiel, naam wijzigen, ticket, notificaties | Lid+ |
| `/leden` | Ledenbeheer + rollen | Kashouder+ |
| `/kashouder` | Kashouder dashboard (live) | Kashouder+ |
| `/kashouder/financieel` | Financieel beheer | Kashouder+ |
| `/beheerder` | Beheerder dashboard (live) | Beheerder |
| `/beheerder/admin` | Admin paneel (5 tabs) | Beheerder |

---

## STATUS PER 5 JULI 2026

### Volledig werkend en getest
- ✅ Alle inlogmethoden (email, wachtwoord, magic link, Google, registratie)
- ✅ Push notificaties end-to-end (data-only payload fix)
- ✅ Betaalcyclus automatisch na trekking
- ✅ Betaalherinnering vrijdag 09:00 (bevestigd in Cloud Run logs)
- ✅ Trekking-herinnering zaterdag 19:30
- ✅ Tikkie-blokkade persistent via Firestore
- ✅ ISO-8601 weekberekening (client + Cloud Functions)
- ✅ Prijsmodus `alle_goed_wint` actief in Firestore
- ✅ 1 ticket per persoon
- ✅ Naam uit gebruikersprofiel in trekking-detail
- ✅ Uitgebreide push-notificaties met pot-bedrag en verhaal
- ✅ Scrollbare modals (ticket + trekking invoer)
- ✅ Navigatie fix (bottom-nav altijd onderaan)
- ✅ Live dashboards (lid, kashouder, beheerder)
- ✅ Spelregels pagina
- ✅ Help pagina (10 tabbladen)
- ✅ Deelnemers pagina (alleen namen)

### Huidige situatie
- Eerste trekking (4 juli) was een testdraai met technische fouten
- Beslissing: deze ronde doorspelen tot iemand 6 goed heeft
- Na eerste echte winnaar → testdata opruimen → schone start
- Tikkie-link verloopt 14 juli → nieuwe link aanmaken

### Openstaande punten
- ⏳ Verifiëren werkt niet goed — nog uit te zoeken
- ⏳ Testdata opruimen na eerste echte winnaar
- ⏳ Nieuwe Tikkie-link aanmaken voor 14 juli
- ⏳ `debug` collectie in Firestore bewust laten staan als diagnostiek

### Te deployen zips (nog niet alle gedaan)
1. `lottoapp-weekfix2.zip`
2. `lottoapp-weekfix-functions.zip`
3. `lottoapp-tikkie-persistentie.zip`
4. `lottoapp-prijzen-opslaan.zip`
5. `lottoapp-trekking-scroll.zip`
6. `lottoapp-ticket-scroll.zip`
7. `lottoapp-notificaties-verhaal.zip`
8. `lottoapp-deelnemers.zip`

---

## Firebase setup
- Project: `lottoclub`
- Auth: Email/Password, Email link, Google
- Firestore: europe-west1
- Cloud Functions: Node.js 22
- Web app config: `lib/firebase.ts`

## GitHub
- Repo: `github.com/stuctech-eng/LottoApp`
- Branch `main` = productie
- Auto-deploy via Vercel bij push naar main

## Handige links
- Live app: https://lotto-app-eight-chi.vercel.app
- Firebase Console: console.firebase.google.com
- Google Cloud Console: console.cloud.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
