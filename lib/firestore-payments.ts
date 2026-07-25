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

// meldBetaling is verwijderd (25 juli 2026) — vervangen door
// meldLottoSaldoStorting voor ALLE bedragen, groot of klein. Er
// bestaat geen apart "gewoon betalen"-pad meer; alles is een storting
// die direct verrekent met een openstaande week indien van
// toepassing. Zie docs/changelog.md voor de aanleiding.

export async function markeerTikkieGeopend(betalingId: string): Promise<void> {
  await updateDoc(doc(db, 'betalingen', betalingId), {
    tikkieGeopend: true,
  });
}

// bevestigBetaling is verwijderd (25 juli 2026) — er bestaat niets
// meer dat een 'verificatie'-status betaling aanmaakt (meldBetaling en
// meldLottoSaldoStorting zijn eerder al verwijderd), dus deze functie
// had geen enkel scenario meer waarin ze zinvol kon worden aangeroepen.
// Kashouder registreert stortingen voortaan altijd direct via
// stortLottoSaldo (hieronder), zonder tussenliggende verificatiestap.

/**
 * Na een bevestigde LottoSaldo-storting: kijkt of het lid nu genoeg
 * tegoed heeft om de huidige week automatisch te dekken.
 *
 * Twee situaties, allebei afgehandeld:
 * 1. Er bestaat al een 'open' betaaldocument voor deze week → dat
 *    wordt bevestigd (zoals voorheen).
 * 2. Er bestaat HELEMAAL GEEN document voor deze week (bijv. omdat
 *    het lid het wekelijkse-betalingen-aanmaken-moment heeft gemist —
 *    zelfde klasse probleem als eerder bij een ander lid geconstateerd)
 *    → er wordt direct een nieuw 'betaald'-document aangemaakt, mits
 *    het lid een ticket heeft. Zonder deze tweede check bleef saldo
 *    onaangeroerd staan terwijl het lid toch als "niet betaald"
 *    gesignaleerd bleef — precies zo geconstateerd bij Ing.
 *
 * Géén nieuwe kasmutatie in beide gevallen: dat geld zat al in de kas
 * sinds de storting zelf werd bevestigd.
 */
async function verrekenLottoSaldoMetOpenstaandeWeek(userId: string, userNaam: string, kashouder: ActieUser) {
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) return;
  const userData = userSnap.data();
  const lottoSaldo = (userData.lottoSaldo as number | undefined) ?? 0;
  const { standaardInleg, } = await haalVerenigingConfigOp();
  const omschrijvingDefault = STANDAARD_OMSCHRIJVING;
  if (lottoSaldo < standaardInleg) return;

  const week = huidigTrekkingWeek();
  const bestaandSnap = await getDocs(query(
    collection(db, 'betalingen'),
    where('userId', '==', userId),
    where('trekkingWeek', '==', week)
  ));

  // Al een 'betaald'-document voor deze week? Niets te doen.
  if (bestaandSnap.docs.some(d => d.data().status === 'betaald')) return;

  const openDoc = bestaandSnap.docs.find(d => d.data().status === 'open');

  if (openDoc) {
    await updateDoc(openDoc.ref, {
      status: 'betaald',
      bevestigd: serverTimestamp(),
      bevestigdDoor: 'systeem-lottosaldo',
    });
  } else {
    // Geen enkel document voor deze week — alleen relevant als het
    // lid daadwerkelijk een ticket heeft (anders speelt hij toch niet mee).
    const tickets = (userData.tickets as unknown[] | undefined) ?? [];
    if (tickets.length === 0) return;
    await addDoc(collection(db, 'betalingen'), {
      userId,
      userNaam,
      bedrag: standaardInleg,
      omschrijving: `${omschrijvingDefault} (automatisch via LottoSaldo)`,
      provider: 'offline',
      status: 'betaald',
      trekkingWeek: week,
      tikkieGeopend: false,
      aangemaakt: serverTimestamp(),
      bevestigd: serverTimestamp(),
      bevestigdDoor: 'systeem-lottosaldo',
    });
  }

  await updateDoc(doc(db, 'users', userId), {
    lottoSaldo: increment(-standaardInleg),
  });
  await logAudit(
    'betaling_bevestigd',
    `Automatisch verrekend: het LottoSaldo van ${userNaam} dekte de week ${week}${openDoc ? '' : ' (geen bestaand document — nieuw aangemaakt)'}`,
    kashouder,
    { doelUserId: userId }
  );
}

// meldLottoSaldoStorting is verwijderd (25 juli 2026) — leden
// vergaten de melding structureel, waardoor stortingen onopgemerkt
// bleven staan. De kashouder checkt nu zelf Tikkie en registreert
// direct via stortLottoSaldo; geen tussenstap met een lid-melding
// meer. Zie docs/changelog.md.

/** Markeert de eenmalige LottoSaldo-uitlegbanner als gezien — puur een
 *  UI-voorkeur, geen financieel risico, dus zelf-service voor het lid. */
export async function markeerLottoSaldoIntroGezien(userId: string) {
  await updateDoc(doc(db, 'users', userId), {
    lottoSaldoIntroSeen: true,
  });
}

// wijsBetalingAf is verwijderd (25 juli 2026) — zelfde reden als
// bevestigBetaling hierboven: geen enkele bron maakt nog een
// 'verificatie'-status betaling aan om af te wijzen.

/**
 * Beheerder markeert een reeds 'betaald'-betaling achteraf als
 * 'gecorrigeerd' — voor het geval de betaling zelf een fout bleek
 * (bijv. een dubbele boeking, of een betaling die feitelijk uit
 * LottoSaldo had moeten komen in plaats van een losse bevestiging).
 *
 * Het document blijft bestaan (traceerbaar in de geschiedenis), maar
 * telt vanaf nu nergens meer mee als "betaald" — niet in de
 * prijzenpot-berekening (lib/firestore-prijzenpot.ts), niet in
 * betaalstatus-checks op de dashboards. Het lid komt daardoor,
 * terecht, weer als "niet betaald" naar voren voor die week — dat is
 * gewenst gedrag, geen bug: als de betaling zelf ongeldig was, is de
 * deelname dat ook.
 *
 * Dit vervangt GEEN kascorrectie — corrigeer het geld apart via
 * Financieel → Kascorrectie. Deze functie corrigeert alleen de
 * betaalstatus-administratie.
 */
export async function markeerBetalingGecorrigeerd(
  betaling: Betaling,
  reden: string,
  beheerder: ActieUser
) {
  await updateDoc(doc(db, 'betalingen', betaling.id), {
    status: 'gecorrigeerd',
    gecorrigeerdReden: reden,
  });
  await logAudit(
    'betaling_gecorrigeerd',
    `${beheerder.naam} markeerde de betaling van ${betaling.userNaam} (€${betaling.bedrag.toFixed(2)}, ${betaling.trekkingWeek ?? 'geen week'}) als gecorrigeerd — reden: ${reden}`,
    beheerder,
    { doelUserId: betaling.userId }
  );
}

/**
 * Tegenhanger van markeerBetalingGecorrigeerd — maakt een eerdere
 * correctie ongedaan, zet de status terug naar 'betaald'. Voor als
 * een betaling per abuis als 'gecorrigeerd' werd gemarkeerd terwijl
 * de deelname zelf wél geldig was (bijv. omdat alleen het geld in de
 * kas dubbel geteld werd, niet de deelname aan die week — zie
 * docs/changelog.md voor het concrete incident waarvoor dit gebouwd is).
 */
export async function herstelBetalingGecorrigeerd(
  betaling: Betaling,
  beheerder: ActieUser
) {
  await updateDoc(doc(db, 'betalingen', betaling.id), {
    status: 'betaald',
    gecorrigeerdReden: null,
  });
  await logAudit(
    'betaling_gecorrigeerd',
    `${beheerder.naam} maakte de correctie van de betaling van ${betaling.userNaam} (€${betaling.bedrag.toFixed(2)}, ${betaling.trekkingWeek ?? 'geen week'}) ongedaan — status terug naar 'betaald'`,
    beheerder,
    { doelUserId: betaling.userId }
  );
}
// markeerBetaaldDoorKashouder is verwijderd (25 juli 2026) —
// vervangen door stortLottoSaldo voor ALLE bedragen. Er bestaat
// geen apart "markeer als betaald"-pad meer naast de storting-route;
// dat leidde herhaaldelijk tot dubbele/inconsistente boekingen
// doordat de twee routes elkaars saldo-verrekening niet kenden.
// Zie docs/changelog.md voor de aanleiding.

/**
 * Kashouder registreert een storting namens een lid, op basis van wat
 * ze zelf in Tikkie zien binnenkomen — elk bedrag, geen minimum. Een
 * eerdere versie eiste minimaal de standaard inleg, maar dat botste
 * met de realiteit: de kashouder registreert exact wat er binnenkwam
 * (bijv. €2), niet een kunstmatig afgerond bedrag. Een klein bedrag
 * telt gewoon mee in het saldo en wordt later, samen met een volgende
 * storting, alsnog gebruikt zodra het genoeg is voor een hele week.
 */
export async function stortLottoSaldo(
  lid: { id: string; naam: string },
  bedrag: number,
  kashouder: ActieUser
) {
  if (bedrag <= 0) {
    throw new Error('Bedrag moet groter dan €0 zijn.');
  }
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
  await verrekenLottoSaldoMetOpenstaandeWeek(lid.id, lid.naam, kashouder);
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

// Aangemaakt: LottoSaldo-correctietooltje
