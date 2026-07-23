import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Betaling, Kasmutatie } from './types';
import { logAudit } from './firestore-audit';
import { STANDAARD_OMSCHRIJVING } from './constants';
import { haalVerenigingConfigOp } from './firestore-vereniging';

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

  if (betaling.isSaldoStorting) {
    // Storting verhoogt het LottoSaldo. De kasmutatie hierboven dekt
    // het "geld is er" — dit hierna is puur de boekhouding van het
    // tegoed zelf, geen extra kasmutatie.
    await updateDoc(doc(db, 'users', betaling.userId), {
      lottoSaldo: increment(betaling.bedrag),
    });
    await verrekenLottoSaldoMetOpenstaandeWeek(betaling.userId, betaling.userNaam, kashouder);
  }

  await logAudit(
    'betaling_bevestigd',
    `${kashouder.naam} bevestigde betaling van ${betaling.userNaam} (€${betaling.bedrag.toFixed(2)})${betaling.isSaldoStorting ? ' — LottoSaldo-storting' : ''}`,
    kashouder,
    { doelUserId: betaling.userId }
  );
}

/**
 * Na een bevestigde LottoSaldo-storting: kijkt of het lid nu genoeg
 * tegoed heeft om een eventuele openstaande week van DEZE week
 * meteen automatisch te dekken — zodat je niet apart nog handmatig
 * hoeft te betalen ná het storten. Géén nieuwe kasmutatie: het geld
 * zat al in de kas sinds de storting hierboven.
 */
async function verrekenLottoSaldoMetOpenstaandeWeek(userId: string, userNaam: string, kashouder: ActieUser) {
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) return;
  const lottoSaldo = (userSnap.data().lottoSaldo as number | undefined) ?? 0;
  const { standaardInleg } = await haalVerenigingConfigOp();
  if (lottoSaldo < standaardInleg) return;

  const week = huidigTrekkingWeek();
  const openSnap = await getDocs(query(
    collection(db, 'betalingen'),
    where('userId', '==', userId),
    where('trekkingWeek', '==', week),
    where('status', '==', 'open')
  ));
  if (openSnap.empty) return;

  const openDoc = openSnap.docs[0];
  await updateDoc(openDoc.ref, {
    status: 'betaald',
    bevestigd: serverTimestamp(),
    bevestigdDoor: 'systeem-lottosaldo',
  });
  await updateDoc(doc(db, 'users', userId), {
    lottoSaldo: increment(-standaardInleg),
  });
  await logAudit(
    'betaling_bevestigd',
    `Automatisch verrekend: het LottoSaldo van ${userNaam} dekte de openstaande week ${week}`,
    kashouder,
    { doelUserId: userId }
  );
}

/**
 * Lid meldt zelf een storting op het eigen LottoSaldo — komt bij de
 * kashouder terecht als 'te verifiëren', net als een normale
 * betaalmelding. Wordt pas daadwerkelijk verwerkt na bevestiging
 * (zie bevestigBetaling hierboven).
 */
export async function meldLottoSaldoStorting(user: ActieUser, bedrag: number) {
  await addDoc(collection(db, 'betalingen'), {
    userId: user.uid,
    userNaam: user.naam,
    bedrag,
    omschrijving: 'Vooruitbetaling LottoSaldo',
    provider: 'offline',
    status: 'verificatie',
    tikkieGeopend: true,
    isSaldoStorting: true,
    aangemaakt: serverTimestamp(),
  });
  await logAudit(
    'betaling_gemeld',
    `${user.naam} meldde een LottoSaldo-storting van €${bedrag.toFixed(2)}`,
    user,
    { doelUserId: user.uid }
  );
}

/** Markeert de eenmalige LottoSaldo-uitlegbanner als gezien — puur een
 *  UI-voorkeur, geen financieel risico, dus zelf-service voor het lid. */
export async function markeerLottoSaldoIntroGezien(userId: string) {
  await updateDoc(doc(db, 'users', userId), {
    lottoSaldoIntroSeen: true,
  });
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
/**
 * Kashouder markeert een lid direct als betaald voor de huidige week,
 * op basis van eigen verificatie (bijv. gezien in de Tikkie-app) —
 * zonder te wachten tot het lid zelf op "Ik heb betaald" tikt.
 *
 * Volgorde van checks (belangrijk — voorkomt dubbele/foutieve boekingen):
 * 1. Al 'betaald' deze week? → gooit een fout, doet niets. Voorkomt een
 *    tweede, overbodige betaling + kasmutatie voor iemand die al klaar is.
 * 2. Bestaat er een 'open' document? → dat wordt bevestigd (kashouder
 *    heeft een ECHTE, nieuwe Tikkie-betaling gezien). Kasmutatie erbij,
 *    want dit is nieuw binnengekomen geld.
 * 3. Geen document, maar wel genoeg LottoSaldo? → week wordt gedekt
 *    vanuit het saldo. GEEN nieuwe kasmutatie — dat geld zit al in de
 *    kas sinds de storting werd bevestigd.
 * 4. Geen document, geen (toereikend) saldo? → aanname: kashouder zag
 *    een echte Tikkie-betaling die het lid niet zelf heeft gemeld.
 *    Nieuwe betaling + kasmutatie, zoals voorheen.
 */
export async function markeerBetaaldDoorKashouder(
  lid: { id: string; naam: string },
  bestaandDocument: Betaling | null,
  kashouder: ActieUser
) {
  const week = huidigTrekkingWeek();

  // 1. Voorkom dubbele registratie
  const alBetaaldSnap = await getDocs(query(
    collection(db, 'betalingen'),
    where('userId', '==', lid.id),
    where('trekkingWeek', '==', week),
    where('status', '==', 'betaald')
  ));
  if (!alBetaaldSnap.empty) {
    throw new Error(`${lid.naam} had deze week al betaald — geen nieuwe boeking aangemaakt.`);
  }

  const { standaardInleg } = await haalVerenigingConfigOp();

  // 2. Bestaand 'open' document bevestigen — echte, nieuwe betaling
  if (bestaandDocument) {
    await updateDoc(doc(db, 'betalingen', bestaandDocument.id), {
      status: 'betaald',
      bevestigd: serverTimestamp(),
      bevestigdDoor: kashouder.uid,
    });
    await maakKasmutatie({
      omschrijving: `${bestaandDocument.omschrijving} — ${lid.naam}`,
      bedrag: Math.abs(bestaandDocument.bedrag),
      type: 'inleg',
      userId: lid.id,
      betalingId: bestaandDocument.id,
      aangemaaktDoor: kashouder.uid,
    });
    await logAudit(
      'betaling_bevestigd',
      `${kashouder.naam} bevestigde de betaling van ${lid.naam} (€${bestaandDocument.bedrag.toFixed(2)})`,
      kashouder,
      { doelUserId: lid.id }
    );
    return;
  }

  // 3. Geen document — check eerst LottoSaldo vóórdat er een NIEUWE,
  // kasmutatie-verhogende betaling wordt aangemaakt.
  const userSnap = await getDoc(doc(db, 'users', lid.id));
  const lottoSaldo = (userSnap.exists() ? (userSnap.data().lottoSaldo as number | undefined) : undefined) ?? 0;

  if (lottoSaldo >= standaardInleg) {
    const ref = await addDoc(collection(db, 'betalingen'), {
      userId: lid.id,
      userNaam: lid.naam,
      bedrag: standaardInleg,
      omschrijving: 'Inleg LottoClub (automatisch via LottoSaldo)',
      provider: 'offline',
      status: 'betaald',
      trekkingWeek: week,
      tikkieGeopend: false,
      aangemaakt: serverTimestamp(),
      bevestigd: serverTimestamp(),
      bevestigdDoor: 'systeem-lottosaldo',
    });
    await updateDoc(doc(db, 'users', lid.id), {
      lottoSaldo: increment(-standaardInleg),
    });
    await logAudit(
      'betaling_bevestigd',
      `${kashouder.naam} liet de week van ${lid.naam} dekken vanuit LottoSaldo (€${standaardInleg.toFixed(2)})`,
      kashouder,
      { doelUserId: lid.id }
    );
    return;
  }

  // 4. Geen document, geen toereikend saldo — echte, ongemelde Tikkie-betaling
  const ref = await addDoc(collection(db, 'betalingen'), {
    userId: lid.id,
    userNaam: lid.naam,
    bedrag: standaardInleg,
    omschrijving: STANDAARD_OMSCHRIJVING,
    provider: 'offline',
    status: 'betaald',
    trekkingWeek: week,
    tikkieGeopend: false,
    aangemaakt: serverTimestamp(),
    bevestigd: serverTimestamp(),
    bevestigdDoor: kashouder.uid,
  });
  await maakKasmutatie({
    omschrijving: `${STANDAARD_OMSCHRIJVING} — ${lid.naam}`,
    bedrag: standaardInleg,
    type: 'inleg',
    userId: lid.id,
    betalingId: ref.id,
    aangemaaktDoor: kashouder.uid,
  });
  await logAudit(
    'betaling_bevestigd',
    `${kashouder.naam} markeerde ${lid.naam} direct als betaald (€${standaardInleg.toFixed(2)}) — via Tikkie geverifieerd, niet gemeld door lid`,
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
 * Verhoogt lottoSaldo ÉN maakt direct een kasmutatie aan: het geld is
 * vanaf het moment dat de kashouder het ontvangt economisch al van de
 * club, ook al wordt het pas later als wekelijkse inleg "verbruikt".
 * De wekelijkse automatische afboeking (zie functions/src/index.ts,
 * onBetalingenAanmaken) verlaagt daarna alleen lottoSaldo — die maakt
 * bewust GEEN nieuwe kasmutatie, want dat geld zit al in de kas.
 */
export async function stortLottoSaldo(
  lid: { id: string; naam: string },
  bedrag: number,
  kashouder: ActieUser
) {
  await updateDoc(doc(db, 'users', lid.id), {
    lottoSaldo: increment(bedrag),
  });
  await maakKasmutatie({
    omschrijving: `Vooruitbetaling LottoSaldo — ${lid.naam}`,
    bedrag,
    type: 'inleg',
    userId: lid.id,
    aangemaaktDoor: kashouder.uid,
  });
  await logAudit(
    'lottosaldo_storting',
    `${kashouder.naam} registreerde een storting van €${bedrag.toFixed(2)} op het LottoSaldo van ${lid.naam}`,
    kashouder,
    { doelUserId: lid.id }
  );
}

/**
 * Beheerder corrigeert het LottoSaldo van een lid direct naar een
 * specifiek bedrag — voor het rechtzetten van boekhoudkundige fouten
 * (bijv. een week die per ongeluk buiten het saldo om als betaald is
 * gemarkeerd). In tegenstelling tot stortLottoSaldo: GEEN kasmutatie,
 * want hier beweegt geen nieuw geld — dit is puur het gecorrigeerd
 * weergeven van saldo dat er al was.
 */
export async function corrigeerLottoSaldo(
  lid: { id: string; naam: string },
  nieuwSaldo: number,
  reden: string,
  beheerder: ActieUser
) {
  await updateDoc(doc(db, 'users', lid.id), {
    lottoSaldo: nieuwSaldo,
  });
  await logAudit(
    'lottosaldo_correctie',
    `${beheerder.naam} corrigeerde het LottoSaldo van ${lid.naam} naar €${nieuwSaldo.toFixed(2)} — reden: ${reden}`,
    beheerder,
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
