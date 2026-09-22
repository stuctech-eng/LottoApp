# LottoClub 🎱

Digitale lottovereniging app — Next.js 16, TypeScript, Firebase

## Live
🌐 https://lotto-app-eight-chi.vercel.app

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Auth + DB**: Firebase (Auth + Firestore + Cloud Functions + FCM)
- **PWA**: Serwist (`@serwist/turbopack`) — offline caching **én** Firebase Cloud Messaging in **één** service worker (`app/sw.ts`, via `app/serwist/[path]/route.ts`) — zie architectuurregel 11 voor waarom dit niet twee losse workers meer zijn
- **Deploy**: Vercel (app, auto-deploy via GitHub) + GitHub Actions (Cloud Functions én Firestore rules, zie `.github/workflows/`)
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
| Neeltje Veerman | — | Lid | ✅ Ja — toegetreden tijdens een lopende speelreeks, zat tijdelijk in de wachtrij (zie hieronder) |

Plus incidentele testaccounts (`+alias`-adressen op stuctech@gmail.com) — na testen via Leden → Inactief → 🗑️ definitief verwijderd.

---

## Rollen

| Rol | Wat |
|---|---|
| **Beheerder** | Alles — trekkingen, kas, leden, instellingen, meespelen, leden uitnodigen/verwijderen |
| **Kashouder** | Kas beheren + meespelen + leden uitnodigen |
| **Lid** | Alleen meespelen |

Navigatie (bottom nav + terugknoppen) is overal **rol-afhankelijk**.

---

## Wachtrij voor nieuwe leden (15 augustus 2026)

**Een nieuw lid mag pas volledig meedoen zodra de huidige speelreeks eindigt.** Instappen halverwege een reeks zou oneerlijk zijn — andere spelers hebben dan al cumulatief nummers verzameld.

### Hoe het werkt
1. Bij het verzilveren van een uitnodiging checkt de Cloud Function (`heeftHuidigeSpeelreeksAlTrekkingen()`) of de huidige speelreeks al minstens 1 trekking heeft gehad
2. Zo ja → `wachtOpNieuweSpeelreeks: true` op het nieuwe profiel
3. **Wat wél mag**: ticket instellen, alvast storten op LottoSaldo (blijft gewoon onaangeroerd staan — geen aparte "bevries"-functie nodig, want er wordt simpelweg nooit iets van afgeschreven zolang deze vlag aan staat)
4. **Wat niet gebeurt**: `onBetalingenAanmaken` (wekelijkse cyclus) én `verrekenLottoSaldoMetOpenstaandeWeek` (storting-verrekening) slaan een wachtend lid allebei expliciet over — **beide plekken moesten apart worden gefixt**, zie het Neeltje-incident hieronder
5. Dashboard toont een duidelijke banner: *"⏳ Je wacht op de nieuwe speelreeks"*
6. Onboarding (`/welkom`, laatste stap) toont een aangepaste bevestiging afhankelijk van de situatie — geen pushmelding op dit moment (er bestaat nog geen FCM-token zo vroeg in het proces)
7. Zodra er een winnaar valt (`onTrekkingVerwerkt`): alle wachtende leden worden **in dezelfde stap** vrijgegeven (`wachtOpNieuweSpeelreeks: false`) **en** krijgen een pushmelding — gegarandeerd ná de vrijgave, nooit ervoor (de vrijgave zelf triggert de Cloud Function die de nieuwe week aanmaakt)

### Het Neeltje-incident — een echte bug, gevonden door een echt nieuw lid
Een écht nieuw lid (geen testaccount) kreeg ondanks de wachtrij-vlag toch €4 automatisch afgeschreven. Oorzaak: `verrekenLottoSaldoMetOpenstaandeWeek` (aangeroepen bij elke storting-registratie) checkte de wachtrij-vlag niet — alleen de wekelijkse cyclus deed dat. **Twee plekken die hetzelfde principe moeten afdwingen, en er was er één vergeten.** Handmatig gecorrigeerd (saldo terug, betaling ongedaan gemaakt via de bestaande correctietools, geen kascorrectie nodig want de storting zelf klopte al) en de code gefixt op de gemiste plek.

---

## Leden verwijderen — twee niveaus (27 juli + 15 augustus 2026)

**Niveau 1 — soft-delete (❌, iedereen):** Leden → ❌ naast een actief lid (beheerder-only, niet bij jezelf) → `actief: false`. Account en alle historische data blijven volledig bewaard. Terugkeren via de **"Heractiveren"**-knop (niet via een nieuwe uitnodiging — dat zou altijd worden geweigerd, want `verzilverUitnodiging` staat nooit een tweede profiel voor hetzelfde account toe).

**Niveau 2 — definitief verwijderen (🗑️, alleen bij al-inactieve leden):** Leden → filter "Inactief" → 🗑️. **Onomkeerbaar** — het Firestore-profiel wordt echt verwijderd (`deleteDoc`), bedoeld voor test-accounts, niet voor leden die echt hebben meegespeeld. Raakt bewust **niet** het onderliggende Firebase Auth-account (vereist Admin SDK, niet beschikbaar vanaf de client) — dat blijft onschadelijk, technisch bestaan; een nieuwe uitnodiging op hetzelfde e-mailadres zou gewoon een vers profiel aanmaken.

---

## Ledenbeheer & Authenticatie (26-27 juli 2026)

**Open registratie bestaat niet meer.** Nieuwe leden kunnen **uitsluitend** via een geldige, eenmalige uitnodiging toetreden — zie `/uitnodiging/[token]`, de Cloud Function `verzilverUitnodiging` (server-side, één transactie, voorkomt dubbel gebruik), en `/geen-toegang` voor wie geen geldig profiel heeft.

**Startinfo & Speluitleg**: `/spelregels` en `/help` zijn beide redirects naar **`/startinfo`** — de enige, officiële informatiepagina.

---

## Spelregel (definitief — vaste, enige spelmodus)

**"6 goed is winnaar" — cumulatief per speelreeks.**

1. **Betaling = deelname** — alleen bevestigde betaling voor die specifieke week telt mee.
2. **1 ticket per persoon.**
3. **Cumulatieve matching**: elk nummer dat een speler goed heeft, wordt permanent bijgeschreven binnen de huidige speelreeks.
4. **Winnen bij 6 unieke goede nummers**, cumulatief over eventueel meerdere trekkingen.
5. **Meerdere winnaars mogelijk.**
6. **Geen winnaar → rollover.**
7. **Na winnaar(s) → nieuwe speelreeks**, automatisch — grens wordt afgeleid uit de trekkingsgeschiedenis.
8. **Ranglijstpunten** gebaseerd op alleen de nieuwe matches die trekking, niet het cumulatieve totaal.
9. **Storten mag alleen maandag t/m zaterdag 18:00.**
10. **Nieuwe leden wachten op de eerstvolgende winnaar** als ze instappen tijdens een lopende reeks — zie hierboven.

### Voorbeeld
```
Ticket:        6 - 12 - 18 - 23 - 31 - 44
Trekking 1:     6 -  8 - 19 - 27 - 33 - 41  →  1 nieuw   → totaal 1/6
Trekking 2:    12 - 16 - 22 - 35 - 39 - 44  →  2 nieuw   → totaal 3/6
Trekking 3:    18 - 23 - 31 - 40 - 42 - 45  →  3 nieuw   → totaal 6/6 → WINNAAR
```

---

## Betalen — één enkele route

**Alles is een storting**, geen minimum. `stortLottoSaldo` verhoogt saldo + kasmutatie + verrekent direct een openstaande week (mits het lid niet in de wachtrij zit — zie hierboven). `onBetalingenAanmaken` (wekelijkse cyclus, na elke trekking) doet hetzelfde automatisch als er genoeg saldo is.

`verrekenLottoSaldoMetOpenstaandeWeek` gebruikt `relevanteTrekkingWeek()` (niet de kalenderdatum) én checkt sinds 15 augustus ook `wachtOpNieuweSpeelreeks`.

### Belangrijkste boekhoudregel
> Een storting telt **direct** mee in de kas. De wekelijkse afboeking daarna raakt **nooit** de kas opnieuw aan — alleen het `lottoSaldo`-veld.

### Correctietools (Beheerder)
- **Financieel → LottoSaldo → potloodje (✎)** → saldo direct zetten, geen kasmutatie.
- **Financieel → Betaling corrigeren** → status naar `'gecorrigeerd'`, met **"↺ Herstel"**. Nooit door elkaar gebruiken met de saldo-correctie voor hetzelfde incident. **Corrigeert alléén de betaalstatus, nooit het saldo of de kas** — zie architectuurregel 12.
- **Financieel → Openstaand → 🔁 Verreken** (nieuw, 22 september 2026) → verrekent bestaand LottoSaldo met een openstaande week, boekt géén nieuw geld. Voor als een lid al genoeg saldo heeft liggen maar een eerdere verrekening naar de verkeerde week ging (zie het Kees-incident, `docs/changelog.md`).
- **Beheer → Admin → Historisch prijsbedrag invullen / Alle winnaars herberekenen / Bekijk berekening laatste winnaar** (nieuw, 20-22 september 2026) — zie "Prijsbedrag bij winst" hieronder.

### Tikkie laatst gecontroleerd (15 augustus 2026)
Financieel-pagina toont bovenaan *"💳 Tikkie laatst gecontroleerd: [datum/tijd]"* — puur afgeleid uit de meest recente `'inleg'`-kasmutatie, geen aparte knop of veld nodig. Elke storting-registratie is zelf al het bewijs dat Tikkie is gecheckt.

---

## Prijsbedrag bij winst (20-22 september 2026)

**Wat een winnaar krijgt te zien is het eigen aandeel in de prijzenpot van déze speelreeks — nooit het totale kassaldo.** Vóór deze sessie gebruikten `WinnaarScherm`, de winst-pushmelding, én (indirect) de kas-weergave alle drie het totale, cumulatieve kassaldo — een te hoog, misleidend bedrag zodra er al vooruitbetaald LottoSaldo voor toekomstige weken in de kas zat. Zie `docs/changelog.md` voor de volledige root-cause-analyse (drie losse incidenten).

### Hoe het nu werkt
1. `berekenPrijzenpotServerSide()` (server-side, admin-SDK-variant van de al bestaande client-functie `berekenActuelePrijzenpot()`) rekent de pot uit: som van bevestigde, niet-storting-betalingen sinds de laatste winnende trekking.
2. Bij een winnaar wordt dit bedrag, **gedeeld door het aantal winnaars**, als `prijsBedrag` vastgelegd op elk winnend `resultaat` — in `onTrekkingVerwerkt`, vóór de resultaten-batch (zodat de eigen winst nog niet meetelt bij het bepalen van de speelreeks-grens).
3. Vastgelegd = blijvend correct, ook als er daarna nieuwe stortingen binnenkomen. `WinnaarScherm`, de trekking-detailpagina en de dashboard-winnaarskaart tonen allemaal `resultaat.prijsBedrag`, nooit een live herberekend bedrag.
4. Zelfde logica in `herberekenSpeelreeks`, voor consistentie bij een handmatige herberekening.

### Beheerder-tools (Beheer → Admin)
- **💰 Historisch prijsbedrag invullen** — eenmalige backfill voor winnaars van vóór dit veld bestond. Vult alleen ontbrekende bedragen.
- **♻️ Alle winnaars herberekenen** — herberekent iedereen opnieuw, ook winnaars met een al ingevuld bedrag. Nodig na een correctie in de brondata (bijv. een foutieve betaling die alsnog is gecorrigeerd).
- **🔍 Bekijk berekening laatste winnaar** — alleen-lezen, itemized lijst van elke meegetelde betaling (week + lid + bedrag). Gebouwd om een onverwacht bedrag te kunnen controleren zonder door het auditlog te hoeven scrollen.

### Bekende, geaccepteerde aanname
Bij meerdere winnaars in dezelfde trekking krijgt elk zijn eigen, gedeelde aandeel — dit is een expliciete bevestiging van de beheerder tijdens overleg (matcht ook de bestaande tekst op `/startinfo`: "wordt de pot gelijk verdeeld"), geen zelfstandige aanname.

---

## Notificaties — een lange speurtocht, drie losse bugs (15 augustus 2026)

Meldingen "werkten eerder wel" maar leken op een gegeven moment niet meer aan te komen. Grondig regressieonderzoek (git-geschiedenis, Cloud Logging) vond **drie onafhankelijke problemen**, na elkaar ontdekt:

### Bug 1 — dode tokens werden nooit echt opgeruimd
`sendToTokens()` in de Cloud Function **logde** dat ongeldige tokens "worden opgeschoond", maar deed dat in werkelijkheid nooit (`deleteDoc()` ontbrak). Dode tokens (ontstaan door PWA-herinstallaties, cache-wissen) stapelden zich voor altijd op, en werden bij élke melding opnieuw geprobeerd — tot er geen enkel geldig token meer overbleef. **Gefixt**: echte verwijdering toegevoegd, op alle 9 plekken die `sendToTokens` aanroepen (functie kreeg een verplichte `userId`-parameter om te weten uit welke subcollectie te verwijderen).

### Bug 2 — het token werd nooit automatisch ververst
De notificatie-toggle op Profiel (`notifActief`) begon **altijd** op `false` bij elke page-load, ongeacht of er al eerder toestemming was gegeven. Het token werd daardoor alleen ververst op het exacte moment dat iemand de toggle handmatig omzette — in de praktijk bijna nooit. **Gefixt**: een nieuwe `useEffect` in `lib/auth-context.tsx` ververst het token automatisch bij **elke** ingelogde sessie (gebaseerd op de echte `Notification.permission`, niet op React-state) — werkt nu voor de hele app, niet alleen wie toevallig de togglet aanraakt.

### Bug 3 — twee service workers streden om de controle (de uiteindelijke hoofdoorzaak)
Firebase Messaging draaide in een **apart** bestand (`public/firebase-messaging-sw.js`) naast de Serwist PWA-caching-worker (`app/sw.ts`, met `skipWaiting: true` + `clientsClaim: true`). Twee actieve service workers op hetzelfde origin kunnen elkaar als "controller" verdringen — de caching-worker nam bij elke page-load de controle over, waardoor de messaging-worker er niet meer was om `showNotification()` aan te roepen. **Resultaat**: de server meldde "succes" (het bericht kwam echt aan bij Apple/Firebase), maar er verscheen nooit iets. **Gefixt**: Firebase Messaging is nu **samengevoegd** in dezelfde ene worker als de caching-logica (`app/sw.ts`, via `firebase/messaging/sw` — de moderne, module-gebaseerde API). `public/firebase-messaging-sw.js` bestaat niet meer (leeg, veilig te verwijderen uit de repo).

**Diagnose-aanpak die hielp**: bij elke stap een test gebouwd die de échte foutmelding **in de app zelf** toont (niet verstopt achter Firebase's generieke "internal") — inclusief een testfunctie die bewust een `notification`-veld meestuurt om te isoleren of het probleem in de data-only-aanpak zat (bleek van niet — sloot dat uit als oorzaak, wat uiteindelijk naar de service-worker-conflict-hypothese leidde).

### Nieuwe, samengevoegde notificatiepagina: `/profiel/notificaties`
Verving zowel de losse toggle op Profiel als de aparte, beheerder-only `/debug-fcm`-pagina (nu een redirect):
- **Tab "Instellingen"**: hoofdschakelaar + 5 losse categorieën (`trekkingResultaten`, `betalingBevestigd`, `herinneringen`, `winnaars`, `ranglijstUpdates`) — nieuw `NotificationSettings`-type, ook client-kant toegevoegd (was er al server-kant)
- **Tab "Test"**: volledige diagnostiek, testmelding-knop (voor iedereen, test alleen het eigen account), en de handmatige zaterdag-herinnering-trigger (beheerder-only binnen de tab, want die stuurt naar iedereen)

---

## Zaterdag-saldo-herinnering (15 augustus 2026)

Elke zaterdag 12:00 (`onZaterdagSaldoHerinnering`) — persoonlijk bericht per spelend lid (niet-wachtend), gebaseerd op actueel saldo:
- Genoeg saldo: *"🎱 Vanavond vallen de ballen! Je saldo staat op €X — genoeg om mee te doen! 🍀"*
- Te weinig: *"...dat is niet genoeg. Stort vóór 18:00 vandaag via Tikkie om mee te doen!"*

Schrijft een volledig statusverslag naar `debug/zaterdagSaldoHerinnering` (per-lid reden zichtbaar: verstuurd/geen ticket/wacht op speelreeks/geen token), zichtbaar op `/profiel/notificaties` (Test-tab, beheerder) — inclusief een knop om **handmatig** te triggeren zonder een week te hoeven wachten.

---

## Geplande notificaties — beheerder maakt zelf meldingen (15 augustus 2026)

**Beheer → tab "🔔 Notificaties"**: de beheerder kan zelf eenmalige of wekelijkse meldingen aanmaken, bewerken, pauzeren en verwijderen — zonder dat daar ooit nog een nieuwe deploy voor nodig is. Dit was tot dan toe niet mogelijk: elke geplande melding (zoals de zaterdag-12:00-herinnering hierboven) stond hardgecodeerd in de Cloud Function zelf.

### Architectuur — bewust géén aparte scheduler per notificatie
Firebase Cloud Functions kan geen dynamische, per-melding schema's aanmaken (schema's liggen vast bij deploy-tijd). Oplossing, na overleg met GPT als tweede AI-mening (Claude blijft eindverantwoordelijk voor wat daadwerkelijk gebouwd wordt): **één vaste achtergrondfunctie** (`verwerkGeplandeNotificaties`, elke 5 minuten) die een Firestore-collectie (`geplandeNotificaties`) checkt op wat er *nu* verstuurd moet worden — puur data-gedreven, geen code-wijziging nodig voor een nieuwe melding.

- **Doelgroepen**: 3 vaste opties — alle leden, alleen spelende leden (`actief && tickets.length > 0 && !wachtOpNieuweSpeelreeks`, exact dezelfde definitie als elders in de app), of beheerder+kashouder. Bewust geen losse ledenselectie ("onnodig complex voor nu").
- **Herhaling**: eenmalig, of wekelijks (herhaalt op dezelfde dag-van-de-week + tijdstip als het oorspronkelijke gekozen moment).
- **Valt onder de bestaande "Herinneringen"-instelling** — een beheerder kan zo nooit de eigen notificatievoorkeur van een lid overrulen; gebruikt gewoon `getFcmTokens(userId, 'herinneringen')`.
- **Dubbele verzending bij wekelijkse meldingen voorkomen**: een atomaire "claim" per periode. Elke keer dat de achtergrondfunctie iets wil versturen, probeert die eerst een document aan te maken op `notificatieVerzendingen/{notificatieId}_{periode}` via Firestore's `create()` — die faalt vanzelf (ALREADY_EXISTS) als een andere run dit al claimde. Geen handmatige transactie-logica nodig; dit is atomisch door hoe `create()` zelf werkt. **Vooraf geïsoleerd getest** met 9 scenario's (inclusief het kritieke: twee "gelijktijdige" claimpogingen, waarvan er precies één mag slagen) voordat het ooit naar productie ging.
- **Handmatig testen**: een knop ("▶ Nu checken wat er aan de beurt is") roept dezelfde kernlogica synchroon aan, zodat een nieuwe melding niet op de eerstvolgende 5-minuten-tik hoeft te wachten om te verifiëren.

### Firestore
```
/geplandeNotificaties/{id}
  titel, bericht, doelgroep, herhaling, geplandOp, actief,
  laatstVerstuurdOp, laatstVerstuurdVoorPeriode,
  aangemaaktDoor, aangemaaktDoorNaam, aangemaaktOp

/notificatieVerzendingen/{notificatieId}_{periode}
  notificatieId, periode, verstuurdOp,
  aantalDoelgroep, aantalMetToken, aantalVerstuurd
```
Rules: `geplandeNotificaties` — lezen voor iedereen ingelogd, schrijven alleen beheerder. `notificatieVerzendingen` — puur statuslogging, nooit vanaf de client schrijfbaar (de atomaire claim gebeurt via de Cloud Function/Admin SDK).

---

## Vereniging-instellingen

Beheer → Instellingen → "Vereniging": **Naam vereniging** en **Standaard inleg** bewerkbaar, opgeslagen in `/verenigingConfig/main`.

---

## Voorwaarden & Privacy (15 augustus 2026)

`/profiel/voorwaarden` — een informele, leesbare voorwaarden- en privacypagina, bereikbaar via Profiel. Inhoud is tot stand gekomen via een concept-tekst die eerst aan GPT is voorgelegd voor een tweede mening (Claude blijft eindverantwoordelijk voor wat er in de app terechtkomt), met als expliciete afspraak: **geen eigen juridische conclusies trekken** (bijv. nooit beweren "wij zijn vergunningvrij" — dat is een inschatting die niet in eigen voorwaarden hoort, ook al maakt de Kansspelautoriteit wel degelijk onderscheid voor besloten kring-kansspelen).

Twee dingen zijn **dynamisch** gemaakt t.o.v. het oorspronkelijke concept, in plaats van hardgecodeerd:
- Het bedrag van de standaard inleg (leest live uit `/verenigingConfig/main`, i.p.v. een hardgecoded "€4" dat zou verouderen als het bedrag ooit wijzigt)
- De namen van de huidige beheerder(s)/kashouder(s) in de voettekst (leest live uit de ledenlijst, i.p.v. `[naam]`-placeholders)

14 secties: wie kan meedoen, hoe het spel werkt, betaalde deelname, betalen, de digitale kas, transparantie, uitnodigingen, welke gegevens worden bewaard, privacy, wat er gebeurt als je stopt, aansprakelijkheid voor technische storingen, verwijzing naar Startinfo & Speluitleg, contact, en een slotwoord.

---

## Betaalcyclus (grotendeels automatisch)

```
Maandag: nieuwe ISO-week begint
Ma t/m za 18:00: LottoSaldo dekt automatisch, anders: lid stort, kashouder registreert
Vrijdag 09:00: push naar wie deze week nog open staat
Vrijdag 20:00: push naar kashouder/beheerder — "Tikkie checken"
Zaterdag 12:00: persoonlijke saldo-herinnering naar spelende leden
Zaterdag 18:00: storten geblokkeerd
Zaterdag 19:30: beheerder krijgt push "uitslag invoeren"
Zaterdag avond: trekking verwerkt → resultaten, push, wachtende leden vrijgegeven bij winnaar
Zondag: geblokkeerd tot maandag
```

---

## KRITIEKE ARCHITECTUURREGELS

### 1. Geen orderBy in Firestore queries
**NOOIT `orderBy()` gebruiken.** Vereist een composite index; zonder index: stille lege array.

### 2. ISO-8601 weekberekening — "kalenderweek" ≠ "relevante week"
Gebruik voor weergave en verrekening altijd `relevanteTrekkingWeek(betalingen)`, nooit blind `huidigTrekkingWeek()`.

### 3. Data-only FCM payload
Nooit top-level `notification` veld in `sendToTokens` — de (samengevoegde) service worker toont de melding zelf via `showNotification()`. Zie ook regel 11.

### 4. kasSaldo nooit opslaan
Altijd `berekenKasSaldo(kasmutaties)`.

### 5. Controle-engine identiek
`lib/controle-engine.ts` en `functions/src/lib/controle-engine.ts` altijd byte-voor-byte identiek.

### 6. Cumulatieve matching + handmatige veldmappings
**Handmatige Firestore-veldmappings zijn dé terugkerende bronfout van dit project** — inmiddels misgegaan bij: `matchedNumbers`, `lottoSaldo`, `lottoSaldoIntroSeen`, `onboardingCompleted`, en (bijna) `wachtOpNieuweSpeelreeks`/`notificationSettings` (dit keer wel in één keer goed gedaan, met een geautomatiseerd script dat de exacte inspringing per bestand overnam). **Check bij elk nieuw veld op `User`/`Resultaat`, zonder uitzondering, alle plekken waar dat type handmatig gemapt wordt**: `lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`, `lib/firestore-trekkingen.ts`.

### 7. Herberekenen in plaats van migratiescripts
Ontbrekend veld = impliciete default, overal consistent toegepast (`actief`, `onboardingCompleted`, en nu ook `wachtOpNieuweSpeelreeks`/`notificationSettings`) — nooit een los migratiescript nodig.

### 8. Geen alternatieve spelmodi
`PrijsConfig` bewust volledig verwijderd.

### 9. Firestore rules: repo en productie kunnen driften
Regels moeten kloppen met wíe de schrijfactie daadwerkelijk uitvoert, niet alleen wíe de data betreft. `.github/workflows/deploy-firestore-rules.yml` deployt automatisch.

### 10. React state die uit sync kan raken — gebruik afgeleide waarden
`profileLoading` is een **afgeleide waarde**, geen eigen state. Zie ook: navigeer nooit direct na een succesvolle server-respons zonder te wachten tot de lokale state ook echt is bijgewerkt (`app/uitnodiging/[token]/page.tsx`) — en let op wanneer twee `useEffect`s die eigenlijk hetzelfde randgeval afvangen (bijv. "bestaand lid opent per ongeluk een link" én "nieuw lid net geregistreerd") niet van elkaar te onderscheiden zijn zonder een expliciete ref-vlag.

### 11. Eén service worker per origin voor push + caching (nieuw, 15 augustus 2026)
**Registreer nooit een tweede, aparte service worker naast de PWA-caching-worker voor iets anders (zoals push-meldingen).** Meerdere actieve service workers op hetzelfde origin/dezelfde scope verdringen elkaar als "controller" — vooral met `skipWaiting: true` + `clientsClaim: true` (nodig voor een PWA die altijd de nieuwste cache-versie wil) kan de ene worker de andere onopgemerkt buitenspel zetten. Gevolg was hier: de server meldde succesvolle verzending, maar er verscheen nooit een melding — geen foutmelding nergens, want de techniek "werkte" gewoon, alleen niet de juiste worker was er nog om te reageren. **Vuistregel**: alle service-worker-functionaliteit (caching, push, sync) hoort in **één** bestand, of expliciet in bewust verschillende scopes met een duidelijke reden.

### 12. Geldstroom-berekeningen altijd club-breed, nooit per-lid gescoped (nieuw, 22 september 2026)
**Elke functie die "welke week/periode is nu relevant" bepaalt (`relevanteTrekkingWeek()` en soortgelijke) moet club-brede data gebruiken, nooit alleen de data van het ene lid waar de actie voor is.** Reden: een lid zonder eigen betaalhistorie (nieuw lid, of een lid met een oude/onvolledige historie) geeft een misleidend, leeg of verouderd resultaat als de functie alleen naar *zijn eigen* data kijkt — met als concreet gevolg het Kees-incident (een storting werd verrekend met een allang-gepasseerde week, zie `docs/changelog.md`). Verwante valkuil, zelfde categorie: een vrije kas-correctie (`registreerCorrectie`) raakt nooit de onderliggende `betalingen`-status — die twee systemen (kasmutaties vs. betalingen) moeten expliciet allebei gecorrigeerd worden, nooit ervan uitgaan dat het ene het andere automatisch bijwerkt (zie het "dubbele-markering"-incident, `docs/changelog.md`).

---

## Firestore Structuur

```
/users/{uid}
  naam, email, telefoon, foto, rol, tickets[], lidSinds,
  ranglijstPunten, actief, lottoSaldo, lottoSaldoIntroSeen,
  onboardingCompleted, wachtOpNieuweSpeelreeks,
  notificationSettings { trekkingResultaten, betalingBevestigd,
    herinneringen, winnaars, ranglijstUpdates }
  /fcmTokens/{token}
    token, platform, aangemaakt, actief

/invites/{token}
  token, aangemaaktDoor, aangemaaktDoorNaam, aangemaaktOp, vervalOp,
  gebruikt, gebruiktOp, gebruiktDoorUid, gebruiktDoorNaam

/verenigingConfig/main
  naam, standaardInleg

/spelConfig/default
  naam, aantalGetallen, minGetal, maxGetal, bonusBal

/paymentConfig/main
  activeProvider, providers, tikkieLink, tikkieLinkBijgewerkt

/seizoenen/{id}
  naam, startDatum, eindDatum, status

/trekkingen/{id}
  nummers[], bonusBal, seizoenId, verwerkt, ingevoerdDoor, datum

/resultaten/{id}
  userId, userNaam, ticketId, ticketNaam,
  nummersGoed[], matchedNumbers[], aantalGoed, bonusGoed, punten,
  isWinnaar, prijsBedrag (optioneel, alleen bij isWinnaar — eigen
    aandeel in de pot, gedeeld door aantal winnaars, vastgelegd op
    het moment van winnen, zie "Prijsbedrag bij winst" hieronder),
  trekkingId, seizoenId, verwerktOp

/betalingen/{id}
  userId, userNaam, bedrag, omschrijving, provider, status,
  trekkingWeek, tikkieGeopend, aangemaakt, bevestigd, bevestigdDoor,
  gecorrigeerdReden

/kasmutaties/{id}
  bedrag, type, omschrijving, datum, userId, betalingId

/debug/zaterdagSaldoHerinnering
  laatsteRun, succes, foutmelding, aantalGebruikersGevonden,
  aantalMetTicket, aantalNietWachtend, aantalMetToken,
  aantalVerstuurd, details[]

/geplandeNotificaties/{id}
  titel, bericht, doelgroep, herhaling, geplandOp, actief,
  laatstVerstuurdOp, laatstVerstuurdVoorPeriode,
  aangemaaktDoor, aangemaaktDoorNaam, aangemaaktOp

/notificatieVerzendingen/{notificatieId}_{periode}
  notificatieId, periode, verstuurdOp,
  aantalDoelgroep, aantalMetToken, aantalVerstuurd
```

**Ontbrekend veld = impliciete default** geldt nu voor: `actief` (true), `onboardingCompleted` (true), `wachtOpNieuweSpeelreeks` (false/onwaar), `notificationSettings` (alle categorieën aan behalve ranglijstUpdates) — nooit een migratiescript nodig, zie architectuurregel 7.

**Bekende, onschadelijke inconsistenties (bewust niet gefixt):**
- `BetalingStatus` kent nog `'verificatie'` als mogelijke waarde, nooit meer aangemaakt.
- `Betaling.isSaldoStorting` bestaat nog als veld, wordt nooit meer gezet.
- Dashboard's `inVerificatie`-state is dode code.

---

## Cloud Functions

| Functie | Trigger | Wat |
|---|---|---|
| `onTrekkingVerwerkt` | Nieuwe trekking | Cumulatieve controle-engine, resultaten, punten, push, **geeft wachtende leden vrij bij een winnaar** |
| `onBetalingBevestigd` | Betaling → betaald (update) | Push naar lid |
| `onBetalingsHerinnering` | Vrijdag 09:00 | Push naar wie deze week nog open staat |
| `onTikkieCheckHerinnering` | Vrijdag 20:00 | Push naar kashouder/beheerder |
| `onZaterdagSaldoHerinnering` | Zaterdag 12:00 | Persoonlijke saldo-herinnering naar spelende leden, met statusverslag naar `/debug/zaterdagSaldoHerinnering` |
| `onTrekkingHerinnering` | Zaterdag 19:30 | Push naar beheerders |
| `onBetalingenAanmaken` | Trekking verwerkt | Nieuwe week: LottoSaldo-check per lid, **slaat wachtende leden over** |
| `onTikkieLinkVerval` | Wekelijks | Push naar beheerders bij oude Tikkie-link |
| `herberekenSpeelreeks` | Callable, alleen beheerder | Herberekent de huidige speelreeks — inclusief `prijsBedrag` bij een gevonden winnaar |
| `vulHistorischPrijsBedragIn` | Callable, alleen beheerder | Vult `prijsBedrag` in bij winnaars van vóór dit veld bestond. `forceer: true` berekent ook al-ingevulde bedragen opnieuw (na een correctie) |
| `bekijkPrijzenpotDetails` | Callable, alleen beheerder | Alleen-lezen: itemized overzicht van welke betalingen precies zijn meegeteld in de prijzenpot van een winnende trekking |
| `verzilverUitnodiging` | Callable, ingelogde gebruikers | Valideert + verzilvert een uitnodigingstoken, bepaalt `wachtOpNieuweSpeelreeks` |
| `stuurTestNotificatie` | Callable, ingelogde gebruikers | Testmelding naar het eigen account, met zichtbare foutmelding i.p.v. generiek "internal" |
| `stuurTestNotificatieMetNotificationVeld` | Callable, ingelogde gebruikers | Tijdelijke diagnosefunctie (notification-veld i.p.v. data-only) — kan weg zodra de SW-fix structureel bevestigd is |
| `stuurZaterdagSaldoHerinneringNu` | Callable, alleen beheerder | Handmatige trigger van de zaterdag-melding, voor testen zonder te wachten |
| `verwerkGeplandeNotificaties` | Elke 5 minuten | Generieke achtergrondfunctie voor door de beheerder zelf aangemaakte meldingen (Beheer → Notificaties) — checkt `geplandeNotificaties` op wat nu verstuurd moet worden, atomaire claim per periode voorkomt dubbele verzending |
| `testVerwerkGeplandeNotificatiesNu` | Callable, alleen beheerder | Handmatige trigger van dezelfde kernlogica, voor direct testen na het aanmaken van een nieuwe melding |

`sendToTokens()` verwijdert sinds 15 augustus **echt** ongeldige tokens (was eerder alleen een logregel).

---

## Pagina's

| Route | Rol |
|---|---|
| `/` | Publiek — inloggen, geen registratie-optie |
| `/uitnodiging/[token]` | Publiek — enige plek waar een nieuw lid kan toetreden |
| `/welkom` | Nieuw lid, eenmalig — 5-stappen-onboarding, met wachtrij-bevestiging op de laatste stap |
| `/geen-toegang` | Ingelogd maar geen geldig/actief profiel |
| `/dashboard` | Lid — wachtrij-banner indien van toepassing, prijzenpot, "Mijn LottoSaldo" |
| `/betalen` | Lid — puur informatief, directe Tikkie-storten-knop |
| `/trekkingen`, `/trekkingen/[id]` | Lid+ — invoerformulier (beheerder) ondersteunt sinds 22 september plakken van de volledige uitslag in één keer |
| `/startinfo` | Lid — samengevoegde informatiepagina (8 tabs) |
| `/spelregels`, `/help`, `/debug-fcm` | Redirects (naar `/startinfo` resp. `/profiel/notificaties`) |
| `/profiel` | Lid — naam, ticket, telefoon, link naar Notificaties |
| `/profiel/notificaties` | Lid — Instellingen-tab (per categorie, voor iedereen). **Test-tab: beheerder-only sinds 22 september 2026** (was eerder voor iedereen zichtbaar, alleen de zaterdag-trigger erin was al beheerder-only) |
| `/profiel/voorwaarden` | Lid — Voorwaarden & Privacy, dynamisch bedrag en namen |
| `/kas` | Alle rollen — alleen-lezen kasoverzicht |
| `/kashouder`, `/kashouder/financieel` | Kashouder(+) — inclusief "Tikkie laatst gecontroleerd" |
| `/leden` | Kashouder+ — uitnodigen, ❌ soft-delete, 🗑️ definitief verwijderen (bij inactief), Heractiveren |
| `/beheerder`, `/beheerder/admin` | Beheerder — Instellingen, Spel, Prijzen, Seizoen, **Notificaties (nieuw)**, Audit log |
| `/ranglijst`, `/hall-of-fame` | Alle rollen |
| `/offline`, `/serwist/[path]` | PWA-ondersteuning, geen UI |

---

## STATUS PER 22 SEPTEMBER 2026

### Volledig werkend ✅ (bevestigd via testen)
- Ledenuitnodigingensysteem, onboarding, Startinfo & Speluitleg
- Leden verwijderen (soft-delete + definitief), heractiveren
- Betaalsysteem, storting-verrekening, Tikkie-laatst-gecontroleerd
- Wachtrij voor nieuwe leden — inclusief de gefixte storting-verrekening-check
- **Eerste échte winnaar meegemaakt (Ing, trekking 2026-W38)** — wachtrij-vrijgave, betaalcyclus-doorstart, en (na deze sessie se fixes) een correct prijsbedrag zijn nu allemaal in de praktijk bevestigd, niet alleen getest
- Notificaties, alle drie de bugs — token-opschoning, automatische verversing, én de service worker-samenvoeging: **bevestigd met een geslaagde testmelding op `/profiel/notificaties`** (Test-tab), ná het samenvoegen van de twee service workers. De hele keten (toestemming → token → server → aflevering → weergave) is nu end-to-end bewezen werkend
- Cumulatieve spelmodus, rol-afhankelijke navigatie
- Voorwaarden & Privacy-pagina, met dynamisch bedrag en namen
- **Prijsbedrag bij winst** — server-side vastgelegd, gedeeld bij meerdere winnaars, backfill voor Ing bevestigd correct (€176, na het rechtzetten van een los, ouder boekhoudincident)
- **Week-scoping-fix** (het Kees-incident) — bevestigd correct na herverrekening
- **Wachtrij-check in de deelnemers-bepaling** — code-wijziging, geen incident om te bevestigen (was preventief)

### Openstaand ⏳
- **Geplande notificaties (Beheer → Notificaties)** — kernlogica geïsoleerd getest (9/9 geslaagd) en de Cloud Function compileert schoon, maar nog niet bevestigd met een daadwerkelijk aangemaakte en aangekomen melding in productie
- Eerste volledige run van `onZaterdagSaldoHerinnering` op de geplande tijd (i.p.v. handmatig getriggerd) nog niet apart bevestigd
- Backfill voor leden die een ticket toevoegen ná het aanmaken van de weekbetalingen
- **Volgende winnaar, volledig live** (zonder handmatige backfill-tussenkomst) nog niet meegemaakt — Ing was de enige tot nu toe, en die liep via de reconstructietool, niet het live pad zelf
- Geen automatische tests — alles handmatig, stap-voor-stap getest

---

## Handige links
- Live: https://lotto-app-eight-chi.vercel.app
- Repo: github.com/stuctech-eng/LottoApp
- Firebase: console.firebase.google.com
- Google Cloud (Logging/IAM): console.cloud.google.com
- Lotto uitslag: https://lotto.nederlandseloterij.nl/trekkingsuitslag
- Wijzigingsgeschiedenis: [`docs/changelog.md`](docs/changelog.md)
