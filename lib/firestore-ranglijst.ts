import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Resultaat } from './types';

// ─────────────────────── Ranglijst ───────────────────────

export interface RanglijstEntry {
  positie: number;
  user: User;
  aantalDeelnames: number;
  aantalGewonnen: number;
  besteScore: number;
  gemiddeldeScore: number;
  totaalPunten: number;
}

/**
 * Live ranglijst op basis van ranglijstPunten in /users.
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
        } as User;
      });

      // Haal per user statistieken op uit /resultaten
      // Gebruik één query voor alle resultaten (efficiënter dan N queries)
      const resultatenSnap = await getDocs(collection(db, 'resultaten'));
      const resultaten = resultatenSnap.docs.map(d => d.data() as Resultaat);

      // Client-side sorteren op ranglijstPunten (hoog → laag) — geen orderBy().
      const gesorteerdeUsers = [...users].sort((a, b) => b.ranglijstPunten - a.ranglijstPunten);

      const entries: RanglijstEntry[] = gesorteerdeUsers.map((user, i) => {
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

        // KRITIEK: besteScore/gemiddeldeScore gebruiken nummersGoed
        // (nieuwe matches DIE trekking), niet het cumulatieve aantalGoed.
        // aantalGoed loopt binnen een speelreeks alleen maar op, dus een
        // gemiddelde/maximum daarvan over meerdere trekkingen zou geen
        // zinnige "hoe goed presteer je per trekking"-waarde meer geven.
        const besteScore = aantalDeelnames > 0
          ? Math.max(...bestePerTrekking.map(r => r.nummersGoed?.length ?? 0))
          : 0;
        const gemiddeldeScore = aantalDeelnames > 0
          ? Math.round((bestePerTrekking.reduce((s, r) => s + (r.nummersGoed?.length ?? 0), 0) / aantalDeelnames) * 10) / 10
          : 0;

        return {
          positie: i + 1,
          user,
          aantalDeelnames,
          aantalGewonnen,
          besteScore,
          gemiddeldeScore,
          totaalPunten: user.ranglijstPunten,
        };
      });

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

/**
 * Berekent all-time records uit de /resultaten en /trekkingen collecties.
 * Returned als statische snapshot (niet live) — wordt aangeroepen
 * bij mount van de Hall of Fame pagina.
 */
export async function haalHallOfFameOp(): Promise<HallOfFameRecord[]> {
  const [resultatenSnap, trekkingenSnap] = await Promise.all([
    getDocs(collection(db, 'resultaten')),
    getDocs(collection(db, 'trekkingen')),
  ]);
  const resultaten = resultatenSnap.docs.map(d => d.data() as Resultaat & { id: string });

  const trekkingDatums = new Map<string, Date>();
  trekkingenSnap.docs.forEach(d => {
    const data = d.data();
    trekkingDatums.set(d.id, data.datum?.toDate?.() ?? new Date(0));
  });

  if (resultaten.length === 0) return [];

  // Meeste NIEUWE nummers in één trekking — i.p.v. cumulatief aantalGoed,
  // dat sinds de clubmodus alleen maar oploopt binnen een speelreeks en
  // dus geen "record" meer is zodra iemand een keer heeft gewonnen.
  const besteEnkeleTrekking = resultaten.reduce((a, b) =>
    (b.nummersGoed?.length ?? 0) > (a.nummersGoed?.length ?? 0) ? b : a
  );

  // Meeste deelnames / meeste overwinningen (ongewijzigd — deze
  // gebruikten al aantal trekkingen resp. isWinnaar, niet aantalGoed)
  const deelnames: Record<string, Set<string>> = {};
  const gewonnen: Record<string, number> = {};
  const namen: Record<string, string> = {};
  for (const r of resultaten) {
    if (!deelnames[r.userId]) deelnames[r.userId] = new Set();
    deelnames[r.userId].add(r.trekkingId);
    namen[r.userId] = r.userNaam;
    if (r.isWinnaar) gewonnen[r.userId] = (gewonnen[r.userId] ?? 0) + 1;
  }

  const meestDeelnames = Object.entries(deelnames)
    .sort((a, b) => b[1].size - a[1].size)[0];

  const meestGewonnen = Object.entries(gewonnen)
    .sort((a, b) => b[1] - a[1])[0];

  // Snelste winnaar — minste trekkingen nodig binnen één speelreeks om
  // te winnen. Dit kan pas bestaan sinds de cumulatieve clubmodus.
  // Benadering: per winnende trekking (chronologisch) tellen we hoeveel
  // trekkingen van die speler vielen ná de vorige winst (of vanaf het
  // begin) tot en met deze winst.
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

  const records: HallOfFameRecord[] = [];

  if (besteEnkeleTrekking) {
    records.push({
      categorie: 'Meeste nummers in één trekking',
      icoon: '🎯',
      userNaam: besteEnkeleTrekking.userNaam,
      waarde: `${besteEnkeleTrekking.nummersGoed?.length ?? 0} nieuw`,
      sub: `${besteEnkeleTrekking.ticketNaam}`,
    });
  }

  if (snelsteWinnaar) {
    records.push({
      categorie: 'Snelste winnaar',
      icoon: '⚡',
      userNaam: snelsteWinnaar.userNaam,
      waarde: `${snelsteWinnaar.aantalTrekkingen} trekking${snelsteWinnaar.aantalTrekkingen === 1 ? '' : 'en'}`,
      sub: 'tot 6 goed',
    });
  }

  if (meestGewonnen) {
    records.push({
      categorie: 'Meeste overwinningen',
      icoon: '🏆',
      userNaam: namen[meestGewonnen[0]],
      waarde: `${meestGewonnen[1]}×`,
      sub: 'all-time',
    });
  }

  if (meestDeelnames) {
    records.push({
      categorie: 'Meeste deelnames',
      icoon: '📊',
      userNaam: namen[meestDeelnames[0]],
      waarde: `${meestDeelnames[1].size} trekkingen`,
      sub: 'all-time',
    });
  }

  return records;
}
