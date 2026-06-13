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
  writeBatch,
  increment,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trekking, Resultaat, SpelConfig, PrijsConfig } from './types';
import { verwerkTrekking, LidTickets } from './controle-engine';
import { logAudit } from './firestore-audit';

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
  spelConfig: SpelConfig;
  prijsConfig: PrijsConfig;
}

/**
 * Slaat een trekking op in Firestore en verwerkt hem direct:
 * 1. Haal alle actieve gebruikers + tickets op
 * 2. Roep de pure controle-engine aan
 * 3. Schrijf resultaten in een batch (atomisch)
 * 4. Update ranglijstPunten per gebruiker
 * 5. Markeer ronde als verwerkt
 * 6. Schrijf audit log
 *
 * Later kan stap 2-6 exact zo naar een Cloud Function verhuizen.
 */
export async function slaaTrekkingOpEnVerwerk(
  input: SlaaTrekkingOpInput,
  auditUser: { uid: string; naam: string }
): Promise<string> {
  // 1. Sla trekking op
  const trekkingRef = await addDoc(collection(db, 'trekkingen'), {
    rondeId: input.rondeId,
    seizoenId: input.seizoenId,
    nummers: input.nummers,
    bonusBal: input.bonusBal,
    datum: serverTimestamp(),
    ingevoerdDoor: input.ingevoerdDoor,
    ingevoerdDoorNaam: input.ingevoerdDoorNaam,
    verwerkt: false,
  });

  const trekkingId = trekkingRef.id;

  try {
    // 2. Haal alle actieve users op
    const usersSnap = await getDocs(query(
      collection(db, 'users'),
      where('actief', '==', true)
    ));

    const deelnemers: LidTickets[] = usersSnap.docs
      .map(d => {
        const data = d.data();
        return {
          userId: d.id,
          userNaam: data.naam as string ?? 'Onbekend',
          tickets: (data.tickets as { id: string; naam: string; nummers: number[] }[] ?? [])
            .filter(t => t.nummers && t.nummers.length > 0),
        };
      })
      .filter(d => d.tickets.length > 0);

    // 3. Voer controle-engine uit (pure functie, geen side-effects)
    const trekking: Trekking = {
      id: trekkingId,
      rondeId: input.rondeId,
      seizoenId: input.seizoenId,
      nummers: input.nummers,
      bonusBal: input.bonusBal,
      datum: null,
      ingevoerdDoor: input.ingevoerdDoor,
      ingevoerdDoorNaam: input.ingevoerdDoorNaam,
      verwerkt: false,
    };

    const output = verwerkTrekking({
      trekking,
      deelnemers,
      spelConfig: input.spelConfig,
      prijsConfig: input.prijsConfig,
    });

    // 4. Schrijf resultaten + ranglijstPunten atomisch
    const batch = writeBatch(db);

    for (const resultaat of output.resultaten) {
      const rRef = doc(collection(db, 'resultaten'));
      batch.set(rRef, {
        ...resultaat,
        verwerktOp: serverTimestamp(),
      });
    }

    for (const update of output.ranglijstUpdates) {
      if (update.extraPunten > 0) {
        batch.update(doc(db, 'users', update.userId), {
          ranglijstPunten: increment(update.extraPunten),
        });
      }
    }

    // 5. Markeer trekking als verwerkt + ronde als verwerkt
    batch.update(doc(db, 'trekkingen', trekkingId), { verwerkt: true });
    if (input.rondeId) {
      batch.update(doc(db, 'rondes', input.rondeId), { status: 'verwerkt' });
    }

    await batch.commit();

    // 6. Audit log
    const winnaarNamen = output.winnaars.map(w => w.userNaam).join(', ');
    await logAudit(
      'trekking_ingevoerd',
      `${auditUser.naam} voerde trekking in: [${input.nummers.join(', ')}]${input.bonusBal ? ` + B:${input.bonusBal}` : ''}. ${output.winnaars.length} winnaar(s): ${winnaarNamen || 'geen'}`,
      auditUser
    );

  } catch (err) {
    // Markeer trekking als niet-verwerkt zodat het opnieuw geprobeerd kan worden
    await updateDoc(doc(db, 'trekkingen', trekkingId), { verwerkt: false });
    throw err;
  }

  return trekkingId;
}
