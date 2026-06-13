import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Seizoen, Ronde } from './types';

// ─────────────────────── Seizoenen ───────────────────────

function mapSeizoen(d: { id: string; data: () => Record<string, unknown> }): Seizoen {
  const data = d.data();
  return {
    id: d.id,
    naam: data.naam as string ?? '',
    startDatum: data.startDatum as Seizoen['startDatum'] ?? null,
    eindDatum: data.eindDatum as Seizoen['eindDatum'] ?? null,
    status: data.status as Seizoen['status'] ?? 'actief',
  };
}

export function subscribeSeizoen(callback: (seizoen: Seizoen | null) => void) {
  const q = query(
    collection(db, 'seizoenen'),
    where('status', '==', 'actief'),
    limit(1)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.empty ? null : mapSeizoen(snap.docs[0] as Parameters<typeof mapSeizoen>[0])),
    () => callback(null)
  );
}

export function subscribeAlleSeizoenen(callback: (seizoenen: Seizoen[]) => void) {
  const q = query(collection(db, 'seizoenen'), orderBy('startDatum', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => mapSeizoen(d as Parameters<typeof mapSeizoen>[0]))),
    () => callback([])
  );
}

export async function maakSeizoen(naam: string): Promise<string> {
  const ref = await addDoc(collection(db, 'seizoenen'), {
    naam,
    startDatum: serverTimestamp(),
    eindDatum: null,
    status: 'actief',
  });
  return ref.id;
}

export async function sluitSeizoen(seizoenId: string) {
  await updateDoc(doc(db, 'seizoenen', seizoenId), {
    status: 'gesloten',
    eindDatum: serverTimestamp(),
  });
}

// ─────────────────────── Rondes ───────────────────────

function mapRonde(d: { id: string; data: () => Record<string, unknown> }): Ronde {
  const data = d.data();
  return {
    id: d.id,
    seizoenId: data.seizoenId as string ?? '',
    nummer: data.nummer as number ?? 0,
    sluitingsDatum: data.sluitingsDatum as Ronde['sluitingsDatum'] ?? null,
    trekkingsDatum: data.trekkingsDatum as Ronde['trekkingsDatum'] ?? null,
    status: data.status as Ronde['status'] ?? 'open',
    inleg: data.inleg as number ?? 4,
  };
}

export function subscribeRondes(seizoenId: string, callback: (rondes: Ronde[]) => void) {
  const q = query(
    collection(db, 'rondes'),
    where('seizoenId', '==', seizoenId),
    orderBy('nummer', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => mapRonde(d as Parameters<typeof mapRonde>[0]))),
    () => callback([])
  );
}

export async function maakRonde(seizoenId: string, nummer: number, inleg = 4): Promise<string> {
  const ref = await addDoc(collection(db, 'rondes'), {
    seizoenId,
    nummer,
    sluitingsDatum: null,
    trekkingsDatum: null,
    status: 'open',
    inleg,
  });
  return ref.id;
}
