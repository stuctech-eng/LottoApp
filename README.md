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

## Spelregels (definitief)

1. **Betaling = deelname** — alleen wie betaald heeft én kashouder heeft bevestigd doet mee
2. **1 ticket per persoon** — gelijke kansen voor iedereen
3. **Alleen alle 6 nummers goed is winnen** — prijsmodus: `alle_goed_wint`
4. **Geen winnaar → rollover** — pot blijft staan, groeit volgende week
5. **Pot = som bevestigde betalingen** — wie niet betaalt legt niet in
6. **Meerdere winnaars mogelijk** — pot wordt gelijkelijk verdeeld
7. **Niet betaald → automatisch uitgesloten** — geen handmatige actie kashouder nodig
8. **Betalen alleen maandag t/m zaterdag voor 18:00** — daarna geblokkeerd

---

## Betaalcyclus (volledig automatisch)

```
Maandag: nieuwe week (ISO-W) begint → leden kunnen betalen
  ↓
Ma t/m vr: leden betalen via Tikkie → melden in app
  ↓
Vrijdag 09:00: automatische push-herinnering naar leden met status 'open'
  ↓
Zaterdag 18:00: betalen geblokkeerd (ballen vallen om 19:00)
  ↓
Zaterdag 19:30: beheerder krijgt push "Lotto-uitslag invoeren"
  ↓
Beheerder voert nummers in → Cloud Function verwerkt
  ↓
Iedereen krijgt push met resultaat + eventueel winnaar-notificatie
  ↓
Automatisch nieuwe betalingen aangemaakt voor volgende week (status: 'open')
  ↓
Cyclus herhaalt
```

**BELANGRIJK:** Betalen op **zondag** is geblokkeerd — zondag valt nog in de oude ISO-week. Nieuwe week begint pas maandag.

---

## Tijdsblokkade betalen

```javascript
// Zaterdag 18:00+ → geblokkeerd (ballen gevallen)
// Zondag → geblokkeerd (oude week, nieuwe begint maandag)
// Maandag t/m zaterdag voor 18:00 → betalen mag
if (dag === 0) return geblokkeerd; // zondag
if (dag === 6 && uur >= 18) return geblokkeerd; // zaterdag 18:00+
```

---

## ISO-8601 Weekberekening

**KRITIEK:** Beide bestanden gebruiken identieke ISO-8601 weekberekening:
- `lib/firestore-payments.ts` → `huidigTrekkingWeek()`
- `functions/src/index.ts` → `getTrekkingWeek(datum)`

```
1 juli (wo)  → W27 ✅
4 juli (za)  → W27 ✅
5 juli (zo)  → W27 ✅  ← nog oude week
6 juli (ma)  → W28 ✅  ← nieuwe week begint
```

---

## Winnaar-flow

```
Winnaar heeft alle 6 goed
↓
Cloud Function stuurt push:
"🎰 Jackpot! De ballen zijn gevallen... [nummers].
Jij wint de pot van €X! Wat een avond!"
↓
Winnaar opent app → CONFETTI SCHERM met:
- 🏆 JACKPOT! in gouden letters
- Pot-bedrag groot in beeld
- Getrokken nummers
- 💬 WhatsApp [kashouder] knop
↓
Winnaar stuurt WhatsApp aan kashouder
Kashouder maakt bedrag over via bank/Tikkie
Kashouder registreert uitbetaling in app → kassaldo → €0
```

**Kashouder in confetti-scherm:** dynamisch opgehaald uit Firestore.
Eerst `rol === 'kashouder'`, dan fallback op `rol === 'beheerder'`.
Gebruikt telefoonnummer uit gebruikersprofiel voor WhatsApp-link.

---

## Push Notificaties (uitgebreide teksten)

**Winnaar:**
> 🎰 Jackpot! De ballen zijn gevallen... [nummers]. En jij had ze allemaal goed! 🏆 Gefeliciteerd [naam], jij wint de pot van €X! Wat een avond!

**Verliezer (winnaar wel):**
> 🎱 De ballen zijn gevallen... Jij had X goed — helaas niet genoeg. [winnaar] won de pot! Volgende week weer een kans. 💪

**Geen winnaar:**
> 🎱 Geen winnaar deze week! De ballen vielen op [nummers]. Jij had X goed. De pot groeit naar €X! Wie pakt hem volgende zaterdag? 🤞

**Niet betaald:**
> 🎱 Trekking gemist. Je had deze week niet betaald. De pot staat nu op €X. Doe volgende week mee! 💪

**DATA-ONLY PAYLOAD regel:** nooit top-level `notification` veld — geeft dubbele notificaties.

---

## Firestore Structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, notificationSettings

/spelConfig/default
  naam, aantalGetallen, minGetal, maxGetal, bonusBal

/prijsConfig/default
  modus: 'alle_goed_wint'  ← actief

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
| `onTrekkingVerwerkt` | Nieuwe trekking | Controle-engine, resultaten, push alle leden |
| `onBetalingBevestigd` | Betaling → 'betaald' | Push naar lid |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar leden met status 'open' |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | 'open' betalingen voor volgende week |

**Runtime:** Node.js 22

---

## Pagina's

| Route | Beschrijving | Rol |
|---|---|---|
| `/` | Login | Iedereen |
| `/dashboard` | Lid dashboard + confetti winnaar-scherm | Lid |
| `/trekkingen` | Trekking overzicht + invoer | Lid+ |
| `/trekkingen/[id]` | Trekking detail (eigen nummers) | Lid+ |
| `/ranglijst` | Seizoen ranglijst | Lid+ |
| `/hall-of-fame` | All-time records | Lid+ |
| `/kas` | Kasboek | Lid+ |
| `/betalen` | Betaalflow + tijdsblokkade | Lid+ |
| `/deelnemers` | Simpele ledenlijst | Lid+ |
| `/spelregels` | Spelregels + betaalcyclus | Lid+ |
| `/help` | Handleiding 10 tabbladen | Lid+ |
| `/profiel` | Profiel, naam, ticket, notificaties | Lid+ |
| `/leden` | Ledenbeheer + rollen | Kashouder+ |
| `/kashouder` | Kashouder dashboard (weekfilter) | Kashouder+ |
| `/kashouder/financieel` | Financieel beheer | Kashouder+ |
| `/beheerder` | Beheerder dashboard | Beheerder |
| `/beheerder/admin` | Admin paneel (5 tabs) | Beheerder |

---

## STATUS PER 5 JULI 2026

### Volledig werkend
- ✅ Alle inlogmethoden
- ✅ Push notificaties (data-only payload)
- ✅ Betaalcyclus automatisch
- ✅ Tijdsblokkade betalen (za 18:00+ en zo)
- ✅ ISO-8601 weekberekening (client + functions)
- ✅ Weekfilter kashouder dashboard
- ✅ Prijsmodus `alle_goed_wint` actief in Firestore
- ✅ 1 ticket per persoon
- ✅ Confetti winnaar-scherm met WhatsApp kashouder
- ✅ Uitgebreide push-notificaties met pot-bedrag
- ✅ Trekking detail met eigen nummers
- ✅ Scrollbare modals
- ✅ Live dashboards

### Huidige situatie
- Eerste trekking (4 juli W27) was testdraai
- Ronde loopt door tot iemand 6 goed heeft
- Na eerste echte winnaar → testdata opruimen → schone start
- Tikkie-link verloopt 14 juli → nieuwe link aanmaken

### Openstaand
- ⏳ Verifiëren bug — nog uit te zoeken
- ⏳ Testdata opruimen na eerste echte winnaar
- ⏳ Nieuwe Tikkie-link vóór 14 juli

### Nog te deployen
1. `lottoapp-betaal-blokkade.zip` — tijdsblokkade za/zo
2. `lottoapp-winnaar-scherm.zip` — confetti scherm

---

## Handige links
- Live app: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase Console: console.firebase.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
