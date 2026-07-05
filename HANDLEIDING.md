# LottoClub — Gebruikershandleiding

**Versie:** 3.0 · **Datum:** 5 juli 2026

---

## Wat is LottoClub?

LottoClub is een app voor een lottovereniging. Leden betalen elke week €4 inleg, de kashouder beheert de kas, en de beheerder voert de trekking in na de Nederlandse Lotto op zaterdagavond. Wie alle 6 nummers goed heeft, wint de hele pot!

---

## Installatie op iPhone

1. Open **Safari** → ga naar `lotto-app-eight-chi.vercel.app`
2. Tik op het **Deel-icoontje** onderaan
3. Kies **"Zet op beginscherm"**
4. Tik **"Voeg toe"**
5. Open de app voortaan via het **LottoClub-icoontje** op je beginscherm

> ⚠️ Push-notificaties werken ALLEEN via het beginscherm-icoontje, niet via Safari.

---

## Inloggen

- **Email + wachtwoord** — vul in en tik Inloggen
- **Wachtwoord vergeten** — tik "Vergeten?" → reset per email (link geldig 1 uur, kan even duren)
- **Magic link** — tik "Inloggen via email link" → link per email → direct ingelogd
- **Google** — tik "Doorgaan met Google" → direct ingelogd
- **Account aanmaken** — vul naam, email en wachtwoord in → krijgt rol Lid

---

## Spelregels

**💳 Betaling = deelname**
Alleen wie de inleg van die week heeft betaald én de kashouder dit heeft bevestigd doet mee. Niet betaald = automatisch uitgesloten die week.

**🎱 1 ticket per persoon**
Iedereen heeft precies 1 ticket met 6 nummers. Gelijke kansen voor iedereen.

**🏆 Alleen alle 6 nummers goed is winnen**
Je wint alleen als alle 6 nummers overeenkomen met de getrokken nummers. Minder dan 6 goed = geen winnaar deze week.

**🔄 Geen winnaar? Pot blijft staan (rollover)**
Pot groeit volgende week verder.

**💰 Pot opgebouwd door betalers**
Alleen inleg van leden die betaald hebben telt mee.

**🎉 Meerdere winnaars mogelijk**
Pot wordt gelijkelijk verdeeld.

---

## Wekelijkse cyclus

```
Maandag — nieuwe week begint, betalen kan weer
Ma t/m vr — betaal via Tikkie, meld in app
Vrijdag 09:00 — automatische herinnering als je niet betaald hebt
Zaterdag 18:00 — betalen geblokkeerd (ballen vallen zo)
Zaterdag 19:30 — beheerder krijgt melding om uitslag in te voeren
Zaterdag avond — trekking verwerkt, iedereen krijgt push
```

> ⚠️ **Niet betalen op zondag** — dat is nog de oude week en telt niet mee voor de aankomende trekking. Wacht tot maandag.

---

## Als LID

### Ticket aanmaken
1. Ga naar **Profiel** → tik **"+ Ticket toevoegen"**
2. Vul 6 unieke nummers in (1-45)
3. Geef je ticket een naam
4. Scroll naar beneden → tik **"✓ Opslaan"**

### Betalen (elke week, maandag t/m zaterdag voor 18:00)
1. Tik op **"💳 Betaal €4"** op het dashboard
2. Tik **"💳 Betaal nu via Tikkie"** — Tikkie opent
3. Betaal €4 via Tikkie
4. Ga terug naar de app — knop is nu actief
5. Tik **"✓ Ik heb betaald — €4"**
6. Kashouder bevestigt → push: **"✅ Betaling bevestigd"**

> ⚠️ Betaal EERST via Tikkie — daarna pas melden. De knop is geblokkeerd totdat je Tikkie hebt geopend.

### Als je gewonnen hebt 🏆
Open de app na de trekking — je ziet een **confetti-scherm** met:
- JACKPOT! en het pot-bedrag
- Een WhatsApp-knop naar de kashouder
- Stuur de kashouder een bericht — die maakt het geld over

### Trekkingen bekijken
Ga naar **Trekkingen** → tik op een trekking → zie jouw eigen nummers en hoeveel je goed had.

---

## Als KASHOUDER

### Betaling bevestigen
1. **Dashboard** → te verifiëren betaling → tik **✓**
2. Controleer eerst in Tikkie of het geld echt is binnengekomen
3. Na bevestiging: lid krijgt push, kasmutatie aangemaakt

### Winnaar uitbetalen
1. Winnaar stuurt WhatsApp via de app
2. Maak het pot-bedrag over via bank-overboeking
3. **Financieel beheer** → "Uitbetaling registreren" → kassaldo bijgewerkt

### Tikkie-link instellen/vernieuwen
1. Open Tikkie-app → maak betaalverzoek aan
2. Omschrijving: "LottoClub - wekelijkse inleg"
3. Open bedrag, geen vervaldatum
4. Kopieer **alleen de URL** (`https://tikkie.me/pay/...`)
5. **Beheer → Admin → Instellingen → Tikkie-link** → plak → opslaan

---

## Als BEHEERDER

### Trekking invoeren
1. Zaterdag 19:30 → push: *"🎱 Lotto-uitslag invoeren"*
2. **Trekkingen** → **"+ Invoeren"**
3. Tik **"🔗 Officiële uitslag opzoeken"**
4. Vul 6 nummers in → tik **"✓ Trekking opslaan & verwerken"**
5. Iedereen krijgt automatisch een push

### Na de trekking (automatisch)
- Resultaten opgeslagen
- Ranglijstpunten bijgewerkt
- Betalingen voor volgende week aangemaakt
- Leden met 'open' betaling krijgen vrijdag herinnering

---

## Push-notificaties

| Notificatie | Wanneer | Aan wie |
|---|---|---|
| ✅ Betaling bevestigd | Kashouder bevestigt | Lid |
| 🎰 Jackpot! | Winnende trekking | Winnaar |
| 🎱 Trekking resultaat | Na trekking | Alle deelnemers |
| 🎱 Trekking gemist | Na trekking | Niet-betalers |
| ⏰ Betaalherinnering | Vrijdag 09:00 | Leden met open betaling |
| 🎱 Uitslag invoeren | Zaterdag 19:30 | Beheerders |

### Inschakelen
1. App via beginscherm-icoontje openen
2. **Profiel** → Push notificaties → schakel in

---

## Veelgestelde vragen

**De "Ik heb betaald" knop is grijs**
→ Tik eerst op "💳 Betaal nu via Tikkie"

**Ik zie "Betalen niet mogelijk"**
→ Het is zaterdag na 18:00 of zondag. Betaal vanaf maandag.

**Ik zie "Betaling bevestigd" maar heb niet betaald**
→ Dit is een betaling van een vorige week. De app toont alleen betalingen van de huidige week.

**Ik ontvang geen notificaties**
→ Open de app via het beginscherm-icoontje (niet Safari) → Profiel → Push notificaties → schakel in

**Ik zie "Geen actief seizoen"**
→ Beheerder moet nieuw seizoen starten via Beheer → Admin → Seizoen

**Mijn ticket wordt niet geaccepteerd**
→ Vul precies 6 unieke nummers in tussen 1 en 45

**Ik wil mijn naam wijzigen**
→ Profiel → Naam → wijzig → "Naam opslaan"

---

*LottoClub — Digitale lottovereniging · Next.js 15 · Firebase · Vercel*
