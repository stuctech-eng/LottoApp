import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Betaling, Kasmutatie } from './types';
import { logAudit } from './firestore-audit';
import { STANDAARD_INLEG, STANDAARD_OMSCHRIJVING } from './constants';

interface ActieUser {
  uid: string;
  naam: string;
}

/**
 * ISO-8601 weeknummer als string, bijv. "2026-W28".
 * Week loopt van maandag t/m zondag.
 */
export function huidigTrekkingWeek(datum?: Date): string {
  const d = new Date(Date.UTC(
    (datum ?? new Date()).getFullYear(),
    (datum ?? new Date()).getMonth(),
    (datum ?? new Date()).getDate()
  ));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNr = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNr).padStart(2, '0')}`;
}

// ───────────────────────── Kasmutaties ─────────────────────────

export function subscribeKasmutaties(callback: (mutaties: Kasmutatie[]) => void) {
  // Geen orderBy — voorkomt index-problemen
  const q = query(collection(db, 'kasmutaties'));
  return onSnapshot(
    q,
    (snap) => {
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
      // Sorteer client-side
      mutaties.sort((a, b) => (b.datum?.toMillis() ?? 0) - (a.datum?.toMillis() ?? 0));
      callback(mutaties);
    },
    (err) => {
      console.error('subscribeKasmutaties error:', err);
      callback([]);
    }
  );
}

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

export function subscribeBetalingen(callback: (betalingen: Betaling[]) => void) {
  // Geen orderBy — voorkomt index-problemen die silent lege array teruggeven
  const q = query(collection(db, 'betalingen'));
  return onSnapshot(
    q,
    (snap) => {
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
          trekkingWeek: data.trekkingWeek,
          tikkieGeopend: data.tikkieGeopend ?? false,
        };
      });
      // Sorteer client-side — nieuwste eerst
      betalingen.sort((a, b) => (b.aangemaakt?.toMillis() ?? 0) - (a.aangemaakt?.toMillis() ?? 0));
      callback(betalingen);
    },
    (err) => {
      console.error('subscribeBetalingen error:', err);
      callback([]);
    }
  );
}

export function subscribeUserBetalingen(uid: string, callback: (betalingen: Betaling[]) => void) {
  const q = query(collection(db, 'betalingen'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
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
          trekkingWeek: data.trekkingWeek,
          tikkieGeopend: data.tikkieGeopend ?? false,
        };
      });
      betalingen.sort((a, b) => (b.aangemaakt?.toMillis() ?? 0) - (a.aangemaakt?.toMillis() ?? 0));
      callback(betalingen);
    },
    (err) => {
      console.error('subscribeUserBetalingen error:', err);
      callback([]);
    }
  );
}

export async function meldBetaling(user: ActieUser, bedrag: number, omschrijving: string) {
  const week = huidigTrekkingWeek();
  const ref = await addDoc(collection(db, 'betalingen'), {
    userId: user.uid,
    userNaam: user.naam,
    bedrag,
    omschrijving,
    provider: 'offline',
    status: 'verificatie',
    trekkingWeek: week,
    tikkieGeopend: false,
    aangemaakt: serverTimestamp(),
    bevestigd: null,
    bevestigdDoor: null,
  });
  await logAudit(
    'betaling_gemeld',
    `${user.naam} meldde een betaling van €${bedrag.toFixed(2)} (${omschrijving}) voor week ${week}`,
    user,
    { doelUserId: user.uid }
  );
  return ref.id;
}

export async function markeerTikkieGeopend(betalingId: string): Promise<void> {
  await updateDoc(doc(db, 'betalingen', betalingId), {
    tikkieGeopend: true,
  });
}

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
  await logAudit(
    'betaling_bevestigd',
    `${kashouder.naam} bevestigde betaling van ${betaling.userNaam} (€${betaling.bedrag.toFixed(2)})`,
    kashouder,
    { doelUserId: betaling.userId }
  );
}

export async function wijsBetalingAf(betaling: Betaling, kashouder: ActieUser) {
  await updateDoc(doc(db, 'betalingen', betaling.id), {
    status: 'afgewezen',
    bevestigd: serverTimestamp(),
    bevestigdDoor: kashouder.uid,
  });
  await logAudit(
    'betaling_afgewezen',
    `${kashouder.naam} wees betaling van ${betaling.userNaam} af (€${betaling.bedrag.toFixed(2)})`,
    kashouder,
    { doelUserId: betaling.userId }
  );
}

/**
 * Kashouder markeert een lid direct als betaald voor de huidige week,
 * op basis van eigen verificatie (bijv. gezien in de Tikkie-app) —
 * zonder te wachten tot het lid zelf op "Ik heb betaald" tikt.
 *
 * Werkt in twee situaties:
 * - Er bestaat al een 'open' (of 'verificatie') document voor deze
 *   week → dat wordt bijgewerkt naar 'betaald'.
 * - Er bestaat nog HELEMAAL GEEN document (bijv. omdat het lid pas na
 *   het aanmaken van de weekbetalingen een ticket kreeg) → er wordt
 *   een nieuw document direct met status 'betaald' aangemaakt.
 *
 * In beide gevallen wordt een kasmutatie aangemaakt, net als bij de
 * normale bevestigBetaling-flow.
 */
export async function markeerBetaaldDoorKashouder(
  lid: { id: string; naam: string },
  bestaandDocument: Betaling | null,
  kashouder: ActieUser
) {
  const week = huidigTrekkingWeek();
  const bedrag = bestaandDocument?.bedrag ?? STANDAARD_INLEG;
  const omschrijving = bestaandDocument?.omschrijving ?? STANDAARD_OMSCHRIJVING;
  let betalingId: string;

  if (bestaandDocument) {
    await updateDoc(doc(db, 'betalingen', bestaandDocument.id), {
      status: 'betaald',
      bevestigd: serverTimestamp(),
      bevestigdDoor: kashouder.uid,
    });
    betalingId = bestaandDocument.id;
  } else {
    const ref = await addDoc(collection(db, 'betalingen'), {
      userId: lid.id,
      userNaam: lid.naam,
      bedrag,
      omschrijving,
      provider: 'offline',
      status: 'betaald',
      trekkingWeek: week,
      tikkieGeopend: false,
      aangemaakt: serverTimestamp(),
      bevestigd: serverTimestamp(),
      bevestigdDoor: kashouder.uid,
    });
    betalingId = ref.id;
  }

  await maakKasmutatie({
    omschrijving: `${omschrijving} — ${lid.naam}`,
    bedrag: Math.abs(bedrag),
    type: 'inleg',
    userId: lid.id,
    betalingId,
    aangemaaktDoor: kashouder.uid,
  });
  await logAudit(
    'betaling_bevestigd',
    `${kashouder.naam} markeerde ${lid.naam} direct als betaald (€${bedrag.toFixed(2)}) — via Tikkie geverifieerd, niet gemeld door lid`,
    kashouder,
    { doelUserId: lid.id }
  );
}

/**
 * Kashouder registreert een storting op het LottoSaldo van een lid,
 * op basis van eigen verificatie (bijv. gezien in Tikkie) — net als
 * markeerBetaaldDoorKashouder is de kashouder hier zelf de
 * verificatiestap; een lid kan zijn eigen saldo niet direct verhogen.
 *
 * Verhoogt ALLEEN lottoSaldo — maakt bewust GEEN kasmutatie aan. Het
 * gestorte bedrag is nog geen "pot-geld"; dat wordt het pas stukje bij
 * beetje zodra de wekelijkse automatische afboeking het daadwerkelijk
 * omzet in een 'betaald'-week (zie functions/src/index.ts,
 * onBetalingenAanmaken). Zo blijft kasSaldo = som van kasmutaties
 * kloppen zonder dat vooruitbetaald geld de pot te vroeg opblaast.
 */
export async function stortLottoSaldo(
  lid: { id: string; naam: string },
  bedrag: number,
  kashouder: ActieUser
) {
  await updateDoc(doc(db, 'users', lid.id), {
    lottoSaldo: increment(bedrag),
  });
  await logAudit(
    'lottosaldo_storting',
    `${kashouder.naam} registreerde een storting van €${bedrag.toFixed(2)} op het LottoSaldo van ${lid.naam}`,
    kashouder,
    { doelUserId: lid.id }
  );
}

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
  await logAudit(
    'uitbetaling_geregistreerd',
    `${kashouder.naam} registreerde uitbetaling van €${Math.abs(input.bedrag).toFixed(2)} (${input.omschrijving})`,
    kashouder,
    { doelUserId: input.doelUserId }
  );
}

export async function registreerCorrectie(input: {
  bedrag: number;
  omschrijving: string;
}, kashouder: ActieUser) {
  await maakKasmutatie({
    omschrijving: input.omschrijving,
    bedrag: input.bedrag,
    type: 'correctie',
    aangemaaktDoor: kashouder.uid,
  });
  await logAudit(
    'kascorrectie',
    `${kashouder.naam} voerde een correctie door: ${input.bedrag >= 0 ? '+' : ''}€${input.bedrag.toFixed(2)} (${input.omschrijving})`,
    kashouder
  );
}
