# LottoClub — Gebruikershandleiding

**Versie:** 1.0 · **Datum:** 29 juni 2026

---

## Wat is LottoClub?

LottoClub is een app voor een lottovereniging. Leden betalen elke week een kleine inleg, de kashouder beheert de kas, en de beheerder voert de trekking in. Na elke trekking ziet iedereen automatisch hoeveel nummers ze goed hadden en wie er gewonnen heeft.

De app werkt als een **PWA** (Progressive Web App) — je installeert hem via Safari op je iPhone en opent hem daarna via het icoontje op je beginscherm, net als een gewone app.

---

## Installatie op iPhone

1. Open Safari en ga naar: **https://lotto-app-eight-chi.vercel.app**
2. Tik op het **Deel-icoontje** (vierkantje met pijltje omhoog) onderaan
3. Kies **"Zet op beginscherm"**
4. Tik op **"Voeg toe"**
5. Open de app voortaan via het **LottoClub-icoontje** op je beginscherm

> ⚠️ **Belangrijk:** push-notificaties werken ALLEEN als je de app via het beginscherm-icoontje opent, NIET via Safari direct.

---

## Inloggen

De app heeft vijf manieren om in te loggen:

### 1. E-mail + wachtwoord
- Vul je e-mailadres en wachtwoord in
- Tik op **"Inloggen"**

### 2. Account aanmaken
- Tik op **"Account aanmaken"**
- Vul je naam, e-mailadres en een wachtwoord in (minimaal 6 tekens)
- Je account krijgt automatisch de rol **Lid**

### 3. Wachtwoord vergeten
- Vul je e-mailadres in
- Tik op **"Vergeten?"** naast het wachtwoordveld
- Je ontvangt een e-mail met een reset-link

### 4. Magic link (inloggen via e-mail)
- Tik op **"✉️ Inloggen via e-mail link"**
- Vul je e-mailadres in
- Je ontvangt een e-mail met een klikbare link
- Tik op die link → je bent direct ingelogd, zonder wachtwoord
- > ⚠️ Open de link op hetzelfde toestel waarmee je de link hebt aangevraagd voor de beste ervaring

### 5. Google
- Tik op **"Doorgaan met Google"**
- Kies je Google-account
- Je bent direct ingelogd

---

## Rollen

Er zijn drie rollen in de app. Elke rol ziet andere schermen en heeft andere rechten.

| Rol | Wie | Wat kan die doen |
|---|---|---|
| **Lid** | Alle deelnemers | Eigen tickets beheren, betaling melden, trekkingen bekijken, ranglijst bekijken |
| **Kashouder** | Penningmeester | Alles wat een lid kan + betalingen bevestigen/afwijzen, kasboek beheren, WhatsApp-herinneringen sturen |
| **Beheerder** | Verenigingsbestuurder | Alles wat een kashouder kan + trekkingen invoeren, seizoenen beheren, rollen aanpassen, systeeminstellingen |

> **Let op:** er moet altijd minimaal 1 beheerder zijn. De app voorkomt dat de laatste beheerder zijn rol kwijtraakt.

---

## Wat doet een LID?

### Dashboard
Na het inloggen kom je op je persoonlijke dashboard. Hier zie je:
- Actuele kassaldo van de vereniging
- Volgende trekking
- Je eigen ranglijstpositie

### Tickets beheren (`/profiel`)
- Tik op **"+ Eerste ticket toevoegen"** of **"+ Toevoegen"**
- Vul 6 unieke nummers in (1-45, afhankelijk van de spelconfiguratie)
- Geef je ticket een naam (bijv. "Mijn vaste nummers")
- Sla op
- Je kunt meerdere tickets hebben
- Tickets worden automatisch meegenomen bij elke trekking

### Betaling melden (`/betalen`)
Elke ronde betaal je een inleg (standaard €4) aan de kashouder:
1. Maak het bedrag over via Tikkie-link (als die beschikbaar is) of gewone overboeking
2. Open de app → ga naar **"Betalen"**
3. Tik op **"Ik heb betaald"**
4. De kashouder bevestigt je betaling
5. Je ontvangt een push-notificatie: **"✅ Betaling bevestigd"**

### Trekkingen bekijken (`/trekkingen`)
- Overzicht van alle trekkingen
- Tik op een trekking om je resultaten te zien: hoeveel nummers had je goed?
- Je ziet ook wie er gewonnen heeft

### Ranglijst (`/ranglijst`)
- Overzicht van alle leden gesorteerd op punten
- Punten verdien je per trekking op basis van hoeveel nummers je goed had

### Hall of Fame (`/hall-of-fame`)
- All-time records van de vereniging
- Top 3 deelnemers aller tijden

### Kas bekijken (`/kas`)
- Overzicht van alle kasmutaties
- Je ziet het actuele kassaldo

---

## Wat doet een KASHOUDER?

De kashouder heeft toegang tot alles wat een lid heeft, plus het kashouder-dashboard.

### Kashouder dashboard (`/kashouder`)

**Kassaldo**
- Toont het actuele saldo, berekend uit alle kasmutaties
- Knoppen naar Uitbetalen en Kasboek

**Betaalvoortgang**
- Hoeveel leden hebben al betaald? (percentage + voortgangsbalk)
- Groen = iedereen betaald, oranje = nog niet iedereen

**Betaalbewijzen**
- Leden die hun betaling hebben gemeld staan hier
- Per melding: ✓ (bevestigen) of ✕ (afwijzen)
- Bij bevestiging: kasmutatie wordt automatisch aangemaakt, lid krijgt push-notificatie

**Openstaand**
- Leden met een openstaande betaling
- "💬 Herinner" knop → opent WhatsApp met een vooraf ingevuld bericht (inclusief Tikkie-link als die is ingesteld)

### Financieel beheer (`/kashouder/financieel`)

**Te verifiëren betalingen**
- Uitgebreider overzicht van alle betalingen die wachten op bevestiging
- Zelfde ✓/✕ functionaliteit als op het dashboard

**WhatsApp herinneringen**
- Lijst van alle leden met een telefoonnummer
- Per lid een "💬 Stuur" knop → opent WhatsApp met voorgevuld herinneringsbericht

**Uitbetaling registreren**
- Vul een bedrag en omschrijving in
- Registreert een negatieve kasmutatie (bijv. winnaar uitbetalen)

**Kascorrectie**
- Correctie doorvoeren als er iets niet klopt
- Positief (toevoeging) of negatief (aftrek)

### Kasboek (`/kas`)
- Volledig overzicht van alle kasmutaties
- Chronologisch, nieuwste eerst
- Inleg, uitbetalingen en correcties allemaal zichtbaar

---

## Wat doet een BEHEERDER?

De beheerder heeft toegang tot alles wat een kashouder heeft, plus het beheerder-dashboard en adminpaneel.

### Beheerder dashboard (`/beheerder`)

**Systeem overzicht**
- Aantal actieve leden (live)
- Naam van het actieve seizoen
- Actueel kassaldo

**Snelle acties**
- Trekking invoeren → gaat direct naar `/trekkingen`
- Leden beheren → gaat naar `/leden`
- Kasboek, Financieel beheer, Betalen, Instellingen

**Vereist aandacht**
- Automatische alerts bij openstaande betalingen of verificaties
- "✅ Alles in orde" als er niets open staat

**Seizoen**
- Naam en status van het actieve seizoen

### Trekkingen invoeren (`/trekkingen`)

1. Tik op **"+ Invoeren"** (alleen zichtbaar voor beheerders)
2. De invoer-modal opent — bovenaan staat een **"🔗 Officiële uitslag opzoeken"** link naar de Nederlandse Lotto website
3. Vul de 6 getrokken nummers in (auto-advance: springt automatisch naar het volgende veld)
4. Vul eventueel de bonusbal in
5. Tik op **"✓ Trekking opslaan & verwerken"**
6. De app controleert automatisch alle tickets van alle leden
7. Iedereen krijgt een push-notificatie met hun resultaat

**Automatische herinnering**
Elke zaterdag om 19:30 krijgt de beheerder een push-notificatie: *"🎱 Lotto-uitslag invoeren — De trekking van vanavond is beschikbaar."*

### Leden beheren (`/leden`)

- Overzicht van alle leden (naam, e-mail, rol, status)
- Rollen aanpassen via dropdown (lid / kashouder / beheerder)
- Filteren op: Alle / Actief / Inactief / Kashouders / Beheerders
- Zoeken op naam

**Eerste beheerder instellen:**
De allereerste beheerder moet handmatig worden ingesteld via Firebase Console → Firestore → `users/{uid}` → veld `rol: "beheerder"`. Daarna kan de beheerder via de app rollen aanpassen.

### Admin paneel (`/beheerder/admin`)

**Tab: Instellingen**
- Verenigingsinformatie (naam, standaard inleg)
- Betaalproviders (Offline actief, Mollie/Tikkie/Stripe beschikbaar voor toekomst)
- **Tikkie-link instellen:** vul hier de Tikkie-link van de kashouder in → wordt automatisch toegevoegd aan WhatsApp-herinneringen
- Notificatie-instellingen (betaalverzoeken, herinneringen, winnaar-notificatie)

**Tab: Spel**
- Naam van het spel
- Aantal te kiezen getallen
- Min. en max. getal
- Bonusbal aan/uit
- Wijzigingen worden direct opgeslagen in Firestore

**Tab: Prijzen**
- Prijsverdelingsmodus kiezen:
  - 🏆 Hoogste score wint (standaard)
  - 👥 Meerdere winnaars
  - 💰 Vaste prijzen per score

**Tab: Seizoen**
- Actief seizoen bekijken
- Nieuw seizoen starten (alleen als er geen actief seizoen is)
- Seizoen afsluiten
- Afgesloten seizoenen bekijken

**Tab: Audit log**
- Alle systeemactiviteit chronologisch
- Wie heeft wat gedaan en wanneer

---

## Push-notificaties

De app stuurt automatisch notificaties voor:

| Notificatie | Wanneer | Aan wie |
|---|---|---|
| ✅ Betaling bevestigd | Kashouder bevestigt betaling | Het betreffende lid |
| 🎱 Trekking resultaten | Beheerder voert trekking in | Alle leden |
| ⏰ Betaalherinnering | Elke vrijdag om 09:00 | Leden met openstaande betaling |
| 🎱 Lotto-uitslag invoeren | Elke zaterdag om 19:30 | Alle beheerders |

**Notificaties werken alleen als:**
1. De app is geïnstalleerd als PWA via het beginscherm-icoontje
2. Je toestemming hebt gegeven voor notificaties in de app
3. Je de app opent via het beginscherm-icoontje (niet via Safari)

---

## Betaalflow stap voor stap

```
1. Beheerder/kashouder maakt Tikkie-link aan
   → Eenmalig instellen in Admin → Instellingen → Tikkie-link

2. Elke ronde: kashouder stuurt WhatsApp-herinnering
   → Kashouder dashboard → "💬 Herinner" knop
   → Of automatisch elke vrijdag 09:00 als betaling open staat

3. Lid ontvangt WhatsApp met Tikkie-link
   → Tikt op link → betaalt €4 via eigen bank-app

4. Lid opent LottoClub-app → "Betalen"
   → Tikt op "Ik heb betaald"
   → Betaling verschijnt als "Te verifiëren" bij de kashouder

5. Kashouder ziet melding op dashboard
   → Tikt op ✓ → betaling bevestigd
   → Kasmutatie wordt automatisch aangemaakt
   → Lid krijgt push-notificatie "✅ Betaling bevestigd"
```

---

## Trekkingsflow stap voor stap

```
1. Elke zaterdag 19:30
   → Beheerder krijgt push-notificatie "🎱 Lotto-uitslag invoeren"

2. Beheerder opent app → Trekkingen → "+ Invoeren"
   → Tikt op "🔗 Officiële uitslag opzoeken" om nummers op te zoeken
   → Voert de 6 getrokken nummers in (+ eventueel bonusbal)
   → Tikt op "✓ Trekking opslaan & verwerken"

3. Automatisch (server-side Cloud Function):
   → Alle tickets van alle leden worden gecontroleerd
   → Ranglijstpunten worden bijgewerkt
   → Resultaten worden opgeslagen

4. Alle leden krijgen een push-notificatie:
   → "Jij had X goed. Winnaar: [naam]"

5. Leden kunnen resultaten bekijken via Trekkingen → detail
```

---

## Veelgestelde vragen

**Ik ontvang geen push-notificaties**
→ Controleer of je de app hebt geïnstalleerd via het beginscherm-icoontje (niet via Safari).
→ Open de app → Profiel → scroll naar "Push Notificaties" → schakel in en geef toestemming.
→ Controleer of je telefoon-instellingen notificaties toestaan voor LottoClub.

**Ik kan geen nieuwe betaling melden**
→ Je hebt mogelijk al een openstaande of bevestigde betaling voor deze ronde.
→ Wacht tot de kashouder je vorige betaling heeft verwerkt, of neem contact op met de kashouder.

**Ik zie "Geen actief seizoen"**
→ De beheerder moet een nieuw seizoen starten via Beheer → Admin → Seizoen → "🚀 Nieuw seizoen starten".

**Mijn ticket-nummers worden niet geaccepteerd**
→ Controleer of je het juiste aantal nummers hebt ingevuld (standaard 6).
→ Controleer of alle nummers uniek zijn en binnen het toegestane bereik vallen (standaard 1-45).

**Ik wil mijn telefoonnummer toevoegen voor WhatsApp-herinneringen**
→ Ga naar Profiel → scroll naar "Telefoonnummer" → vul in → tik "Opslaan".

---

## Contact & support

Bij technische problemen: neem contact op met de beheerder van de vereniging.

---

*LottoClub — Digitale lottovereniging app*
*Gebouwd met Next.js 15, Firebase, Vercel*
