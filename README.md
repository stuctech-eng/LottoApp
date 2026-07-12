# LottoClub 🎱

Digitale lottovereniging app — Next.js 16, TypeScript, Firebase

## Live
🌐 https://lotto-app-eight-chi.vercel.app

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Auth + DB**: Firebase (Auth + Firestore + Cloud Functions + FCM)
- **PWA**: Serwist (`@serwist/turbopack`) — offline caching, service worker via `app/serwist/[path]/route.ts`
- **Deploy**: Vercel (app, auto-deploy via GitHub) + GitHub Actions (Cloud Functions, `.github/workflows/deploy-functions.yml`)
- **Workflow**: iPhone → Working Copy → GitHub → Vercel/Actions

Voor de volledige wijzigingsgeschiedenis: zie [`docs/changelog.md`](docs/changelog.md).

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

Navigatie (bottom nav + terugknoppen) is overal **rol-afhankelijk** — een pagina die door meerdere rollen bezocht kan worden (zoals `/kas`, `/profiel`, `/kashouder/financieel`) toont de nav die bij de bezoeker hoort, niet een hardcoded standaardnav.

---

## Spelregel (definitief — vaste, enige spelmodus)

**"6 goed is winnaar" — cumulatief per speelreeks.**

LottoClub gebruikt één vaste spelmodus. Er is bewust géén ondersteuning voor andere modi (hoogste score wint, vaste prijzen, etc.) — de `PrijsConfig`-infrastructuur is verwijderd.

1. **Betaling = deelname** — alleen bevestigde betaling voor die specifieke week telt mee. Geen betaling = die trekking telt niet mee (ook niet als de getrokken nummers toevallig matchen).
2. **1 ticket per persoon** — gelijke kansen.
3. **Cumulatieve matching**: iedere trekking worden de getrokken nummers vergeleken met elk ticket. Elk nummer dat een speler goed heeft, wordt **permanent bijgeschreven** binnen de huidige speelreeks — een nummer telt maar één keer mee, ook als het later nogmaals valt.
4. **Winnen bij 6 unieke goede nummers** — zodra een ticket alle 6 nummers heeft verzameld (cumulatief, over eventueel meerdere trekkingen), is dat ticket winnaar.
5. **Meerdere winnaars mogelijk** — iedereen die in dezelfde trekking op 6/6 uitkomt, wint.
6. **Geen winnaar → rollover** — pot blijft staan, speelreeks loopt door, iedereen behoudt zijn cumulatieve voortgang naar de volgende trekking.
7. **Na winnaar(s) → nieuwe speelreeks** — automatisch, geen handmatige actie nodig. Er is geen aparte "ronde"-datastructuur voor; de grens wordt afgeleid uit de trekkingsgeschiedenis (alles ná de laatste trekking met winnaar hoort bij de huidige speelreeks).
8. **Punten voor de ranglijst** zijn gebaseerd op **alleen de nieuwe matches die trekking** (niet het cumulatieve totaal) — dit voorkomt dat oude matches telkens opnieuw punten opleveren.
9. **Betalen alleen maandag t/m zaterdag voor 18:00** — technisch afgedwongen in `app/betalen/page.tsx`, niet alleen een afspraak.

### Voorbeeld
```
Ticket:        6 - 12 - 18 - 23 - 31 - 44
Trekking 1:     6 -  8 - 19 - 27 - 33 - 41  →  1 nieuw   → totaal 1/6
Trekking 2:    12 - 16 - 22 - 35 - 39 - 44  →  2 nieuw   → totaal 3/6
Trekking 3:    18 - 23 - 31 - 40 - 42 - 45  →  3 nieuw   → totaal 6/6 → WINNAAR
```

---

## Betaalcyclus (grotendeels automatisch)

```
Maandag: nieuwe ISO-week begint → leden kunnen betalen
Ma t/m za 18:00: betaal via Tikkie → meld in app
Vrijdag 09:00: automatische push-herinnering (status 'open')
Zaterdag 18:00: betalen geblokkeerd
Zaterdag 19:30: beheerder krijgt push "uitslag invoeren"
Zaterdag avond: trekking verwerkt → push naar alle leden (incl. duidelijke
  melding aan niet-betalers dat de getrokken nummers niet meetellen)
→ Automatisch nieuwe betalingen aangemaakt voor volgende week
Zondag: geblokkeerd — betalen kan pas weer maandag
```

⚠️ **Bekende beperking**: `onBetalingenAanmaken` maakt alleen een betaaldocument aan voor leden die op dat moment al minstens één ticket hebben. Een lid dat pas ná het verwerken van een trekking een ticket toevoegt, krijgt pas vanaf de eerstvolgende cyclus een betaaldocument — voor de tussenliggende week ontbreekt het document dan volledig (niet "open", gewoon afwezig). Het beheerder-dashboard signaleert dit inmiddels correct (zie architectuurregels), maar er is nog geen automatische correctie/backfill.

---

## KRITIEKE ARCHITECTUURREGELS

### 1. Geen orderBy in Firestore queries
**NOOIT `orderBy()` gebruiken in Firestore queries.** Dit vereist een composite index. Zonder die index geeft Firestore stil een lege array terug — geen foutmelding, gewoon 0 resultaten. Dit brak de betaalvoortgang wekenlang, en later ook de ranglijst (`subscribeRanglijst` gebruikte `orderBy` gecombineerd met `where` — inmiddels gefixt, sortering gebeurt nu in JS).

**Altijd client-side sorteren:**
```javascript
// ❌ FOUT — kan silent falen zonder index
const q = query(collection(db, 'betalingen'), orderBy('aangemaakt', 'desc'));

// ✅ CORRECT — altijd werkt
const q = query(collection(db, 'betalingen'));
betalingen.sort((a, b) => (b.aangemaakt?.toMillis() ?? 0) - (a.aangemaakt?.toMillis() ?? 0));
```
Dit geldt voor: `betalingen`, `kasmutaties`, `users`, `resultaten`, en alle andere collecties. Meerdere `==`-filters op verschillende velden zijn wél veilig zonder composite index — alleen `orderBy()` gecombineerd met een ander veld is het probleem.

### 2. ISO-8601 weekberekening
Week loopt van **maandag t/m zondag**. Identiek in `lib/firestore-payments.ts` (`huidigTrekkingWeek`, accepteert optioneel een datum) én `functions/src/index.ts` (`getTrekkingWeek`).

### 3. Data-only FCM payload
Nooit top-level `notification` veld — geeft dubbele notificaties.

### 4. kasSaldo nooit opslaan
Altijd `berekenKasSaldo(kasmutaties)` — nooit een opgeslagen waarde.

### 5. Controle-engine identiek
`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` zijn altijd identiek (byte-voor-byte). De engine is een **pure functie** — geen Firestore, geen React. De aanroepende laag (Cloud Function of client) is verantwoordelijk voor het bepalen van de speelreeks-grens en het aanleveren van `vorigeMatches` per ticket.

### 6. Cumulatieve matching (nieuw sinds clubmodus-herbouw)
- `Resultaat.nummersGoed` = alleen de **nieuwe** matches van díe specifieke trekking
- `Resultaat.matchedNumbers` = de **cumulatieve** unieke verzameling binnen de speelreeks
- `Resultaat.aantalGoed` = `matchedNumbers.length` (cumulatief, niet per-trekking)
- `Resultaat.punten` = gebaseerd op `nummersGoed.length` (alleen nieuw), **nooit** op het cumulatieve totaal — anders tellen oude matches telkens opnieuw mee bij `FieldValue.increment()`
- Overal waar de client `matchedNumbers` leest (bijv. `lib/firestore-trekkingen.ts` → `subscribeResultaten`), moet dat veld **expliciet** in de handmatige Firestore-veldmapping staan — is al eens vergeten en zorgde voor een stille bug.

### 7. Herberekenen in plaats van migratiescripts
Voor eenmalige of herhaalde correcties op de huidige speelreeks: gebruik de **"Herbereken huidige speelreeks"**-knop (Beheerder → Beheer → Prijzen), niet een los migratiescript. Deze roept de callable Cloud Function `herberekenSpeelreeks` aan, die:
- alleen de resultaten van de **huidige, nog lopende** speelreeks verwijdert en opnieuw berekent (afgesloten speelreeksen met een winnaar blijven ongewijzigd)
- **`ranglijstPunten` altijd hard herberekent** als de exacte som van alle `punten`-velden over ál iemands resultaten — nooit via een optel/aftrek-delta, want dat bleek bij herhaald aanroepen te kunnen afwijken (drift)
- correct filtert op wie er **die specifieke week** heeft betaald — een eerdere versie vergat deze filter volledig, waardoor niet-betalers toch meetelden

### 8. Geen alternatieve spelmodi
`PrijsConfig` (het type, de Firestore-collectie-uitlezing, de admin-UI met modus-keuze) is bewust volledig verwijderd. LottoClub gebruikt precies één spelregel — zie hierboven. Bouw hier niet opnieuw een keuzemogelijkheid bovenop zonder expliciet overleg.

---

## Hoe alles samenwerkt

### Betaalflow
```
1. Trekking verwerkt (za avond)
   → Cloud Function maakt 'open' betalingen voor volgende week
     (alleen voor actieve leden die al een ticket hebben — zie
     bekende beperking hierboven)

2. Vrijdag 09:00
   → Cloud Function stuurt push naar leden met status 'open'

3. Lid opent app → Betalen
   → Ziet waarschuwing: "niet op tijd betaald? dan tellen de
     getrokken nummers niet mee voor je verzameling"
   → Tikt "Betaal via Tikkie" → Tikkie opent
   → Tikt "Ik heb betaald" → document aangemaakt (status: verificatie)
   → trekkingWeek wordt automatisch ingevuld (bijv. "2026-W28")

4. Kashouder ziet verificatie op dashboard
   → Tikt ✓ → status wordt 'betaald' → kasmutatie aangemaakt

5. Beheerder-dashboard "Vereist aandacht"
   → vergelijkt actieve leden-met-ticket tegen wie er in de
     betaald-lijst van déze week staat — vangt zowel "document
     bestaat en is open" als "document ontbreekt volledig" af
```

### Trekkingsflow
```
1. Zaterdag 19:30 → push naar beheerder

2. Beheerder voert nummers in
   → Cloud Function onTrekkingVerwerkt triggert

3. Cloud Function:
   → bepaalt de speelreeks-grens (alles ná de laatste trekking met
     winnaar, of vanaf het begin als nog nooit gewonnen)
   → haalt per ticket de cumulatieve matchedNumbers op van vóór
     deze trekking (kijkt over de HELE speelreeks, niet alleen de
     laatste trekking — anders verliest een lid dat een week
     oversloeg zijn eerder verzamelde nummers)
   → haalt betalers op voor huidigeWeek (status: betaald)
   → controle-engine berekent nieuwe/cumulatieve matches, punten,
     winnaars
   → resultaten opgeslagen, ranglijst bijgewerkt (increment, alleen
     bij de live trigger — niet bij herberekenen)
   → push naar alle deelnemers met persoonlijk verhaal
   → push naar niet-betalers (met expliciete uitleg dat de
     getrokken nummers niet meetellen)
   → nieuwe 'open' betalingen voor volgende week

4. Winnaar(s) openen app → confetti scherm
   → WhatsApp knop naar kashouder
   → kashouder maakt bedrag over
   → registreert uitbetaling in app
```

### Trekking-detailpagina — kleurcodering
```
Blauw balletje       = nummer geraakt binnen de huidige speelreeks
                        (matchedNumbers, cumulatief)
Blauw + goud randje  = nieuw geraakt DEZE trekking (nummersGoed)
Gele waarschuwing    = toont welke leden niet betaald hadden voor
                        deze specifieke trekking en dus niet meetellen
```

---

## Firestore Structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, notificationSettings

/spelConfig/default
  naam, aantalGetallen, minGetal, maxGetal, bonusBal

/seizoenen/{id}
  naam, startDatum, eindDatum, status

/trekkingen/{id}
  nummers[], bonusBal, seizoenId, rondeId (legacy, niet actief gebruikt),
  verwerkt, ingevoerdDoor, datum

/resultaten/{id}
  userId, userNaam, ticketId, ticketNaam,
  nummersGoed[]        — NIEUW deze trekking
  matchedNumbers[]      — CUMULATIEF binnen de speelreeks
  aantalGoed            — = matchedNumbers.length
  bonusGoed, punten (o.b.v. nieuwe matches), isWinnaar,
  trekkingId, seizoenId, rondeId, verwerktOp

/betalingen/{id}
  userId, userNaam, bedrag, omschrijving, provider, status,
  trekkingWeek, tikkieGeopend, aangemaakt, bevestigd, bevestigdDoor

/kasmutaties/{id}
  bedrag, type, omschrijving, datum, userId, betalingId
```

**Verwijderd**: `/prijsConfig/default` wordt niet meer gelezen of geschreven door de app (zie architectuurregel 8). Het document kan nog los in de database staan maar is inert.

**Let op — `rondeId`**: dit veld bestaat nog in het datamodel maar wordt nergens actief gebruikt (bij het aanmaken van een trekking wordt het altijd als lege string meegegeven). De speelreeks-grens wordt in plaats daarvan afgeleid uit de trekkingsgeschiedenis (zie architectuurregel 7). Er bestaat ook nog een ongebruikte `rondes`-collectie met bijbehorende functies in `lib/firestore-seizoenen.ts` (`subscribeRondes`, `maakRonde`) — deze zijn nooit afgemaakt/aangesloten en bevatten zelf nog een `orderBy()`-schending. Niet gebruiken zonder eerst op te ruimen of bewust af te maken.

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking (`verwerkt: false → true`) | Cumulatieve controle-engine, resultaten, punten, push |
| `onBetalingBevestigd` | Betaling → betaald | Push naar lid |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar open betalingen |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | Open betalingen volgende week (alleen leden met ≥1 ticket) |
| `herberekenSpeelreeks` | Callable, alleen beheerder | Herberekent de huidige speelreeks volledig opnieuw — zie architectuurregel 7 |

---

## Pagina's

| Route | Rol |
|---|---|
| `/dashboard` | Lid — met confetti winnaar-scherm, cumulatieve bal-highlighting |
| `/betalen` | Lid — Tikkie blokkade + tijdsblokkade za/zo + cumulatieve-matching-waarschuwing |
| `/trekkingen` | Lid+ — scrollbare invoer modal |
| `/trekkingen/[id]` | Lid+ — eigen nummers, cumulatieve/nieuwe kleurcodering, niet-betaald-balk |
| `/deelnemers` | Lid — alleen namen (bereikbaar via Profiel → Informatie) |
| `/spelregels` | Lid — spelregels + betaalcyclus (bereikbaar via Profiel → Informatie) |
| `/help` | Lid — handleiding (bereikbaar via Profiel → Informatie) |
| `/profiel` | Lid — naam, ticket, notificaties, rol-afhankelijke nav + terugknop |
| `/kas` | Alle rollen — alleen-lezen kasoverzicht, rol-afhankelijke nav |
| `/kashouder` | Kashouder — weekfilter |
| `/kashouder/financieel` | Kashouder + Beheerder — rol-afhankelijke nav |
| `/leden` | Kashouder+ — rollen beheren |
| `/beheerder` | Beheerder — live dashboard, correcte "Vereist aandacht"-signalering |
| `/beheerder/admin` | Beheerder — Instellingen / Spel / Prijzen (vaste spelregel-uitleg + herbereken-knop) / Seizoen |
| `/ranglijst` | Alle rollen — gebaseerd op nieuwe matches per trekking, niet cumulatief totaal |
| `/hall-of-fame` | Alle rollen — "Meeste nummers in één trekking", "Snelste winnaar", "Meeste overwinningen", "Meeste deelnames" |
| `/offline` | Fallback-pagina voor Serwist service worker |
| `/serwist/[path]` | Route handler die de service worker serveert (geen UI) |

---

## STATUS PER 12 JULI 2026

### Volledig werkend ✅
- PWA offline caching via Serwist (`@serwist/turbopack`, Next.js 16 + Turbopack-compatibel)
- Cumulatieve "6 goed is winnaar"-spelmodus, volledig herbouwd en getest tegen echte data
- `herberekenSpeelreeks`-tool voor correcties, met zelfherstellende puntenberekening
- Rol-afhankelijke navigatie op alle multi-rol pagina's (Kas, Profiel, Financieel)
- Beheerder-dashboard signaleert niet-betalers correct, ook bij ontbrekende betaaldocumenten
- Ranglijst en Hall of Fame gebruiken correcte, niet-cumulatieve per-trekking statistieken
- Betaalcyclus automatisch (weekfilter correct overal toegepast, ook op Lid-dashboard)
- Tijdsblokkade za 18:00 en zo, technisch afgedwongen
- Testdata in `/resultaten` opgeruimd (verdwaald `isWinnaar: true`-document verwijderd)

### Openstaand ⏳
- Backfill/correctie voor leden die een ticket toevoegen ná het aanmaken van de weekbetalingen (zie bekende beperking hierboven)
- Ongebruikte `rondes`-collectie en bijbehorende code (`subscribeRondes`, `maakRonde`) — opruimen of bewust afmaken
- Nog geen automatische tests — alles is deze sessie handmatig geverifieerd tegen productiedata via de herbereken-knop
- Eerstvolgende **live** trekking (18 juli) nog niet gezien in actie — tot nu toe is alles getest via handmatige herberekening

---

## Handige links
- Live: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase: console.firebase.google.com
- Google Cloud (Functions/Logs): console.cloud.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
- Wijzigingsgeschiedenis: [`docs/changelog.md`](docs/changelog.md)
