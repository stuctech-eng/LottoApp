import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trekking, Resultaat, SpelConfig, PrijsConfig } from './types';

// ─────────────────────── Helpers ───────────────────────

function mapTrekking(d: { id: string; data: () => Record<string, unknown> }): Trekking {
  const data = d.data();
  return {
    id: d.id,
    rondeId: data.rondeId as string ?? '',
    seizoenId: data.seizoenId as string ?? '',
    nummers: data.nummers as number[] ?? [],
    bonusBal: data.bonusBal as number | null ?? null,
    datum: data.datum as Trekking['datum'] ?? null,
    ingevoerdDoor: data.ingevoerdDoor as string ?? '',
    ingevoerdDoorNaam: data.ingevoerdDoorNaam as string ?? '',
    verwerkt: data.verwerkt as boolean ?? false,
  };
}

// ─────────────────────── Queries ───────────────────────

export function subscribeTrekkingen(seizoenId: string, callback: (trekkingen: Trekking[]) => void) {
  const q = query(
    collection(db, 'trekkingen'),
    where('seizoenId', '==', seizoenId),
    orderBy('datum', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => mapTrekking(d as Parameters<typeof mapTrekking>[0]))),
    () => callback([])
  );
}

export function subscribeAlleTrekkingen(callback: (trekkingen: Trekking[]) => void) {
  const q = query(collection(db, 'trekkingen'), orderBy('datum', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => mapTrekking(d as Parameters<typeof mapTrekking>[0]))),
    () => callback([])
  );
}

export function subscribeTrekking(trekkingId: string, callback: (trekking: Trekking | null) => void) {
  return onSnapshot(
    doc(db, 'trekkingen', trekkingId),
    (snap) => callback(snap.exists() ? mapTrekking(snap as Parameters<typeof mapTrekking>[0]) : null),
    () => callback(null)
  );
}

export function subscribeResultaten(trekkingId: string, callback: (resultaten: Resultaat[]) => void) {
  const q = query(
    collection(db, 'resultaten'),
    where('trekkingId', '==', trekkingId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const resultaten = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          userNaam: data.userNaam,
          ticketId: data.ticketId,
          ticketNaam: data.ticketNaam,
          rondeId: data.rondeId,
          seizoenId: data.seizoenId,
          trekkingId: data.trekkingId,
          nummersGoed: data.nummersGoed ?? [],
          aantalGoed: data.aantalGoed ?? 0,
          bonusGoed: data.bonusGoed ?? false,
          punten: data.punten ?? 0,
          isWinnaar: data.isWinnaar ?? false,
          verwerktOp: data.verwerktOp ?? null,
        } as Resultaat;
      });
      // Sorteer: winnaars eerst, dan op punten desc
      resultaten.sort((a, b) => {
        if (a.isWinnaar !== b.isWinnaar) return a.isWinnaar ? -1 : 1;
        return b.punten - a.punten;
      });
      callback(resultaten);
    },
    () => callback([])
  );
}

// ─────────────────────── Trekking invoeren + verwerken ───────────────────────

interface SlaaTrekkingOpInput {
  rondeId: string;
  seizoenId: string;
  nummers: number[];
  bonusBal: number | null;
  ingevoerdDoor: string;
  ingevoerdDoorNaam: string;
}

/**
 * Slaat een trekking op in Firestore.
 * De verwerking (controle-engine, resultaten, ranglijst, push notificaties)
 * wordt volledig afgehandeld door de Cloud Function onTrekkingVerwerkt.
 *
 * ARCHITECTUURREGEL: client schrijft alleen data,
 * server-side logica draait in Cloud Functions.
 */
export async function slaaTrekkingOpEnVerwerk(
  input: SlaaTrekkingOpInput,
  auditUser: { uid: string; naam: string }
): Promise<string> {
  // Sla trekking op met verwerkt: false
  // Cloud Function onTrekkingVerwerkt pikt dit op en verwerkt het
  const trekkingRef = await addDoc(collection(db, 'trekkingen'), {
    rondeId: input.rondeId,
    seizoenId: input.seizoenId,
    nummers: input.nummers,
    bonusBal: input.bonusBal,
    datum: serverTimestamp(),
    ingevoerdDoor: input.ingevoerdDoor,
    ingevoerdDoorNaam: input.ingevoerdDoorNaam,
    verwerkt: false,  // Cloud Function zet dit op true na verwerking
  });

  return trekkingRef.id;
}
