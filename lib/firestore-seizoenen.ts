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
import { Seizoen } from './types';

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
