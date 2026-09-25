import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Resultaat, Trekking } from './types';

// ─────────────────────── Ranglijst ───────────────────────

export interface RanglijstEntry {
  positie: number;
  user: User;
  aantalDeelnames: number;
  aantalGewonnen: number;
  besteScore: number;
  gemiddeldeScore: number;
  /** Totaal aantal nieuwe treffers dit seizoen (som van nummersGoed
   *  over alle trekkingen) — vervangt het vroegere, onbegrijpelijke
   *  puntensysteem (×10 + bonusbal-bonus). LottoClub speelt zonder
   *  puntensysteem; dit is een eerlijke, direct navolgbare telling. */
  totaalTreffers: number;
}

/**
 * Live ranglijst — sorteert op totaalTreffers (nieuwe matches dit
 * seizoen), niet meer op het vroegere ranglijstPunten-veld. Dat veld
 * blijft server-side wel bestaan/bijgewerkt (andere plekken kunnen
 * het nog gebruiken), maar deze pagina toont en sorteert er niet
 * meer op.
 *
 * Geen orderBy() — architectuurregel: orderBy() gecombineerd met een
 * where() op een ander veld vereist een composite index en geeft
 * zonder die index stil 0 resultaten terug. Sortering gebeurt hier in JS.
 */
export function subscribeRanglijst(callback: (entries: RanglijstEntry[]) => void) {
  const q = query(
    collection(db, 'users'),
    where('actief', '==', true)
  );
  return onSnapshot(
    q,
    async (snap) => {
      const users = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          naam: data.naam ?? '',
          email: data.email ?? '',
          foto: data.foto ?? null,
          rol: data.rol ?? 'lid',
          tickets: data.tickets ?? [],
          lidSinds: data.lidSinds ?? null,
          ranglijstPunten: data.ranglijstPunten ?? 0,
          actief: data.actief ?? true,
          lottoSaldo: data.lottoSaldo ?? 0,
          lottoSaldoIntroSeen: data.lottoSaldoIntroSeen ?? false,
          onboardingCompleted: data.onboardingCompleted,
          wachtOpNieuweSpeelreeks: data.wachtOpNieuweSpeelreeks,
          notificationSettings: data.notificationSettings,
        } as User;
      });

      const resultatenSnap = await getDocs(collection(db, 'resultaten'));
      const resultaten = resultatenSnap.docs.map(d => d.data() as Resultaat);

      const voorlopigeEntries = users.map((user) => {
        const userResultaten = resultaten.filter(r => r.userId === user.id);

        // Per trekking het beste ticket tellen (niet alle tickets optellen)
        const perTrekking = new Map<string, Resultaat>();
        for (const r of userResultaten) {
          const existing = perTrekking.get(r.trekkingId);
          if (!existing || r.aantalGoed > existing.aantalGoed) {
            perTrekking.set(r.trekkingId, r);
          }
        }
        const bestePerTrekking = [...perTrekking.values()];

        const aantalDeelnames = bestePerTrekking.length;
        const aantalGewonnen = bestePerTrekking.filter(r => r.isWinnaar).length;

        // KRITIEK: besteScore/gemiddeldeScore/totaalTreffers gebruiken
        // nummersGoed (nieuwe matches DIE trekking), niet het
        // cumulatieve aantalGoed — dat loopt binnen een speelreeks
        // alleen maar op, dus een som/gemiddelde/maximum daarvan zou
        // geen zinnige "hoe goed presteer je"-waarde meer geven.
        const besteScore = aantalDeelnames > 0
          ? Math.max(...bestePerTrekking.map(r => r.nummersGoed?.length ?? 0))
          : 0;
        const gemiddeldeScore = aantalDeelnames > 0
          ? Math.round((bestePerTrekking.reduce((s, r) => s + (r.nummersGoed?.length ?? 0), 0) / aantalDeelnames) * 10) / 10
          : 0;
        const totaalTreffers = bestePerTrekking.reduce((s, r) => s + (r.nummersGoed?.length ?? 0), 0);

        return { user, aantalDeelnames, aantalGewonnen, besteScore, gemiddeldeScore, totaalTreffers };
      });

      // Sorteren op totaalTreffers (hoog → laag) — pas NU, ná de
      // berekening, in tegenstelling tot voorheen (toen werd al vóór
      // het ophalen van de resultaten gesorteerd op het opgeslagen
      // ranglijstPunten-veld).
      voorlopigeEntries.sort((a, b) => b.totaalTreffers - a.totaalTreffers);

      const entries: RanglijstEntry[] = voorlopigeEntries.map((e, i) => ({
        positie: i + 1,
        ...e,
      }));

      callback(entries);
    },
    () => callback([])
  );
}

// ─────────────────────── Hall of Fame ───────────────────────

export interface HallOfFameRecord {
  categorie: string;
  icoon: string;
  userNaam: string;
  waarde: string;
  sub: string;
}

export interface RaceNaarZesEntry {
  drempel: number;
  userNaam: string | null;
  aantalTrekkingen: number | null;
}

export interface GetalRecord {
  nummer: number;
  aantal: number;
}

export interface HallOfFameData {
  hoofdrecords: HallOfFameRecord[];
  raceNaarZes: RaceNaarZesEntry[];
  meestGevallenNummer: GetalRecord | null;
  minstGevallenNummer: GetalRecord | null;
}

/**
 * Binnen één speelreeks (rondeId), voor elke (gebruiker, ronde)-
 * combinatie: op welke trekking (1-geteld, chronologisch binnen die
 * ronde) werd een bepaalde drempel voor het eerst bereikt? Geeft de
 * snelste (laagste aantal trekkingen) over alle gebruikers/reeksen
 * heen terug. Gebruikt voor zowel "Race naar 6" (drempel 3/4/5) als
 * kan in theorie ook drempel 6 aan, al blijft de bestaande
 * snelsteWinnaar-berekening hieronder ongewijzigd (werkt al goed).
 */
function berekenSnelsteOpDrempel(
  resultaten: Resultaat[],
  trekkingDatums: Map<string, Date>,
  drempel: number
): RaceNaarZesEntry {
  const perGebruikerRonde = new Map<string, { r: Resultaat; datum: Date }[]>();
  for (const r of resultaten) {
    const key = `${r.userId}|${r.rondeId}`;
    const datum = trekkingDatums.get(r.trekkingId) ?? new Date(0);
    if (!perGebruikerRonde.has(key)) perGebruikerRonde.set(key, []);
    perGebruikerRonde.get(key)!.push({ r, datum });
  }

  let beste: { userNaam: string; aantalTrekkingen: number } | null = null;
  for (const reeks of perGebruikerRonde.values()) {
    const gesorteerd = [...reeks].sort((a, b) => a.datum.getTime() - b.datum.getTime());
    const idx = gesorteerd.findIndex(x => x.r.aantalGoed >= drempel);
    if (idx === -1) continue;
    const aantalTrekkingen = idx + 1;
    if (!beste || aantalTrekkingen < beste.aantalTrekkingen) {
      beste = { userNaam: gesorteerd[idx].r.userNaam, aantalTrekkingen };
    }
  }

  return { drempel, userNaam: beste?.userNaam ?? null, aantalTrekkingen: beste?.aantalTrekkingen ?? null };
}

/**
 * Berekent all-time records uit de /resultaten en /trekkingen collecties.
 * Returned als statische snapshot (niet live) — wordt aangeroepen
 * bij mount van de Hall of Fame pagina.
 */
export async function haalHallOfFameOp(): Promise<HallOfFameData> {
  const [resultatenSnap, trekkingenSnap] = await Promise.all([
    getDocs(collection(db, 'resultaten')),
    getDocs(collection(db, 'trekkingen')),
  ]);
  const resultaten = resultatenSnap.docs.map(d => d.data() as Resultaat & { id: string });
  const trekkingen = trekkingenSnap.docs.map(d => d.data() as Trekking);

  const trekkingDatums = new Map<string, Date>();
  trekkingenSnap.docs.forEach(d => {
    const data = d.data();
    trekkingDatums.set(d.id, data.datum?.toDate?.() ?? new Date(0));
  });

  if (resultaten.length === 0) {
    return { hoofdrecords: [], raceNaarZes: [], meestGevallenNummer: null, minstGevallenNummer: null };
  }

  // Grootste treffer — meeste NIEUWE nummers in één trekking.
  const besteEnkeleTrekking = resultaten.reduce((a, b) =>
    (b.nummersGoed?.length ?? 0) > (a.nummersGoed?.length ?? 0) ? b : a
  );

  const gewonnen: Record<string, number> = {};
  const namen: Record<string, string> = {};
  for (const r of resultaten) {
    namen[r.userId] = r.userNaam;
    if (r.isWinnaar) gewonnen[r.userId] = (gewonnen[r.userId] ?? 0) + 1;
  }
  const meestGewonnen = Object.entries(gewonnen).sort((a, b) => b[1] - a[1])[0];

  // Snelste winnaar — minste trekkingen nodig binnen één speelreeks om
  // te winnen (chronologisch, per winnende trekking berekend).
  const winnendeResultaten = resultaten
    .filter(r => r.isWinnaar)
    .map(r => ({ ...r, datum: trekkingDatums.get(r.trekkingId) ?? new Date(0) }))
    .sort((a, b) => a.datum.getTime() - b.datum.getTime());

  let snelsteWinnaar: { userNaam: string; aantalTrekkingen: number } | null = null;
  let vorigeWinstDatum = new Date(0);
  for (const winst of winnendeResultaten) {
    const aantalTrekkingen = new Set(
      resultaten
        .filter(r => r.userId === winst.userId)
        .filter(r => {
          const d = trekkingDatums.get(r.trekkingId) ?? new Date(0);
          return d > vorigeWinstDatum && d <= winst.datum;
        })
        .map(r => r.trekkingId)
    ).size;

    if (!snelsteWinnaar || aantalTrekkingen < snelsteWinnaar.aantalTrekkingen) {
      snelsteWinnaar = { userNaam: winst.userNaam, aantalTrekkingen };
    }
    vorigeWinstDatum = winst.datum;
  }

  // Op het randje — per (gebruiker, speelreeks) het hoogst bereikte
  // aantalGoed; telt hoe vaak dat maximum precies 5 was (dus nooit
  // over de streep bij 6, zonder die reeks te winnen). Geeft
  // erkenning aan wie vaak dichtbij zat, niet alleen aan winnaars.
  const maxPerGebruikerRonde = new Map<string, number>();
  for (const r of resultaten) {
    const key = `${r.userId}|${r.rondeId}`;
    const huidig = maxPerGebruikerRonde.get(key) ?? 0;
    if (r.aantalGoed > huidig) maxPerGebruikerRonde.set(key, r.aantalGoed);
  }
  const opHetRandjeTelling: Record<string, number> = {};
  for (const [key, maxGoed] of maxPerGebruikerRonde.entries()) {
    if (maxGoed === 5) {
      const userId = key.split('|')[0];
      opHetRandjeTelling[userId] = (opHetRandjeTelling[userId] ?? 0) + 1;
    }
  }
  const opHetRandjeTop = Object.entries(opHetRandjeTelling).sort((a, b) => b[1] - a[1])[0];

  const hoofdrecords: HallOfFameRecord[] = [];

  if (snelsteWinnaar) {
    hoofdrecords.push({
      categorie: 'Snelste winnaar',
      icoon: '⚡',
      userNaam: snelsteWinnaar.userNaam,
      waarde: `${snelsteWinnaar.aantalTrekkingen} trekking${snelsteWinnaar.aantalTrekkingen === 1 ? '' : 'en'}`,
      sub: 'tot 6 goed',
    });
  }
  if (meestGewonnen) {
    hoofdrecords.push({
      categorie: 'Meeste overwinningen',
      icoon: '🏆',
      userNaam: namen[meestGewonnen[0]],
      waarde: `${meestGewonnen[1]}×`,
      sub: 'gewonnen — all-time',
    });
  }
  if (besteEnkeleTrekking) {
    hoofdrecords.push({
      categorie: 'Grootste treffer',
      icoon: '🎯',
      userNaam: besteEnkeleTrekking.userNaam,
      waarde: `${besteEnkeleTrekking.nummersGoed?.length ?? 0} nieuwe nummers`,
      sub: 'in één trekking',
    });
  }
  if (opHetRandjeTop) {
    hoofdrecords.push({
      categorie: 'Op het randje',
      icoon: '😅',
      userNaam: namen[opHetRandjeTop[0]],
      waarde: `${opHetRandjeTop[1]}×`,
      sub: 'op 5/6 gestaan, niet gewonnen',
    });
  }

  const raceNaarZes = [3, 4, 5].map(drempel => berekenSnelsteOpDrempel(resultaten, trekkingDatums, drempel));

  // De getallen — meest/minst gevallen nummer, all-time over alle
  // trekkingen (niet beperkt tot dit seizoen).
  const telling: Record<number, number> = {};
  for (const t of trekkingen) {
    for (const n of t.nummers) {
      telling[n] = (telling[n] ?? 0) + 1;
    }
  }
  const getallen = Object.entries(telling).map(([n, aantal]) => ({ nummer: parseInt(n, 10), aantal }));
  const meestGevallenNummer = getallen.length > 0
    ? getallen.reduce((a, b) => (b.aantal > a.aantal ? b : a))
    : null;
  const minstGevallenNummer = getallen.length > 0
    ? getallen.reduce((a, b) => (b.aantal < a.aantal ? b : a))
    : null;

  return { hoofdrecords, raceNaarZes, meestGevallenNummer, minstGevallenNummer };
}
