# Changelog — LottoClub

Nieuwste bovenaan. Elke sessie voegt een nieuwe sectie toe.

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

**Beslissing**: geen aparte `Ronde`-databasestructuur bouwen/repareren (die bestond al half, ongebruikt, met een eigen `orderBy()`-bug). In plaats daarvan wordt de speelreeks-grens *afgeleid* uit de trekkingsgeschiedenis: alles ná de laatste trekking met een winnaar.

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
