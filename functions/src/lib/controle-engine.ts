/**
 * CONTROLE-ENGINE — LottoClub
 *
 * ARCHITECTUURREGEL:
 * Deze module is een pure functie. Geen Firestore, geen React,
 * geen Next.js, geen UI-afhankelijkheden. Alleen input → output.
 *
 * SPELREGEL (enige, vaste spelmodus — "clubmodus"):
 * Iedere trekking worden de getrokken nummers vergeleken met elk ticket.
 * Elk nummer dat een speler goed heeft, wordt permanent bijgeschreven
 * voor dat ticket binnen de huidige speelreeks — een nummer telt maar
 * één keer mee, ook als het in een latere trekking nogmaals valt.
 * Zodra een ticket 6 unieke goede nummers heeft verzameld, is dat
 * ticket winnaar. Er kunnen meerdere winnaars zijn. Na een trekking met
 * winnaar(s) sluit de speelreeks automatisch en begint een nieuwe
 * (dat "sluiten" gebeurt impliciet: de aanroepende laag geeft vanaf de
 * eerstvolgende trekking weer een lege vorigeMatches mee).
 *
 * Er is bewust geen ondersteuning voor andere spelmodi (hoogste score,
 * vaste prijzen, etc.) — LottoClub gebruikt altijd deze ene spelregel.
 *
 * Later kan exact dezelfde engine zonder herschrijving draaien in:
 * - Firebase Cloud Functions (server-side trigger op /trekkingen)
 * - Next.js API route
 * - Node.js script
 * - Unit tests
 */

import { SpelConfig, Ticket, Resultaat, Trekking } from './types';

// ─────────────────────── Input types ───────────────────────

/** Eén ticket met de cumulatieve matches van vóór deze trekking (leeg = nieuwe speelreeks). */
export interface TicketVoortgang {
  ticket: Ticket;
  vorigeMatches: number[];
}

export interface LidTickets {
  userId: string;
  userNaam: string;
  tickets: TicketVoortgang[];
}

export interface ControleInput {
  trekking: Trekking;
  deelnemers: LidTickets[];
  spelConfig: SpelConfig;
}

// ─────────────────────── Output types ───────────────────────

export interface RanglijstUpdate {
  userId: string;
  extraPunten: number;
}

export interface ControleOutput {
  resultaten: Omit<Resultaat, 'id' | 'verwerktOp'>[];
  winnaars: { userId: string; userNaam: string; ticketNaam: string; aantalGoed: number; punten: number }[];
  ranglijstUpdates: RanglijstUpdate[];
}

// ─────────────────────── Score berekening ───────────────────────

/**
 * Berekent de nieuwe matches van déze trekking (nog niet eerder geraakt
 * binnen de speelreeks) en de bijgewerkte cumulatieve verzameling.
 * Een nummer dat al eerder is geraakt levert geen nieuw punt op, ook
 * als het deze week weer valt.
 */
function berekenMatches(
  ticketNummers: number[],
  getrokken: number[],
  vorigeMatches: number[]
): { nieuweMatches: number[]; matchedNumbers: number[] } {
  const getrokkenSet = new Set(getrokken);
  const vorigeSet = new Set(vorigeMatches);
  const nieuweMatches = ticketNummers.filter(n => getrokkenSet.has(n) && !vorigeSet.has(n));
  return {
    nieuweMatches,
    matchedNumbers: [...vorigeMatches, ...nieuweMatches],
  };
}

function berekenBonusGoed(ticketNummers: number[], bonusBal: number | null, spelConfig: SpelConfig): boolean {
  return spelConfig.bonusBal && bonusBal !== null ? ticketNummers.includes(bonusBal) : false;
}

/**
 * Punten voor déze trekking — gebaseerd op alleen de NIEUWE matches,
 * nooit op het cumulatieve totaal. Dit is bewust zo: ranglijstPunten
 * wordt met FieldValue.increment() opgeteld per trekking, dus als hier
 * het cumulatieve aantal zou worden gebruikt, tellen oude matches bij
 * elke volgende trekking opnieuw mee.
 */
function berekenPunten(aantalNieuweMatches: number, bonusGoed: boolean): number {
  return aantalNieuweMatches * 10 + (bonusGoed ? 5 : 0);
}

// ─────────────────────── Hoofd-engine ───────────────────────

/**
 * De centrale controle-engine.
 *
 * Input:  trekking + alle deelnemers met tickets (elk met hun cumulatieve
 *         matches van vóór deze trekking) + spelConfig
 * Output: resultaten (per ticket), winnaars, ranglijstUpdates
 *
 * Schrijft NIETS naar Firestore — dat doet de aanroepende laag
 * (client-side service of Cloud Function), die ook verantwoordelijk is
 * voor het bepalen van de speelreeks-grens (alles na de laatste
 * trekking met winnaar, of vanaf het begin als nog nooit gewonnen).
 */
export function verwerkTrekking(input: ControleInput): ControleOutput {
  const { trekking, deelnemers, spelConfig } = input;

  const resultaten: ControleOutput['resultaten'] = [];
  const winnaars: ControleOutput['winnaars'] = [];
  const puntPerUser: Record<string, number> = {};

  for (const deelnemer of deelnemers) {
    for (const { ticket, vorigeMatches } of deelnemer.tickets) {
      const { nieuweMatches, matchedNumbers } = berekenMatches(ticket.nummers, trekking.nummers, vorigeMatches);
      const bonusGoed = berekenBonusGoed(ticket.nummers, trekking.bonusBal, spelConfig);
      const aantalGoed = matchedNumbers.length; // cumulatief binnen de speelreeks
      const punten = berekenPunten(nieuweMatches.length, bonusGoed); // alleen nieuw deze trekking
      const isWinnaar = aantalGoed >= spelConfig.aantalGetallen;

      resultaten.push({
        userId: deelnemer.userId,
        userNaam: deelnemer.userNaam,
        ticketId: ticket.id,
        ticketNaam: ticket.naam,
        rondeId: trekking.rondeId,
        seizoenId: trekking.seizoenId,
        trekkingId: trekking.id,
        nummersGoed: nieuweMatches,
        matchedNumbers,
        aantalGoed,
        bonusGoed,
        punten,
        isWinnaar,
      });

      if (isWinnaar) {
        winnaars.push({ userId: deelnemer.userId, userNaam: deelnemer.userNaam, ticketNaam: ticket.naam, aantalGoed, punten });
      }

      // Beste ticket per user telt voor de ranglijst-punten van deze trekking
      if (!(deelnemer.userId in puntPerUser) || punten > puntPerUser[deelnemer.userId]) {
        puntPerUser[deelnemer.userId] = punten;
      }
    }
  }

  const ranglijstUpdates: RanglijstUpdate[] = Object.entries(puntPerUser).map(([userId, extraPunten]) => ({
    userId,
    extraPunten,
  }));

  return { resultaten, winnaars, ranglijstUpdates };
}
