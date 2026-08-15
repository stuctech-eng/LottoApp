import {
  collection,
  doc,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './firestore-audit';
import { GeplandeNotificatie, NotificatieDoelgroep, NotificatieHerhaling } from './types';

interface ActieUser {
  uid: string;
  naam: string;
}

/**
 * Geen orderBy() — zie de architectuurregel elders in dit project:
 * vereist een composite index, geeft zonder index een stille lege
 * array terug. Sorteren gebeurt hieronder in JS na het ophalen.
 */
export function subscribeGeplandeNotificaties(callback: (notificaties: GeplandeNotificatie[]) => void) {
  const q = query(collection(db, 'geplandeNotificaties'));
  return onSnapshot(q, (snap) => {
    const notificaties = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        titel: data.titel ?? '',
        bericht: data.bericht ?? '',
        doelgroep: data.doelgroep ?? 'alleLeden',
        herhaling: data.herhaling ?? 'eenmalig',
        geplandOp: data.geplandOp ?? null,
        actief: data.actief ?? true,
        laatstVerstuurdOp: data.laatstVerstuurdOp ?? null,
        laatstVerstuurdVoorPeriode: data.laatstVerstuurdVoorPeriode ?? null,
        aangemaaktDoor: data.aangemaaktDoor ?? '',
        aangemaaktDoorNaam: data.aangemaaktDoorNaam ?? '',
        aangemaaktOp: data.aangemaaktOp ?? null,
      } as GeplandeNotificatie;
    });
    // Nieuwste-aanmaak eerst, puur voor een prettig overzicht
    notificaties.sort((a, b) => (b.aangemaaktOp?.toMillis() ?? 0) - (a.aangemaaktOp?.toMillis() ?? 0));
    callback(notificaties);
  });
}

export async function maakGeplandeNotificatie(
  gegevens: {
    titel: string;
    bericht: string;
    doelgroep: NotificatieDoelgroep;
    herhaling: NotificatieHerhaling;
    geplandOp: Date;
  },
  aangemaaktDoor: ActieUser
): Promise<string> {
  const ref = await addDoc(collection(db, 'geplandeNotificaties'), {
    titel: gegevens.titel,
    bericht: gegevens.bericht,
    doelgroep: gegevens.doelgroep,
    herhaling: gegevens.herhaling,
    geplandOp: Timestamp.fromDate(gegevens.geplandOp),
    actief: true,
    laatstVerstuurdOp: null,
    laatstVerstuurdVoorPeriode: null,
    aangemaaktDoor: aangemaaktDoor.uid,
    aangemaaktDoorNaam: aangemaaktDoor.naam,
    aangemaaktOp: serverTimestamp(),
  });
  await logAudit(
    'geplande_notificatie_aangemaakt',
    `${aangemaaktDoor.naam} maakte de geplande notificatie "${gegevens.titel}" aan (${gegevens.herhaling})`,
    aangemaaktDoor
  );
  return ref.id;
}

export async function updateGeplandeNotificatie(
  id: string,
  wijzigingen: Partial<{
    titel: string;
    bericht: string;
    doelgroep: NotificatieDoelgroep;
    herhaling: NotificatieHerhaling;
    geplandOp: Date;
    actief: boolean;
  }>,
  bewerktDoor: ActieUser
) {
  const updates: Record<string, unknown> = { ...wijzigingen };
  if (wijzigingen.geplandOp) updates.geplandOp = Timestamp.fromDate(wijzigingen.geplandOp);
  await updateDoc(doc(db, 'geplandeNotificaties', id), updates);
  await logAudit(
    'geplande_notificatie_gewijzigd',
    `${bewerktDoor.naam} wijzigde de geplande notificatie${wijzigingen.titel ? ` "${wijzigingen.titel}"` : ''}`,
    bewerktDoor
  );
}

export async function verwijderGeplandeNotificatie(id: string, titel: string, verwijderdDoor: ActieUser) {
  await deleteDoc(doc(db, 'geplandeNotificaties', id));
  await logAudit(
    'geplande_notificatie_verwijderd',
    `${verwijderdDoor.naam} verwijderde de geplande notificatie "${titel}"`,
    verwijderdDoor
  );
}
