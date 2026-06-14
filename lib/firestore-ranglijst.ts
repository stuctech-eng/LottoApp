import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit as fbLimit,
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

/** Live ranglijst op basis van ranglijstPunten in /users, gesorteerd hoog→laag. */
export function subscribeRanglijst(callback: (entries: RanglijstEntry[]) => void) {
  const q = query(
    collection(db, 'users'),
    where('actief', '==', true),
    orderBy('ranglijstPunten', 'desc')
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

      const entries: RanglijstEntry[] = users.map((user, i) => {
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
        const besteScore = aantalDeelnames > 0 ? Math.max(...bestePerTrekking.map(r => r.aantalGoed)) : 0;
        const gemiddeldeScore = aantalDeelnames > 0
          ? Math.round((bestePerTrekking.reduce((s, r) => s + r.aantalGoed, 0) / aantalDeelnames) * 10) / 10
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
 * Berekent all-time records uit de /resultaten collectie.
 * Returned als statische snapshot (niet live) — wordt aangeroepen
 * bij mount van de Hall of Fame pagina.
 */
export async function haalHallOfFameOp(): Promise<HallOfFameRecord[]> {
  const snap = await getDocs(collection(db, 'resultaten'));
  const resultaten = snap.docs.map(d => d.data() as Resultaat & { id: string });

  if (resultaten.length === 0) return [];

  // Hoogste score ooit
  const hoogsteScore = resultaten.reduce((a, b) => a.aantalGoed > b.aantalGoed ? a : b);

  // Meeste deelnames (per userId, beste per trekking)
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

  const records: HallOfFameRecord[] = [];

  if (hoogsteScore) {
    records.push({
      categorie: 'Hoogste score ooit',
      icoon: '🎯',
      userNaam: hoogsteScore.userNaam,
      waarde: `${hoogsteScore.aantalGoed} goed`,
      sub: `${hoogsteScore.ticketNaam}`,
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
