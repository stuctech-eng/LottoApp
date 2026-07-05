# LottoClub — Gebruikershandleiding

**Versie:** 2.0 · **Datum:** 5 juli 2026

---

## Wat is LottoClub?

LottoClub is een app voor een lottovereniging. Leden betalen elke week een inleg van €4, de kashouder beheert de kas, en de beheerder voert de trekking in na de Nederlandse Lotto op zaterdagavond. Wie alle 6 nummers goed heeft, wint de hele pot.

---

## Installatie op iPhone

1. Open **Safari** en ga naar: `lotto-app-eight-chi.vercel.app`
2. Tik op het **Deel-icoontje** (vierkantje met pijltje) onderaan
3. Kies **"Zet op beginscherm"**
4. Tik **"Voeg toe"**
5. Open de app voortaan via het **LottoClub-icoontje** op je beginscherm

> ⚠️ Push-notificaties werken ALLEEN via het beginscherm-icoontje, niet via Safari.

---

## Inloggen

- **Email + wachtwoord** — vul in en tik Inloggen
- **Wachtwoord vergeten** — tik op "Vergeten?" → reset-link per email (link geldig 1 uur)
- **Magic link** — tik "Inloggen via email link" → link per email → direct ingelogd
- **Google** — tik "Doorgaan met Google" → direct ingelogd
- **Account aanmaken** — vul naam, email en wachtwoord in → krijgt rol Lid

---

## Spelregels

### De regels gelden voor iedereen, altijd

**💳 Betaling = deelname**
Je doet alleen mee als je de inleg van die week hebt betaald én de kashouder dit heeft bevestigd. Heb je niet betaald? Dan tellen je nummers die week niet mee — automatisch.

**🎱 1 ticket per persoon**
Iedereen heeft precies 1 ticket met 6 nummers. Gelijke kansen voor iedereen.

**🏆 Alleen alle 6 nummers goed is winnen**
Je wint alleen als alle 6 nummers op je ticket overeenkomen met de getrokken nummers. Minder dan 6 goed = geen winnaar deze week.

**🔄 Geen winnaar? Pot blijft staan**
Is er geen winnaar? Dan blijft de pot staan en groeit die volgende week verder (rollover).

**💰 Pot wordt opgebouwd door betalers**
Alleen de inleg van leden die betaald hebben telt mee. Wie niet betaalt, legt niet in en doet niet mee — die week.

**🎉 Meerdere winnaars mogelijk**
Hebben meerdere leden alle 6 nummers goed? Dan zijn er meerdere winnaars en wordt de pot gelijkelijk verdeeld.

---

## Wekelijkse cyclus

```
Zaterdag avond
→ Beheerder voert trekking in
→ Iedereen krijgt push-notificatie met resultaat
→ Betalingen voor volgende week worden automatisch aangemaakt

Zondag t/m donderdag
→ Betaal via Tikkie
→ Meld je betaling in de app

Vrijdag 09:00
→ Automatische herinnering als je nog niet betaald hebt

Zaterdag 19:30
→ Beheerder krijgt melding om uitslag in te voeren
```

---

## Als LID

### Ticket aanmaken (Profiel)
1. Ga naar **Profiel** → tik **"+ Ticket toevoegen"**
2. Vul 6 unieke nummers in (1-45)
3. Geef je ticket een naam
4. Tik **"✓ Opslaan"**

Je hebt 1 ticket per persoon. Tik op je ticket om nummers te wijzigen.

### Betalen (elke week)
1. Betaal €4 via de **Tikkie-link** in het WhatsApp-bericht van de kashouder
2. Open de app → tik op **"Betalen"**
3. Tik op **"💳 Betaal nu via Tikkie"** — de knop "Ik heb betaald" wordt actief
4. Tik **"✓ Ik heb betaald — €4"**
5. Kashouder bevestigt → je ontvangt push: **"✅ Betaling bevestigd"**

> ⚠️ Betaal eerst via Tikkie — de "Ik heb betaald" knop is geblokkeerd totdat je op de Tikkie-knop hebt getikt.

### Trekkingen bekijken
- Ga naar **Trekkingen** → tik op een trekking
- Je ziet de getrokken nummers, jouw eigen nummers en hoeveel je goed had
- Groen = getrokken nummer, grijs = niet getrokken

### Ranglijst & Hall of Fame
- **Ranglijst** — jouw positie op basis van punten dit seizoen
- **Hall of Fame** — all-time records en top 3 aller tijden
- Punten verdien je per trekking: 10 punten per goed nummer

### Spelregels & Help
- Via **Profiel** → "📋 Spelregels" of "❓ Handleiding & Help"

---

## Als KASHOUDER

### Dashboard
Toont in één oogopslag:
- Kassaldo (live berekend)
- Betaalvoortgang (% van leden betaald)
- Betaalbewijzen — te verifiëren betalingen
- Openstaande betalingen met WhatsApp-herinnering knop

### Betaling bevestigen
1. Dashboard → te verifiëren betaling → tik **✓**
2. Controleer eerst in de Tikkie-app of het geld echt is binnengekomen
3. Na bevestiging: kasmutatie aangemaakt, lid krijgt push-notificatie

### WhatsApp-herinnering sturen
- Kashouder dashboard → **"💬 Herinner"** knop naast lid
- Opent WhatsApp met vooraf ingevuld bericht + Tikkie-link
- Automatisch elke vrijdag 09:00 als lid status 'open' heeft

### Uitbetaling registreren
- Financieel beheer → **"Uitbetaling registreren"**
- Vul bedrag en omschrijving in
- Kassaldo wordt automatisch bijgewerkt

---

## Als BEHEERDER

### Trekking invoeren
1. Je ontvangt elke zaterdag **19:30** een push: *"🎱 Lotto-uitslag invoeren"*
2. Open **Trekkingen** → tik **"+ Invoeren"**
3. Tik **"🔗 Officiële uitslag opzoeken"** om nummers te checken
4. Vul de 6 nummers in (springt automatisch door)
5. Tik **"✓ Trekking opslaan & verwerken"**
6. Iedereen krijgt automatisch een push-notificatie met hun resultaat

### Na de trekking (automatisch)
- Resultaten opgeslagen in Firestore
- Ranglijstpunten bijgewerkt
- Betalingen voor volgende week aangemaakt (status: 'open')
- Leden met status 'open' krijgen vrijdag een herinnering

### Admin paneel (Beheer → Admin)
- **Instellingen** — Tikkie-link instellen
- **Spel** — aantal nummers, min/max, bonusbal
- **Prijzen** — prijsmodus instellen + opslaan
- **Seizoen** — nieuw seizoen starten/afsluiten
- **Audit log** — alle systeemactiviteit

### Tikkie-link instellen
1. Maak betaalverzoek aan in Tikkie-app (open bedrag, geen vervaldatum)
2. Omschrijving: "LottoClub - wekelijkse inleg"
3. Kopieer **alleen de URL** (`https://tikkie.me/pay/...`)
4. Beheer → Admin → Instellingen → Tikkie-link → plak → opslaan

> ⚠️ Plak ALLEEN de URL, niet de hele Tikkie-berichttekst.

---

## Push-notificaties

| Notificatie | Wanneer | Aan wie |
|---|---|---|
| ✅ Betaling bevestigd | Kashouder bevestigt | Lid |
| 🎰 Jackpot / 🎱 Resultaat | Na trekking | Alle deelnemers |
| 🎱 Trekking gemist | Na trekking | Niet-betalers |
| ⏰ Betaalherinnering | Vrijdag 09:00 | Leden met open betaling |
| 🎱 Uitslag invoeren | Zaterdag 19:30 | Beheerders |

### Inschakelen
1. App geïnstalleerd via beginscherm-icoontje
2. Open app via beginscherm-icoontje (niet Safari)
3. Profiel → Push notificaties → schakel in → geef toestemming

---

## Veelgestelde vragen

**Ik ontvang geen notificaties**
→ Open de app via het beginscherm-icoontje, niet via Safari
→ Profiel → Push notificaties → schakel in

**De "Ik heb betaald" knop is grijs**
→ Tik eerst op "💳 Betaal nu via Tikkie" — dan wordt de knop actief

**Ik zie "Nog niet betaald" terwijl ik al betaald heb**
→ De kashouder heeft je betaling nog niet bevestigd. Even wachten.

**Ik zie "Geen actief seizoen"**
→ De beheerder moet een nieuw seizoen starten via Beheer → Admin → Seizoen

**Mijn ticket wordt niet geaccepteerd**
→ Vul precies 6 unieke nummers in tussen 1 en 45

**Ik wil mijn naam wijzigen**
→ Profiel → Naam → wijzig → tik "Naam opslaan"

**Ik wil mijn telefoonnummer toevoegen**
→ Profiel → Telefoonnummer → vul in → tik "Opslaan"
→ Nodig voor WhatsApp-herinneringen van de kashouder

---

*LottoClub — Digitale lottovereniging app*
*Next.js 15 · Firebase · Vercel*
