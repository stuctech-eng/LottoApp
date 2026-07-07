# LottoClub — Gebruikershandleiding

**Versie:** 4.0 · **Datum:** 7 juli 2026

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

## Installatie op Android

1. Open **Chrome** → ga naar `lotto-app-eight-chi.vercel.app`
2. Tik op de **drie puntjes** rechtsboven
3. Kies **"Toevoegen aan startscherm"**
4. Open de app via het icoontje op je startscherm
5. Ga naar Profiel → Push notificaties → schakel in → geef toestemming

> ⚠️ Als notificaties niet werken: Android Instellingen → Apps → Chrome → Meldingen → Toestaan. Dan opnieuw proberen via de app.

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
Ma t/m za 18:00 — betaal via Tikkie, meld in app
Vrijdag 09:00 — automatische herinnering als je niet betaald hebt
Zaterdag 18:00 — betalen geblokkeerd (ballen vallen zo)
Zaterdag 19:30 — beheerder krijgt melding om uitslag in te voeren
Zaterdag avond — trekking verwerkt, iedereen krijgt push
Zondag — geblokkeerd, betalen kan pas weer maandag
```

> ⚠️ **Niet betalen op zondag of na zaterdag 18:00** — dat telt niet mee voor de aankomende trekking.

---

## Hoe alles samenwerkt

### Betaalflow stap voor stap

```
1. Na de trekking op zaterdag
   → App maakt automatisch een openstaande betaling aan
      voor elk actief lid voor de volgende week

2. Vrijdag 09:00
   → Automatische push-herinnering naar wie nog niet betaald heeft

3. Lid betaalt (maandag t/m zaterdag voor 18:00)
   → Tikt "Betaal via Tikkie" in de app
   → Tikkie opent — lid betaalt €4
   → Lid gaat terug naar app
   → Tikt "Ik heb betaald"
   → Betaling geregistreerd voor die week

4. Kashouder bevestigt
   → Checkt Tikkie — geld ontvangen?
   → Tikt ✓ in de app
   → Kasmutatie aangemaakt, kassaldo bijgewerkt
   → Lid krijgt push: "✅ Betaling bevestigd"

5. Zaterdag: trekking verwerkt
   → Alleen leden met bevestigde betaling doen mee
   → Kassaldo = pot van alle bevestigde betalingen
```

### Trekkingsflow stap voor stap

```
1. Zaterdag 19:30
   → Beheerder krijgt push: "🎱 Lotto-uitslag invoeren"

2. Beheerder opent Trekkingen → "+ Invoeren"
   → Tikt link naar officiële uitslag
   → Voert 6 nummers in
   → Tikt "✓ Trekking opslaan & verwerken"

3. Automatisch (server-side):
   → Controleert alle tickets van betalende leden
   → Ranglijst bijgewerkt
   → Resultaten opgeslagen

4. Push naar alle deelnemers:
   → Winnaar: "🎰 Jackpot! De ballen zijn gevallen... Jij wint €X!"
   → Verliezers: "🎱 Jij had X goed. Pot groeit naar €X!"
   → Niet-betalers: "🎱 Trekking gemist. Doe volgende week mee!"

5. Winnaar opent app
   → Confetti scherm met pot-bedrag
   → WhatsApp knop naar kashouder
   → Kashouder maakt bedrag over
   → Registreert uitbetaling in app

6. Automatisch:
   → Nieuwe openstaande betalingen aangemaakt voor volgende week
   → Cyclus herhaalt
```

---

## Als LID

### Ticket aanmaken
1. **Profiel** → tik **"+ Ticket toevoegen"**
2. Vul 6 unieke nummers in (1-45)
3. Geef je ticket een naam
4. Scroll naar beneden → tik **"✓ Opslaan"**

### Betalen (elke week, ma t/m za voor 18:00)
1. **Dashboard** → tik **"💳 Betaal €4"**
2. Tik **"💳 Betaal nu via Tikkie"** — Tikkie opent
3. Betaal €4 via Tikkie
4. Ga terug naar app — knop is nu actief
5. Tik **"✓ Ik heb betaald — €4"**
6. Wacht op bevestiging van kashouder

### Als je gewonnen hebt 🏆
Open de app → confetti-scherm verschijnt automatisch met:
- JACKPOT! en het pot-bedrag
- WhatsApp-knop naar de kashouder
- Stuur bericht → kashouder maakt geld over

---

## Als KASHOUDER

### Betaling bevestigen
1. **Dashboard** → te verifiëren betaling → tik **✓**
2. Check eerst in Tikkie of het geld is binnengekomen
3. Na bevestiging → lid krijgt push, kasmutatie aangemaakt

### Betaalvoortgang
Het dashboard toont alleen betalingen van de **huidige week**. Vorige weken tellen niet mee. Kassaldo blijft altijd optellen over alle weken.

### Winnaar uitbetalen
1. Winnaar stuurt WhatsApp via de app
2. Maak bedrag over via bank
3. **Financieel** → "Uitbetaling registreren" → kassaldo bijgewerkt

### Tikkie-link vernieuwen (vóór vervaldatum)
1. Tikkie-app → nieuw betaalverzoek
2. Omschrijving: "LottoClub - wekelijkse inleg"
3. Open bedrag, geen vervaldatum
4. Kopieer **alleen de URL**
5. **Beheer → Admin → Instellingen → Tikkie-link** → plak → opslaan

---

## Als BEHEERDER

### Trekking invoeren
1. Zaterdag 19:30 → push ontvangen
2. **Trekkingen** → **"+ Invoeren"**
3. Tik **"🔗 Officiële uitslag opzoeken"**
4. Vul 6 nummers in → **"✓ Trekking opslaan & verwerken"**
5. Iedereen krijgt automatisch een push

### Prijsmodus instellen
**Beheer → Admin → Prijzen → "🎯 Alleen alle nummers goed wint" → "💾 Prijsmodus opslaan"**

Dit staat al correct ingesteld op `alle_goed_wint`.

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

---

## Veelgestelde vragen

**De "Ik heb betaald" knop is grijs**
→ Tik eerst op "💳 Betaal nu via Tikkie"

**Betalen niet mogelijk**
→ Het is zaterdag na 18:00 of zondag. Betaal vanaf maandag.

**Ik ontvang geen notificaties (iPhone)**
→ Open app via beginscherm-icoontje → Profiel → Push notificaties → schakel in

**Ik ontvang geen notificaties (Android)**
→ Android Instellingen → Apps → Chrome → Meldingen → Toestaan
→ App opnieuw openen via icoontje → Profiel → Push notificaties → aan

**Betaalvoortgang toont 0%**
→ Betalingen van vorige weken tellen niet mee. Alleen de huidige week telt.

**Ik zie "Geen actief seizoen"**
→ Beheer → Admin → Seizoen → "Nieuw seizoen starten"

**Mijn naam klopt niet**
→ Profiel → Naam → wijzig → "Naam opslaan"

---

*LottoClub — Digitale lottovereniging · Next.js 15 · Firebase · Vercel*
