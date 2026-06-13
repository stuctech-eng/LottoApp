/**
 * Ticket configuratie — LottoClub
 *
 * ONBEVESTIGD / AANNAME: gebaseerd op de bestaande mock-tickets
 * (7 unieke nummers, range 1-45). De admin-pagina toont een
 * "spelConfig" formulier (6 getallen + bonusbal), maar dat is nog
 * niet aan Firestore gekoppeld.
 *
 * Zodra Fase 4 (spelConfig in Firestore) gebouwd wordt, moet deze
 * constante vervangen worden door een live query op /spelConfig.
 */
export const TICKET_CONFIG = {
  aantalNummers: 7,
  min: 1,
  max: 45,
} as const;

/**
 * Standaard inleg per betaling.
 *
 * ONBEVESTIGD / AANNAME: er bestaat nog geen "ronde"-concept (Fase 4),
 * dus betalingen zijn nog niet aan een specifieke ronde gekoppeld.
 * Zodra Fase 4 rondes met een eigen `inleg`-bedrag introduceert,
 * vervangt `ronde.inleg` deze constante.
 */
export const STANDAARD_INLEG = 4;
export const STANDAARD_OMSCHRIJVING = 'Inleg LottoClub';

export function valideerTicketNummers(nummers: number[]): string | null {
  const { aantalNummers, min, max } = TICKET_CONFIG;

  if (nummers.length !== aantalNummers) {
    return `Vul precies ${aantalNummers} nummers in`;
  }
  if (nummers.some(n => !Number.isInteger(n) || n < min || n > max)) {
    return `Alle nummers moeten tussen ${min} en ${max} liggen`;
  }
  if (new Set(nummers).size !== nummers.length) {
    return 'Nummers moeten uniek zijn';
  }
  return null;
}
