# Changelog — LottoClub

Nieuwste bovenaan. Elke sessie voegt een nieuwe sectie toe.

---

## 25 juli 2026 — Eén betaalsysteem, opruiming, audit

Vervolgsessie op 23-24 juli. Kern van de dag: de twee parallelle betaalroutes (LottoSaldo-storting vs. een "gewone" wekelijkse betaling) die telkens tot dubbeltellingen leidden, zijn samengevoegd tot één route. Daarna een grondige opruiming van alles wat daardoor overbodig werd, en een audit die nog één echte bug aan het licht bracht.

### Voorgeschiedenis: nog meer dubbeltellings-incidenten vóór de consolidatie

Voortbordurend op de Dick/Wim-incidenten van 23-24 juli, deed zich ook een geval voor bij **Ing**: een storting gemeld met een verkeerd bedrag (€10 in plaats van €12) door een UI-probleem — het vrije "ander bedrag"-invoerveld kon stilletjes overschreven worden door een eerder aangetikte preset-knop, afhankelijk van de volgorde van interactie. Gefixt door het vrije veld altijd voorrang te geven zodra het niet leeg is, plus een prominente "Je stort €X"-bevestigingsregel vlak boven de verzendknop als laatste check.

Ook ontdekt: **`stortLottoSaldo` (de kashouder-directe stortroute) verrekende nooit automatisch met een openstaande week** — alleen de andere route (lid meldt zelf, kashouder bevestigt) deed dat. Daardoor kon een storting geregistreerd worden terwijl de al openstaande week gewoon bleef openstaan, wat een kashouder er vervolgens toe verleidde om ook nog los op "✓ Betaald" te tikken — weer een dubbele boeking (dit keer bij Wim, €12 storting + losse €4-boeking). Gefixt door ook deze route de verrekeningscheck te laten uitvoeren.

**Nog een gat, ontdekt bij Ing**: de verrekenfunctie loste alleen een *bestaand* 'open'-document op — als er voor het lid **helemaal geen** document bestond voor de week (bijv. omdat ze het aanmaakmoment hadden gemist, zelfde klasse probleem als het oudere Ellen-incident), gebeurde er niets: saldo bleef onaangeroerd, lid bleef "niet betaald" tonen. Uitgebreid met een tweede tak: geen document + wel een ticket + genoeg saldo → direct een nieuw 'betaald'-document aanmaken.

**Eén foutieve correctie, één keer te veel toegepast**: bij het rechtzetten van Wim's dubbele boeking werd zowel een kascorrectie ALS een "markeer als gecorrigeerd" op de betaling zelf toegepast — maar dat laatste was te veel: de saldo-correctie (€12→€8) representeerde al dat €4 van de storting terecht deze week dekte, dus de betaling had gewoon op 'betaald' moeten blijven staan. Enige echt onterechte correctie van de sessie, in dezelfde beweging rechtgezet en een **"↺ Herstel"-knop** gebouwd (tegenhanger van "markeer als gecorrigeerd") voor dit soort gevallen in de toekomst.

**Prijzenpot vs. kassaldo — belangrijk, niet-triviaal onderscheid ontdekt door de gebruiker.** Het dashboard toonde altijd `kasSaldo` (het totale, cumulatieve clubsaldo all-time) onder het label "Huidige pot" — maar sinds LottoSaldo-stortingen direct meetellen in de kas, ook al zijn ze nog niet "verbruikt" als wekelijkse inleg, klopte dat niet meer met "wat kun je winnen deze speelreeks". Nieuwe, aparte berekening gebouwd (`lib/firestore-prijzenpot.ts`): telt alleen bevestigde wekelijkse inleg binnen de huidige speelreeks (sinds de laatste winnaar, of vanaf het begin), sluit stortingen zelf expliciet uit, telt wél alle al-bevestigde toekomstige weken mee zodra die daadwerkelijk zijn afgehandeld — niets meer, niets minder dan wat al zeker is.

### De grote consolidatie: van twee betaalsystemen naar één

**Aanleiding, letterlijk van de gebruiker**: *"Ik moet toch altijd kijken op Tikkie"* — het bevestigingsstapje voor de kashouder voegde niets toe bovenop wat hij toch al deed, en *"de leden vergeten het toch altijd"* voor het meld-stapje aan de kant van de leden. Twee losse observaties die samen tot dezelfde conclusie leidden: schrap beide tussenstappen, laat alles verlopen via directe kashouder-registratie.

**Ontwerp, expliciet bevestigd vóór het bouwen:**
- Alles is voortaan een storting, geen apart "gewoon €4 betalen"-pad meer.
- Kashouder-verificatie (het moment waarop iemand in Tikkie kijkt) blijft nodig — dat kán de app niet vervangen, geen Tikkie-API-toegang — maar het aparte *bevestigingsstapje bovenop* die verificatie niet.
- Leden melden niet meer zelf: geen "ik heb gestort"-knop meer in de app.
- Later, apart bevestigd: ook het minimumbedrag (was: standaard inleg) mag weg — de kashouder registreert exact wat ze in Tikkie zien, een kunstmatig minimum paste daar niet bij (concreet: een test met €2 liep vast op de destijds bestaande €4-ondergrens).

**Gebouwd/verwijderd, in volgorde:**
1. `meldBetaling` en `markeerBetaaldDoorKashouder` volledig verwijderd uit `lib/firestore-payments.ts`. `meldLottoSaldoStorting` en `stortLottoSaldo` kregen allebei (tijdelijk) een minimumbedrag-validatie.
2. `app/betalen/page.tsx` volledig herschreven naar één enkele storting-flow (bedrag kiezen, Tikkie-knop, melden) — geen aparte route meer.
3. `app/kashouder/page.tsx`: "✓ Betaald" werd "💰 Storten", roept nu `stortLottoSaldo` aan met het standaardbedrag in plaats van de verwijderde functie.
4. `app/kashouder/financieel/page.tsx`: minimumbedrag-validatie + duidelijke foutmelding toegevoegd aan het bestaande stortingsformulier.
5. Verouderde teksten op `/help` en `/spelregels` bijgewerkt (geen "Ik heb betaald"-knop meer).
6. **Tweede ronde**: op expliciet verzoek ("de leden vergeten het toch altijd") is ook `meldLottoSaldoStorting` verwijderd — leden melden helemaal niets meer. `/betalen` werd daarmee een puur informatieve pagina: saldo tonen, een directe "Open Tikkie om te storten"-knop, geen vervolgstap.
7. **Derde ronde**: het minimumbedrag zelf ook geschrapt uit `stortLottoSaldo` (client én tekst) — elk positief bedrag mag nu.
8. **Vierde ronde, opruiming van wat daardoor dood werd**: `bevestigBetaling` en `wijsBetalingAf` verwijderd (niets maakte meer een `'verificatie'`-status document aan om te bevestigen/afwijzen). De "Te verifiëren betalingen"-secties op zowel Financieel als het kashouder-dashboard volledig weg, inclusief de bijbehorende tegel in het maandoverzicht. Op het kashouder-dashboard is de "Alles in orde"-conditie zorgvuldig vereenvoudigd (de oude `verificatieUserIds`-afhankelijkheid weggehaald zonder de "ontbrekend document telt ook als niet-betaald"-logica van eerder te breken).
9. WhatsApp-herinneringstekst bijgewerkt: `buildWhatsappBetaalverzoek` bleek zelf ook dode code (nergens meer aangeroepen) en is verwijderd; `buildWhatsappHerinnering` verwijst niet meer naar een meld-stap ("Meld je betaling in de app" → "Stort via Tikkie — je hoeft verder niks te melden, ik verwerk het zelf zodra ik het zie").

### Kleine UI-verbeteringen, dezelfde sessie
- **Dashboard**: nieuwe "Mijn LottoSaldo"-kaart voor leden — saldo, weken-tegoed-status, expliciete uitleg over de automatische wekelijkse afschrijving.
- **Dubbele "Storten"-knop ontdekt en weggehaald**: stond zowel in de prijzenpot-kaart als in de nieuwe LottoSaldo-kaart, beide naar dezelfde plek. Weg uit de prijzenpot-kaart, blijft alleen bij LottoSaldo staan waar het thematisch hoort.
- **"Betaling bevestigd"-scherm was blokkerend**: liet geen ruimte om ook nog te storten voor toekomstige weken zodra de huidige week al betaald was. Omgezet naar een klein, niet-blokkerend groen label bovenaan de gewone betaalpagina — saldo-kaart en storten blijven er altijd naast/onder zichtbaar.
- **Nieuwe Cloud Function `onTikkieCheckHerinnering`**: elke vrijdag 20:00 een pushmelding naar kashouder/beheerder om Tikkie te checken — compenseert dat er, sinds leden niet meer melden, geen enkel signaal meer bestaat wanneer er geld is binnengekomen.
- Restjes "minimaal €4"-tekst opgeruimd op `/betalen` (twee plekken) en `/spelregels` (die laatste ging eigenlijk over de nog steeds bestaande wekelijkse inleg van €4, niet over een storting-minimum — geherformuleerd om dat onderscheid duidelijk te maken).

### Eindaudit — op expliciet verzoek, "check alles, geen vergeten dingen"

Systematische controle na alle bovenstaande wijzigingen:

1. **Echte, functionele bug gevonden**: `firestore.rules`' `/betalingen`-`create`-regel eiste `request.resource.data.userId == request.auth.uid` — bedoeld voor "lid meldt voor zichzelf" (een pad dat inmiddels niet meer bestaat). Maar `verrekenLottoSaldoMetOpenstaandeWeek`'s "geen bestaand document"-tak (aangeroepen vanuit de kashouder-actie `stortLottoSaldo`) maakt soms een nieuw document aan **namens een ander lid** — waarbij `request.auth.uid` (kashouder) en `request.resource.data.userId` (het lid) per definitie verschillen. De regel zou dit stil hebben geblokkeerd. Precies dit scenario deed zich waarschijnlijk voor bij het Ing-incident eerder deze sessie. Gefixt: `create` staat nu ook toe als `isKashouderOfBeheerder()`, los van wiens `userId` het betreft.
2. Twee kleine, onschadelijke inconsistenties genoteerd maar bewust niet gefixt (geen risico, puur informatief voor toekomstig werk): `Betaling.isSaldoStorting` wordt nergens meer actief gezet (stortingen zijn geen los `Betaling`-document meer sinds punt 6 hierboven) — overal defensief gelezen, dus geen crash. Dashboard's `inVerificatie`-state checkt op een status die nooit meer voorkomt — toont gewoon nooit.
3. Bevestigd: geen enkele restverwijzing meer naar de vijf verwijderde functies (`meldBetaling`, `bevestigBetaling`, `wijsBetalingAf`, `meldLottoSaldoStorting`, `markeerBetaaldDoorKashouder`) ergens in de codebase. Alle Cloud Functions compileren schoon.

### Vraag-en-antwoord, voor de context
- **"Krijgen leden nog bericht bij laag saldo?"** — Ja, automatisch, maar via een gewone pushmelding (FCM), niet WhatsApp. WhatsApp-berichten gaan altijd via de kashouder zelf (handmatige "💬 Herinner"-knop) — geen WhatsApp Business API beschikbaar voor automatisch versturen, zelfde beperking als eerder bij Tikkie vastgesteld.
- Exacte pushtekst bij 2 weken tegoed: 🟡 "LottoSaldo wordt laag" / "Je hebt nog 2 weken LottoSaldo over. Denk aan bijstorten om automatisch te blijven meedoen." Bij 1 week: 🔴 "LottoSaldo bijna op" / "Je hebt nog maar 1 week LottoSaldo over. Stort bij zodat je automatisch blijft meedoen."

---

## 23 juli 2026 — LottoSaldo, Vereniging-instellingen, Firestore-rules-avontuur, opruiming

Lange sessie in meerdere delen. Samengevat per onderwerp.

### LottoSaldo — vooruitbetalen, automatisch verrekend

**Aanleiding**: handmatig wekelijks betalen is voor een klein clubje overbodig gedoe. Voorstel (van de gebruiker, na overleg over automatiseringsgraad): een lid stort één keer een bedrag, de app trekt daarna zelf elke week de inleg af.

**Ontwerpkeuzes, expliciet besproken vóór het bouwen:**
- Geen Mollie/iDEAL-automatisering — vereist een echt zakelijk Mollie-account met API-key dat er niet is (zelfde categorie beperking als eerder bij Tikkie/WhatsApp Business API vastgesteld). In plaats daarvan: dezelfde "meld → kashouder bevestigt"-flow als de rest van de app.
- **Storting = direct kasmutatie.** De kashouder ontvangt het geld namelijk direct — economisch is het vanaf dat moment al clubgeld, ook al wordt het pas later als wekelijkse inleg "verbruikt". Eerste ontwerp deed dit andersom (kasmutatie pas bij wekelijkse afboeking) — op aanwijzing gecorrigeerd.
- Betaalpagina: LottoSaldo als **primaire, prominente flow**, de oude wekelijkse €4-knop als kleinere secundaire optie eronder. Eenmalige uitlegbanner ("Begrepen"), opgeslagen in Firestore (niet lokaal) zodat 'm niet opnieuw verschijnt op een ander apparaat.

**Gebouwd**: `lib/firestore-vereniging.ts`-achtig patroon voor het saldo zelf in `lib/firestore-payments.ts` (`meldLottoSaldoStorting`, `stortLottoSaldo`, `verrekenLottoSaldoMetOpenstaandeWeek`, later `corrigeerLottoSaldo`), Cloud Function `onBetalingenAanmaken` uitgebreid met de wekelijkse saldo-check, lage-saldo pushmeldingen, kas-uitsplitsing op de Financieel-pagina.

**Noot (25 juli)**: de wekelijkse €4-knop en de meld/bevestig-stap uit dit ontwerp zijn een sessie later alsnog verwijderd — zie hierboven. Dit was destijds de juiste eerste stap, maar bleek na een paar dagen live gebruik meer complexiteit te geven dan nodig.

### Twee bugs gevonden tijdens het eerste echte testen (met een echte €10-storting)

1. **`markeerBetaaldDoorKashouder` ("✓ Betaald"-knop) kende het LottoSaldo-systeem niet.** Bij een lid zonder open betaaldocument (bijv. omdat het al gedekt zou moeten zijn door saldo) maakte de knop blind een **nieuwe** betaling + kasmutatie aan — ook als er al 'betaald' stond. Concreet gebeurd: een test-tik op deze knop creëerde een spookboeking van €4 in de kas, terwijl het LottoSaldo van €10 onaangeroerd bleef. Gefixt met een striktere volgorde: al betaald deze week? weigeren → bestaand open document? bevestigen → genoeg saldo? dekken zonder kasmutatie → anders pas een nieuwe boeking. **(Deze functie zelf is 25 juli alsnog volledig verwijderd — zie hierboven.)**
2. **De bestaande, foutieve boeking moest handmatig gecorrigeerd worden** — opgelost met de al bestaande Kascorrectie-functie (−€4, nette audit-regel), en met een nieuw **saldo-correctietool** (potloodje bij elk lid op de Financieel-pagina, beheerder-only in de UI) voor dit soort gevallen in de toekomst.

### Vereniging-instellingen — van decoratie naar functie

Beheer → Instellingen toonde al maanden drie regels ("Naam vereniging", "Standaard inleg", "Kashouder") die **niets deden** — letterlijk hardcoded tekst zonder `onClick`. Nu:
- Nieuwe `/verenigingConfig/main`-collectie, `lib/firestore-vereniging.ts`
- Naam en inleg echt bewerkbaar
- Kashouder automatisch afgeleid uit de rol-toewijzing op de Leden-pagina
- **Standaard inleg overal doorgevoerd** — dit raakte uiteindelijk 12 bestanden: elke client-pagina die het bedrag toonde, `lib/firestore-payments.ts`, en een hardcoded `INLEG = 4` in de Cloud Function die nooit synchroon liep met de client-constante

### Het Firestore-rules-avontuur

Wat begon als "voeg een regel toe voor de nieuwe collectie" werd een langere speurtocht:

1. Eerste poging: nieuwe rule toegevoegd aan de `firestore.rules` **in de repo**, zonder te beseffen dat de repo-versie **niet overeenkwam met wat er echt in Firebase actief stond** (fcmTokens, notificationSettings, en een aantal andere regels stonden er wél live, maar niet in de repo — kennelijk ooit los via de Console gewijzigd).
2. Gebruiker plakte de daadwerkelijke, live regels — bleek significant uitgebreider. Regels samengevoegd: alles uit de live versie behouden, alleen de kashouder-lottoSaldo-uitzondering en `verenigingConfig` toegevoegd.
3. **Nieuwe architectuurregel als gevolg**: vertrouw niet blind op `firestore.rules` in de repo voor de werkelijke staat — Firestore rules kunnen driften van code, in tegenstelling tot alle andere bestanden in dit project.
4. Automatische deploy gebouwd (`.github/workflows/deploy-firestore-rules.yml`) om toekomstige drift te voorkomen. Twee losse levering-problemen onderweg (niet code-gerelateerd): CodeSync/Working Copy kreeg de nieuwe verborgen map `.github/workflows/` niet succesvol gesynchroniseerd (opgelost door het bestand rechtstreeks via github.com aan te maken), en een eigen fout in de zip-commando's (`-x ".*"` sloot per ongeluk de hele `.github`-map uit — geleerd: wees specifiek met excludepatronen, niet breed).
5. Eerste deploy-run faalde met `403` op `firebaserules.googleapis.com` — de service-account miste de IAM-rol **Firebase Rules Admin** (`roles/firebaserules.admin`), los van de rollen die al voor Cloud Functions-deploys bestonden. Rol toegevoegd via Google Cloud Console (IAM & Admin → service-account → Manage access), daarna geslaagd.

### Opruiming
- Ongebruikte `rondes`-collectie en bijbehorende code volledig verwijderd (`Ronde`-interface, `subscribeRondes`, `maakRonde`, de Firestore-rule) — nooit afgemaakt, nergens gebruikt, bevatte zelf een `orderBy()`-bug.
- WhatsApp-herinneringstekst uitgebreid met een tip over LottoSaldo. **(Deze tip is 25 juli alsnag herschreven — zie hierboven, samen met het verwijderen van de bijbehorende meld-stap.)**
- `tikkieLink`/`trekkingWeek`/`isSaldoStorting` formeel toegevoegd aan de TypeScript-types (stonden er eerder nooit echt in, werden steeds met type-assertions omheen gewerkt).

### Terugkerend patroon deze sessie: handmatige Firestore-veldmappings
Alweer een paar keer een bug veroorzaakt: een nieuw veld op `User` (`lottoSaldo`, `lottoSaldoIntroSeen`) toegevoegd aan het type, maar vergeten in de **handmatige** field-by-field mapping in `lib/auth-context.tsx`, `lib/firestore-users.ts`, `lib/firestore-ranglijst.ts`. Dit keer proactief in alle drie tegelijk gefixt in plaats van er telkens achteraf achter te komen — maar het blijft een terugkerend risico bij elk nieuw veld.

---

## 12 juli 2026 — PWA, cumulatieve clubmodus, navigatie- en datacorrecties

Grote, meerdaagse sessie. Samengevat per onderwerp:

### PWA / offline caching
- `next-pwa` overwogen, verworpen (niet onderhouden, geen goede App Router-ondersteuning)
- Serwist geïmplementeerd, eerst via `@serwist/next` (webpack) — bleek incompatibel met Next.js 16's Turbopack-productiebuilds
- Overgestapt op `@serwist/turbopack` — werkende oplossing, service worker via `app/serwist/[path]/route.ts`
- Offline fallback-pagina (`/offline`) toegevoegd
- `NetworkOnly`-guard voor `/api/`-routes (defensief, voorkomt ooit stale betaalstatus tonen)

### Navigatie-fixes
- `app/kas/page.tsx`, `app/profiel/page.tsx`, `app/kashouder/financieel/page.tsx` hadden allemaal een **hardcoded** bottom nav + terugknop (altijd Lid- of Kashouder-versie), waardoor een beheerder op die pagina's zijn eigen "Beheer"-tab kwijtraakte. Alle drie omgezet naar rol-afhankelijke navigatie.
- `app/dashboard/page.tsx`: betaalvoortgang-teller ("Deelnemers") telde leden die *ooit* een week hadden betaald, niet alleen de huidige week. Gefixt met dezelfde weekfilter die `app/kashouder/page.tsx` al gebruikte.
- Naamgeving "Kasboek" → consistent "Kas" op alle plekken.
- Spelregels/Deelnemers hadden geen ingang in de UI — toegevoegd aan Profiel → Informatie.
- "FCM Diagnostiek"-link op Profiel was zichtbaar voor alle rollen — nu alleen Beheerder.

### Cumulatieve "clubmodus" — kern van deze sessie
Grondige herbouw van de spellogica. Voorheen berekende `controle-engine.ts` per trekking een onafhankelijke score (zoals een echte loterij). De werkelijke clubregel is anders: goede nummers stapelen zich op binnen een speelreeks totdat iemand alle 6 heeft verzameld.

**Nieuw datamodel**: `Resultaat.matchedNumbers` (cumulatief) naast het bestaande `nummersGoed` (nu: alleen nieuw die trekking). `aantalGoed` = `matchedNumbers.length`.

**Beslissing**: geen aparte `Ronde`-databasestructuur bouwen/repareren (die bestond al half, ongebruikt, met een eigen `orderBy()`-bug). In plaats daarvan wordt de speelreeks-grens *afgeleid* uit de trekkingsgeschiedenis: alles ná de laatste trekking met een winnaar. (Deze halve `Ronde`-structuur is op 23 juli alsnog volledig opgeruimd.)

**Beslissing**: geen eenmalig migratiescript. In plaats daarvan de herbruikbare `herberekenSpeelreeks` Cloud Function (callable, alleen beheerder) — knop in Beheer → Prijzen.

**Beslissing**: `PrijsConfig` (meerdere spelmodi) volledig geschrapt. LottoClub is geen generieke loterij-app maar een clubje met precies één vaste spelregel. Minder code, minder bugs, simpeler beheer.

### Bugs gevonden en gefixt tijdens het testen
Stuk voor stuk ontdekt door de nieuwe functionaliteit daadwerkelijk tegen productiedata te draaien, niet in theorie:

1. **Build-fout**: `functions/tsconfig.json` heeft `noUnusedLocals: true`. Een reeds langer ongebruikte functie (`getAllFcmTokens`) blokkeerde de Cloud Functions-deploy al vóór deze sessie — niemand had het gemerkt omdat de deploy-workflow alleen bij wijzigingen in `functions/` draait. Verwijderd.
2. **`matchedNumbers` ontbrak in client-mapping**: `lib/firestore-trekkingen.ts` → `subscribeResultaten` mapt Firestore-velden handmatig; het nieuwe veld was vergeten. Zonder fix zou de server het wél opslaan maar de app het nooit zien.
3. **Overgeslagen weken verloren cumulatieve voortgang**: `getVorigeMatchesPerTicket` keek alleen naar de laatste trekking van de speelreeks. Sloeg een lid een week over (niet betaald), dan verloor die zijn eerder verzamelde nummers bij de eerstvolgende deelname. Gefixt: nu wordt over alle trekkingen van de speelreeks gelopen, met het meest recente resultaat per ticket.
4. **Verdwaald testresultaat blokkeerde speelreeks-detectie**: een handmatig aangemaakt resultaat met `isWinnaar: true` (2/6 goed — onmogelijk onder de echte regels) zorgde ervoor dat de speelreeks-grens verkeerd werd gedetecteerd. Document verwijderd via Firestore Console.
5. **`herberekenSpeelreeks` filterde niet op betaalstatus**: nam iedereen met een ticket mee, ook niet-betalers. Gefixt met dezelfde `getBetalersVoorWeek`-check die de live trigger al gebruikte.
6. **`ranglijstPunten`-drift**: de eerste versie van de puntencorrectie in `herberekenSpeelreeks` gebruikte een optel/aftrek-delta die bij herhaald herberekenen kon afwijken van de werkelijke som (geconstateerd: 40 punten getoond, 20 correct). Vervangen door een harde herberekening als exacte som van alle `punten`-velden — zelfherstellend, ongeacht hoe vaak de knop wordt gebruikt.
7. **`subscribeRanglijst` gebruikte `orderBy()`** gecombineerd met `where()` — schending van architectuurregel 1. Werkte toevallig (index bestond al) maar fragiel. Sortering nu in JS.
8. **Ranglijst/Hall of Fame gebruikten cumulatief `aantalGoed`** voor "gemiddelde score" en "hoogste score" — sinds die cumulatief is, gaf dat geen zinnige per-trekking-statistiek meer. Omgezet naar `nummersGoed.length` (nieuwe matches per trekking). Hall of Fame-categorie "Hoogste score ooit" hernoemd naar "Meeste nummers in één trekking"; nieuwe categorie "Snelste winnaar" toegevoegd (minste trekkingen tot 6/6 — kon pas bestaan sinds de cumulatieve regel).
9. **Beheerder-dashboard "Vereist aandacht" signaleerde niets** ondanks een lid dat niet had betaald. Oorzaak: Ellen Veerman had voor die week helemaal geen betaaldocument (zie bekende beperking in README, `onBetalingenAanmaken` slaat leden zonder ticket over). De alert-logica keek alleen naar bestaande `'open'`-documenten, niet naar ontbrekende. Gefixt met dezelfde "vergelijk tegen betaald-lijst"-aanpak als de kashouder-pagina.

### UI-toevoegingen (product van de cumulatieve regel)
- Blauw balletje = geraakt binnen de speelreeks (`matchedNumbers`), blauw + goud randje = nieuw deze trekking (`nummersGoed`) — op dashboard én trekking-detail
- "Nog X nodig"-indicator per deelnemer op de trekking-detailpagina
- Waarschuwingsbalk op de betaalpagina (vóór en ná de deadline) dat niet-betalen de cumulatieve matching overslaat
- Pushmelding voor niet-betalers uitgebreid met expliciete uitleg
- Niet-betaald-balk op de trekking-detailpagina, toont wie er die specifieke trekking niet meetelde

### Werkwijze-afspraak
Claude kan bestanden voortaan rechtstreeks ophalen uit `stuctech-eng/LottoApp` (publieke repo, branch `main`) via `curl` naar `raw.githubusercontent.com`, zonder dat bestanden geplakt hoeven te worden. Alleen gecommitte + gepushte wijzigingen zijn zichtbaar; geen live-verbinding, elke fetch is een snapshot.

---

## 7 juli 2026 en eerder

Zie de oudere versie van README.md in de git-geschiedenis voor de status vóór deze sessie (PWA offline caching, navigatie-audit, betaalcyclus-automatisering, `alle_goed_wint`-prijsmodus als toenmalige standaardinstelling).
