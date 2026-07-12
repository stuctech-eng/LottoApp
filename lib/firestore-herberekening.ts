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
