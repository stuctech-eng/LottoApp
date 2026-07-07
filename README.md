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

---

## Rollen

| Rol | Wat |
|---|---|
| **Beheerder** | Alles — trekkingen, kas, leden, instellingen, meespelen |
| **Kashouder** | Kas beheren + meespelen |
| **Lid** | Alleen meespelen |

---

## Spelregels (definitief)

1. **Betaling = deelname** — alleen bevestigde betaling telt mee
2. **1 ticket per persoon** — gelijke kansen
3. **Alleen alle 6 nummers goed is winnen** — prijsmodus: `alle_goed_wint`
4. **Geen winnaar → rollover** — pot blijft staan
5. **Pot = som bevestigde betalingen** — alleen betalers bouwen pot op
6. **Meerdere winnaars mogelijk** — pot gelijkelijk verdeeld
7. **Niet betaald → automatisch uitgesloten**
8. **Betalen alleen maandag t/m zaterdag voor 18:00**

---

## Betaalcyclus (volledig automatisch)

```
Maandag: nieuwe ISO-week begint → leden kunnen betalen
Ma t/m za 18:00: betaal via Tikkie → meld in app
Vrijdag 09:00: automatische push-herinnering (status 'open')
Zaterdag 18:00: betalen geblokkeerd
Zaterdag 19:30: beheerder krijgt push "uitslag invoeren"
Zaterdag avond: trekking verwerkt → push naar alle leden
→ Automatisch nieuwe betalingen aangemaakt voor volgende week
Zondag: geblokkeerd — betalen kan pas weer maandag
```

---

## KRITIEKE ARCHITECTUURREGELS

### 1. Geen orderBy in Firestore queries
**NOOIT `orderBy()` gebruiken in Firestore queries.** Dit vereist een composite index. Zonder die index geeft Firestore stil een lege array terug — geen foutmelding, gewoon 0 resultaten. Dit brak de betaalvoortgang wekenlang.

**Altijd client-side sorteren:**
```javascript
// ❌ FOUT — kan silent falen zonder index
const q = query(collection(db, 'betalingen'), orderBy('aangemaakt', 'desc'));

// ✅ CORRECT — altijd werkt
const q = query(collection(db, 'betalingen'));
// Dan na de map:
betalingen.sort((a, b) => (b.aangemaakt?.toMillis() ?? 0) - (a.aangemaakt?.toMillis() ?? 0));
```

Dit geldt voor: `betalingen`, `kasmutaties`, `users`, en alle andere collecties.

### 2. ISO-8601 weekberekening
Week loopt van **maandag t/m zondag**. Identiek in `lib/firestore-payments.ts` én `functions/src/index.ts`.

```
1 juli (wo) → W27, 4 juli (za) → W27, 6 juli (ma) → W28
```

### 3. Data-only FCM payload
Nooit top-level `notification` veld — geeft dubbele notificaties.

### 4. kasSaldo nooit opslaan
Altijd `berekenKasSaldo(kasmutaties)` — nooit een opgeslagen waarde.

### 5. Controle-engine identiek
`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` zijn altijd identiek.

---

## Hoe alles samenwerkt

### Betaalflow
```
1. Trekking verwerkt (za avond)
   → Cloud Function maakt 'open' betalingen voor volgende week

2. Vrijdag 09:00
   → Cloud Function stuurt push naar leden met status 'open'

3. Lid opent app → Betalen
   → Tikt "Betaal via Tikkie" → Tikkie opent
   → Tikt "Ik heb betaald" → document aangemaakt (status: verificatie)
   → trekkingWeek wordt automatisch ingevuld (bijv. "2026-W28")

4. Kashouder ziet verificatie op dashboard
   → Tikt ✓ → status wordt 'betaald' → kasmutatie aangemaakt

5. Betaalvoortgang dashboard
   → filtert op betalingen waar trekkingWeek === huidigeWeek
   → telt betaaldeLeden vs actieveLeden
```

### Trekkingsflow
```
1. Zaterdag 19:30 → push naar beheerder

2. Beheerder voert nummers in
   → Cloud Function onTrekkingVerwerkt triggert

3. Cloud Function:
   → haalt betalers op voor huidigeWeek (status: betaald)
   → controle-engine vergelijkt tickets van betalers
   → resultaten opgeslagen, ranglijst bijgewerkt
   → push naar alle deelnemers met persoonlijk verhaal
   → push naar niet-betalers
   → nieuwe 'open' betalingen voor volgende week

4. Winnaar opent app → confetti scherm
   → WhatsApp knop naar kashouder
   → kashouder maakt bedrag over
   → registreert uitbetaling in app
```

### Weekfilter (kashouder dashboard)
```javascript
const huidigeWeek = huidigTrekkingWeek(); // bijv. "2026-W28"
const betalingenDezeWeek = betalingen.filter(
  b => b.trekkingWeek === huidigeWeek
);
const betaaldeLeden = new Set(
  betalingenDezeWeek.filter(b => b.status === 'betaald').map(b => b.userId)
);
const aantalBetaald = actieveLeden.filter(l => betaaldeLeden.has(l.id)).length;
```

---

## Firestore Structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, notificationSettings

/spelConfig/default
  naam, aantalGetallen, minGetal, maxGetal, bonusBal

/prijsConfig/default
  modus: 'alle_goed_wint'

/paymentConfig/main
  activeProvider, providers, tikkieLink

/seizoenen/{id}
  naam, startDatum, eindDatum, status

/trekkingen/{id}
  nummers[], bonusBal, seizoenId, verwerkt, ingevoerdDoor, datum

/resultaten/{id}
  userId, userNaam, ticketId, nummersGoed[], aantalGoed,
  punten, isWinnaar, trekkingId, seizoenId

/betalingen/{id}
  userId, userNaam, bedrag, omschrijving, provider, status,
  trekkingWeek, tikkieGeopend, aangemaakt, bevestigd, bevestigdDoor

/kasmutaties/{id}
  bedrag, type, omschrijving, datum, userId, betalingId
```

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking | Controle-engine, resultaten, push |
| `onBetalingBevestigd` | Betaling → betaald | Push naar lid |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar open betalingen |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | Open betalingen volgende week |

---

## Pagina's

| Route | Rol |
|---|---|
| `/dashboard` | Lid — met confetti winnaar-scherm |
| `/betalen` | Lid — Tikkie blokkade + tijdsblokkade za/zo |
| `/trekkingen` | Lid+ — scrollbare invoer modal |
| `/trekkingen/[id]` | Lid+ — eigen nummers uit profiel |
| `/deelnemers` | Lid — alleen namen |
| `/spelregels` | Lid — spelregels + betaalcyclus |
| `/help` | Lid — 10 tabbladen |
| `/profiel` | Lid — naam, ticket, notificaties |
| `/kashouder` | Kashouder — weekfilter W28 |
| `/kashouder/financieel` | Kashouder — betalingen + WhatsApp |
| `/leden` | Kashouder+ — rollen beheren |
| `/beheerder` | Beheerder — live dashboard |
| `/beheerder/admin` | Beheerder — 5 tabs |

---

## STATUS PER 7 JULI 2026

### Volledig werkend ✅
- Betaalcyclus automatisch (W28)
- Betaalvoortgang weekfilter correct
- Tijdsblokkade za 18:00 en zo
- ISO-8601 weekberekening
- Prijsmodus `alle_goed_wint` actief
- Confetti winnaar-scherm
- Push-notificaties met verhaal
- Trekking detail met eigen nummers
- Kashouder dashboard weekfilter

### Openstaand ⏳
- Verifiëren bug — nog uit te zoeken
- Testdata opruimen na eerste echte winnaar
- Nieuwe Tikkie-link vóór 14 juli

### Aankomende zaterdag 11 juli
```
Ma 6 juli → W28, leden betalen
Vr 10 juli 09:00 → automatische herinnering
Za 11 juli 18:00 → betalen geblokkeerd
Za 11 juli 19:30 → trekking invoeren
Za 11 juli → eerste echte test van volledige cyclus
```

---

## Handige links
- Live: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase: console.firebase.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
