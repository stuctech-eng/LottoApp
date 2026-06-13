import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Betaling, Kasmutatie } from './types';
import { logAudit } from './firestore-audit';

interface ActieUser {
  uid: string;
  naam: string;
}

// ───────────────────────── Kasmutaties ─────────────────────────

/** Live-luisteren naar alle kasmutaties, nieuwste eerst. */
export function subscribeKasmutaties(callback: (mutaties: Kasmutatie[]) => void) {
  const q = query(collection(db, 'kasmutaties'), orderBy('datum', 'desc'));
  return onSnapshot(q, (snap) => {
    const mutaties: Kasmutatie[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        datum: data.datum ?? null,
        omschrijving: data.omschrijving ?? '',
        bedrag: data.bedrag ?? 0,
        type: data.type ?? 'correctie',
        rondeId: data.rondeId,
        userId: data.userId,
        betalingId: data.betalingId,
        aangemaaktDoor: data.aangemaaktDoor,
      };
    });
    callback(mutaties);
  });
}

/**
 * kasSaldo wordt NOOIT opgeslagen — altijd berekend als som van alle
 * kasmutaties. Voorkomt synchronisatieproblemen.
 */
export function berekenKasSaldo(mutaties: Kasmutatie[]): number {
  return mutaties.reduce((sum, m) => sum + m.bedrag, 0);
}

async function maakKasmutatie(input: {
  omschrijving: string;
  bedrag: number;
  type: Kasmutatie['type'];
  userId?: string;
  betalingId?: string;
  aangemaaktDoor: string;
}) {
  await addDoc(collection(db, 'kasmutaties'), {
    datum: serverTimestamp(),
    omschrijving: input.omschrijving,
    bedrag: input.bedrag,
    type: input.type,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.betalingId ? { betalingId: input.betalingId } : {}),
    aangemaaktDoor: input.aangemaaktDoor,
  });
}

// ───────────────────────── Betalingen ─────────────────────────

/** Live-luisteren naar alle betalingen (voor kashouder/beheerder). */
export function subscribeBetalingen(callback: (betalingen: Betaling[]) => void) {
  const q = query(collection(db, 'betalingen'), orderBy('aangemaakt', 'desc'));
  return onSnapshot(q, (snap) => {
    const betalingen: Betaling[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        userNaam: data.userNaam,
        bedrag: data.bedrag,
        omschrijving: data.omschrijving,
        provider: data.provider,
        status: data.status,
        aangemaakt: data.aangemaakt ?? null,
        bevestigd: data.bevestigd ?? null,
        bevestigdDoor: data.bevestigdDoor ?? null,
        rondeId: data.rondeId,
      };
    });
    callback(betalingen);
  });
}

/** Live-luisteren naar de betalingen van één gebruiker. */
export function subscribeUserBetalingen(uid: string, callback: (betalingen: Betaling[]) => void) {
  const q = query(collection(db, 'betalingen'), where('userId', '==', uid), orderBy('aangemaakt', 'desc'));
  return onSnapshot(q, (snap) => {
    const betalingen: Betaling[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        userNaam: data.userNaam,
        bedrag: data.bedrag,
        omschrijving: data.omschrijving,
        provider: data.provider,
        status: data.status,
        aangemaakt: data.aangemaakt ?? null,
        bevestigd: data.bevestigd ?? null,
        bevestigdDoor: data.bevestigdDoor ?? null,
        rondeId: data.rondeId,
      };
    });
    callback(betalingen);
  });
}

/** Lid meldt een betaling (offline provider) → status 'verificatie'. */
export async function meldBetaling(user: ActieUser, bedrag: number, omschrijving: string) {
  const ref = await addDoc(collection(db, 'betalingen'), {
    userId: user.uid,
    userNaam: user.naam,
    bedrag,
    omschrijving,
    provider: 'offline',
    status: 'verificatie',
    aangemaakt: serverTimestamp(),
    bevestigd: null,
    bevestigdDoor: null,
  });
  await logAudit('betaling_gemeld', `${user.naam} meldde een betaling van €${bedrag.toFixed(2)} (${omschrijving})`, user, {
    doelUserId: user.uid,
  });
  return ref.id;
}

/** Kashouder bevestigt een betaling → status 'betaald' + kasmutatie + audit. */
export async function bevestigBetaling(betaling: Betaling, kashouder: ActieUser) {
  await updateDoc(doc(db, 'betalingen', betaling.id), {
    status: 'betaald',
    bevestigd: serverTimestamp(),
    bevestigdDoor: kashouder.uid,
  });
  await maakKasmutatie({
    omschrijving: `${betaling.omschrijving} — ${betaling.userNaam}`,
    bedrag: Math.abs(betaling.bedrag),
    type: 'inleg',
    userId: betaling.userId,
    betalingId: betaling.id,
    aangemaaktDoor: kashouder.uid,
  });
  await logAudit('betaling_bevestigd', `${kashouder.naam} bevestigde betaling van ${betaling.userNaam} (€${betaling.bedrag.toFixed(2)})`, kashouder, {
    doelUserId: betaling.userId,
  });
}

/** Kashouder wijst een betaling af → status 'afgewezen' + audit. */
export async function wijsBetalingAf(betaling: Betaling, kashouder: ActieUser) {
  await updateDoc(doc(db, 'betalingen', betaling.id), {
    status: 'afgewezen',
    bevestigd: serverTimestamp(),
    bevestigdDoor: kashouder.uid,
  });
  await logAudit('betaling_afgewezen', `${kashouder.naam} wees betaling van ${betaling.userNaam} af (€${betaling.bedrag.toFixed(2)})`, kashouder, {
    doelUserId: betaling.userId,
  });
}

// ───────────────────────── Uitbetalingen & correcties ─────────────────────────

/** Kashouder registreert een uitbetaling → kasmutatie (negatief) + audit. */
export async function registreerUitbetaling(input: {
  bedrag: number;
  omschrijving: string;
  doelUserId?: string;
}, kashouder: ActieUser) {
  await maakKasmutatie({
    omschrijving: input.omschrijving,
    bedrag: -Math.abs(input.bedrag),
    type: 'uitbetaling',
    userId: input.doelUserId,
    aangemaaktDoor: kashouder.uid,
  });
  await logAudit('uitbetaling_geregistreerd', `${kashouder.naam} registreerde uitbetaling van €${Math.abs(input.bedrag).toFixed(2)} (${input.omschrijving})`, kashouder, {
    doelUserId: input.doelUserId,
  });
}

/** Kashouder voert een kascorrectie door (positief of negatief) + audit. */
export async function registreerCorrectie(input: {
  bedrag: number; // teken bepaalt + of -
  omschrijving: string;
}, kashouder: ActieUser) {
  await maakKasmutatie({
    omschrijving: input.omschrijving,
    bedrag: input.bedrag,
    type: 'correctie',
    aangemaaktDoor: kashouder.uid,
  });
  await logAudit('kascorrectie', `${kashouder.naam} voerde een correctie door: ${input.bedrag >= 0 ? '+' : ''}€${input.bedrag.toFixed(2)} (${input.omschrijving})`, kashouder);
}
