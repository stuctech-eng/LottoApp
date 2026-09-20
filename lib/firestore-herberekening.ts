import { httpsCallable } from 'firebase/functions';
import { functionsInstance } from './firebase';

interface HerberekenSpeelreeksResult {
  herberekend: number;
  bericht?: string;
  winnaars?: string[];
}

/**
 * Roept de Cloud Function herberekenSpeelreeks aan: verwijdert de
 * resultaten van de HUIDIGE speelreeks en berekent ze opnieuw,
 * chronologisch, met de cumulatieve clubmodus-logica. Oudere, al
 * afgesloten speelreeksen blijven ongewijzigd. Alleen beheerders
 * mogen dit aanroepen (wordt ook server-side afgedwongen).
 */
export async function herberekenHuidigeSpeelreeks(seizoenId: string): Promise<HerberekenSpeelreeksResult> {
  const fn = httpsCallable<{ seizoenId: string }, HerberekenSpeelreeksResult>(functionsInstance, 'herberekenSpeelreeks');
  const result = await fn({ seizoenId });
  return result.data;
}

interface VulHistorischPrijsBedragInResult {
  bijgewerkt: number;
  details: { userNaam: string; trekkingId: string; prijsBedrag: number }[];
}

/**
 * Roept de Cloud Function vulHistorischPrijsBedragIn aan: vult
 * prijsBedrag in op winnaar-resultaten van vóór het bestaan van dat
 * veld. Eenmalige backfill — veilig om vaker aan te roepen, raakt
 * alleen resultaten waar het bedrag nog ontbreekt. Alleen beheerders
 * mogen dit aanroepen (wordt ook server-side afgedwongen).
 */
/**
 * forceer: true berekent OOK winnaars met een al ingevuld prijsBedrag
 * opnieuw — nodig als brondata achteraf gecorrigeerd is (bijv. een
 * betaling die alsnog als 'gecorrigeerd' gemarkeerd werd).
 */
export async function vulHistorischPrijsBedragIn(forceer = false): Promise<VulHistorischPrijsBedragInResult> {
  const fn = httpsCallable<{ forceer?: boolean }, VulHistorischPrijsBedragInResult>(functionsInstance, 'vulHistorischPrijsBedragIn');
  const result = await fn({ forceer });
  return result.data;
}

interface PrijzenpotDetailsItem {
  userNaam: string;
  trekkingWeek: string;
  bedrag: number;
  docId: string;
}

interface PrijzenpotDetailsResult {
  trekkingId: string;
  trekkingWeek: string;
  vanafWeek: string | null;
  aantalWinnaars: number;
  totaal: number;
  items: PrijzenpotDetailsItem[];
}

/**
 * Roept de Cloud Function bekijkPrijzenpotDetails aan: alleen-lezen
 * diagnose — laat exact zien welke bevestigde betalingen meetelden in
 * de prijzenpot-berekening van een winnende trekking (zonder
 * trekkingId: de meest recente winnaar). Schrijft niets. Alleen
 * beheerders mogen dit aanroepen (wordt ook server-side afgedwongen).
 */
export async function bekijkPrijzenpotDetails(trekkingId?: string): Promise<PrijzenpotDetailsResult> {
  const fn = httpsCallable<{ trekkingId?: string }, PrijzenpotDetailsResult>(functionsInstance, 'bekijkPrijzenpotDetails');
  const result = await fn({ trekkingId });
  return result.data;
}
