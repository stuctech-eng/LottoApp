/**
 * App-brede constanten.
 *
 * SpelConfig (aantal nummers, min/max, bonusbal) wordt vanaf Fase 4
 * live uit Firestore geladen via lib/firestore-spelconfig.ts.
 * TICKET_CONFIG hieronder is alleen nog nodig als fallback voor de
 * TicketEditorModal wanneer Firestore nog niet geladen is.
 */
export const TICKET_CONFIG = {
  aantalNummers: 6,
  min: 1,
  max: 45,
} as const;

export function valideerTicketNummers(
  nummers: number[],
  config = TICKET_CONFIG
): string | null {
  const { aantalNummers, min, max } = config;
  if (nummers.length !== aantalNummers) return `Vul precies ${aantalNummers} nummers in`;
  if (nummers.some(n => !Number.isInteger(n) || n < min || n > max)) return `Alle nummers moeten tussen ${min} en ${max} liggen`;
  if (new Set(nummers).size !== nummers.length) return 'Nummers moeten uniek zijn';
  return null;
}

/**
 * Kale dag-check voor het sluitingsmoment van ticket wijzigen —
 * vrijdag 24:00 (= zaterdag 00:00), heropent maandag. Dit is maar de
 * HELFT van de regel: wijzigen mag namelijk sowieso alleen in de
 * EERSTE week van een speelreeks (tot de eerste trekking daarvan) —
 * ná die eerste trekking staat wijzigen de rest van de hele
 * speelreeks vast, ongeacht de dag. Die tweede voorwaarde vereist
 * trekking-/resultaatdata en kan dus niet hier (puur, geen Firestore)
 * bepaald worden — zie de combinatie in app/profiel/page.tsx.
 *
 * Geldt UITSLUITEND voor het wijzigen van bestaande nummers. Een
 * eerste ticket aanmaken (nog geen nummers gekozen) blijft altijd
 * mogelijk — dat is geen "wijziging" en benadeelt niemand, want zo'n
 * lid heeft nog geen opgebouwde voortgang om mee te knoeien.
 */
export function magTicketWijzigenOpDezeDag(): boolean {
  const dag = new Date().getDay(); // 0 = zondag, 6 = zaterdag
  return dag >= 1 && dag <= 5; // maandag t/m vrijdag
}

export const STANDAARD_INLEG = 4;
export const STANDAARD_OMSCHRIJVING = 'Inleg LottoClub';
