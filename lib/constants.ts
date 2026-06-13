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
