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

export const STANDAARD_INLEG = 4;
export const STANDAARD_OMSCHRIJVING = 'Inleg LottoClub';
