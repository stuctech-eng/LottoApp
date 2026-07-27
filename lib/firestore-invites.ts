import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsInstance } from './firebase';
import { logAudit } from './firestore-audit';

interface ActieUser {
  uid: string;
  naam: string;
}

export interface Uitnodiging {
  token: string;
  aangemaaktDoor: string;
  aangemaaktDoorNaam: string;
  aangemaaktOp: Timestamp | null;
  vervalOp: Timestamp | null;
  gebruikt: boolean;
  gebruiktOp: Timestamp | null;
  gebruiktDoorUid: string | null;
  gebruiktDoorNaam: string | null;
}

const GELDIGHEID_DAGEN = 7;

/** Genereert een korte, URL-veilige, willekeurige token. Geen externe
 *  library nodig — crypto.getRandomValues is overal beschikbaar
 *  (browser + moderne Node) en voldoende willekeurig voor dit doel. */
function genereerToken(): string {
  const alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // geen verwarrende tekens (0/O, 1/l/I)
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => alfabet[b % alfabet.length]).join('');
}

/**
 * Kashouder/beheerder maakt een nieuwe uitnodiging aan. Puur
 * metadata aanmaken (geen gevoelige actie), dus gewoon een directe
 * Firestore-write zoals de rest van de app — het daadwerkelijk
 * VERZILVEREN van een token gebeurt wel via een Cloud Function
 * (zie verzilverUitnodiging hieronder), want dat raakt twee
 * documenten tegelijk en moet nooit twee keer kunnen slagen.
 */
export async function maakUitnodiging(aangemaaktDoor: ActieUser): Promise<string> {
  const token = genereerToken();
  const vervalOp = new Date();
  vervalOp.setDate(vervalOp.getDate() + GELDIGHEID_DAGEN);

  await setDoc(doc(db, 'invites', token), {
    token,
    aangemaaktDoor: aangemaaktDoor.uid,
    aangemaaktDoorNaam: aangemaaktDoor.naam,
    aangemaaktOp: serverTimestamp(),
    vervalOp: Timestamp.fromDate(vervalOp),
    gebruikt: false,
    gebruiktOp: null,
    gebruiktDoorUid: null,
    gebruiktDoorNaam: null,
  });

  await logAudit(
    'uitnodiging_aangemaakt',
    `${aangemaaktDoor.naam} maakte een nieuwe ledenuitnodiging aan (geldig tot ${vervalOp.toLocaleDateString('nl-NL')})`,
    aangemaaktDoor
  );

  return token;
}

/**
 * Eenmalige, publiek toegankelijke lezing van een uitnodiging — nodig
 * zodat de uitnodigingspagina (nog vóórdat iemand is ingelogd) kan
 * tonen of de link nog geldig lijkt. Dit is puur voor UX; de
 * daadwerkelijke, doorslaggevende validatie gebeurt altijd opnieuw,
 * server-side, in de Cloud Function bij het verzilveren.
 */
export async function haalUitnodigingOp(token: string): Promise<Uitnodiging | null> {
  const snap = await getDoc(doc(db, 'invites', token));
  if (!snap.exists()) return null;
  return snap.data() as Uitnodiging;
}

export function isUitnodigingGeldig(uitnodiging: Uitnodiging): boolean {
  if (uitnodiging.gebruikt) return false;
  if (!uitnodiging.vervalOp) return false;
  return uitnodiging.vervalOp.toDate() > new Date();
}

interface VerzilverResultaat {
  succes: boolean;
  foutmelding?: string;
}

/**
 * Verzilvert een uitnodiging NA succesvol inloggen — roept de Cloud
 * Function aan die in één transactie: het token valideert, het
 * Firestore user-document aanmaakt, en de uitnodiging als gebruikt
 * markeert. Nooit client-side afgehandeld: dit moet altijd
 * server-side, atomisch gebeuren zodat een token nooit twee keer
 * gebruikt kan worden.
 */
export async function verzilverUitnodiging(token: string, naam?: string): Promise<VerzilverResultaat> {
  try {
    const fn = httpsCallable<{ token: string; naam?: string }, { succes: boolean }>(functionsInstance, 'verzilverUitnodiging');
    const result = await fn({ token, naam });
    return { succes: result.data.succes };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Onbekende fout bij het verzilveren van de uitnodiging.';
    return { succes: false, foutmelding: message };
  }
}
