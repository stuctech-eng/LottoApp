/**
 * CONTROLE-ENGINE — LottoClub
 *
 * ARCHITECTUURREGEL:
 * Deze module is een pure functie. Geen Firestore, geen React,
 * geen Next.js, geen UI-afhankelijkheden. Alleen input → output.
 *
 * Later kan exact dezelfde engine zonder herschrijving draaien in:
 * - Firebase Cloud Functions (server-side trigger op /trekkingen)
 * - Next.js API route
 * - Node.js script
 * - Unit tests
 */

import { SpelConfig, PrijsConfig, Ticket, Resultaat, Trekking } from './types';

// ─────────────────────── Input types ───────────────────────

export interface LidTickets {
  userId: string;
  userNaam: string;
  tickets: Ticket[];
}

export interface ControleInput {
  trekking: Trekking;
  deelnemers: LidTickets[];
  spelConfig: SpelConfig;
  prijsConfig: PrijsConfig;
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
 * Berekent hoeveel nummers van een ticket overeenkomen
 * met de getrokken nummers.
 */
function berekenScore(
  ticketNummers: number[],
  getrokken: number[],
  bonusBal: number | null,
  spelConfig: SpelConfig
): { nummersGoed: number[]; aantalGoed: number; bonusGoed: boolean } {
  const getrokkenSet = new Set(getrokken);
  const nummersGoed = ticketNummers.filter(n => getrokkenSet.has(n));
  const bonusGoed = spelConfig.bonusBal && bonusBal !== null
    ? ticketNummers.includes(bonusBal)
    : false;

  return {
    nummersGoed,
    aantalGoed: nummersGoed.length,
    bonusGoed,
  };
}

/**
 * Berekent de punten voor een score.
 * Formule: aantalGoed * 10, bonus geeft +5 extra.
 * Later vervangbaar door een configureerbare puntentabel.
 */
function berekenPunten(aantalGoed: number, bonusGoed: boolean): number {
  return aantalGoed * 10 + (bonusGoed ? 5 : 0);
}

// ─────────────────────── Winnaar bepaling ───────────────────────

function bepaalWinnaars(
  scores: { userId: string; userNaam: string; ticketId: string; ticketNaam: string; aantalGoed: number; bonusGoed: boolean; punten: number }[],
  prijsConfig: PrijsConfig
): { userId: string; userNaam: string; ticketNaam: string; aantalGoed: number; punten: number }[] {
  if (scores.length === 0) return [];

  switch (prijsConfig.modus) {
    case 'hoogste_score_wint': {
      const maxPunten = Math.max(...scores.map(s => s.punten));
      if (maxPunten === 0) return [];
      return scores
        .filter(s => s.punten === maxPunten)
        .map(s => ({ userId: s.userId, userNaam: s.userNaam, ticketNaam: s.ticketNaam, aantalGoed: s.aantalGoed, punten: s.punten }));
    }

    case 'meerdere_winnaars': {
      const min = prijsConfig.minimumScore ?? 3;
      return scores
        .filter(s => s.aantalGoed >= min)
        .map(s => ({ userId: s.userId, userNaam: s.userNaam, ticketNaam: s.ticketNaam, aantalGoed: s.aantalGoed, punten: s.punten }));
    }

    case 'vaste_prijzen': {
      // Iedereen met een vaste prijs voor hun score wint
      const prijzen = prijsConfig.vastePrijzen ?? {};
      return scores
        .filter(s => s.aantalGoed in prijzen && (prijzen[s.aantalGoed] ?? 0) > 0)
        .map(s => ({ userId: s.userId, userNaam: s.userNaam, ticketNaam: s.ticketNaam, aantalGoed: s.aantalGoed, punten: s.punten }));
    }

    default:
      return [];
  }
}

// ─────────────────────── Hoofd-engine ───────────────────────

/**
 * De centrale controle-engine.
 *
 * Input:  trekking + alle deelnemers met tickets + spelConfig + prijsConfig
 * Output: resultaten (per ticket), winnaars, ranglijstUpdates
 *
 * Schrijft NIETS naar Firestore — dat doet de aanroepende laag
 * (client-side service of later Cloud Function).
 */
export function verwerkTrekking(input: ControleInput): ControleOutput {
  const { trekking, deelnemers, spelConfig, prijsConfig } = input;

  const alleScores: {
    userId: string;
    userNaam: string;
    ticketId: string;
    ticketNaam: string;
    aantalGoed: number;
    bonusGoed: boolean;
    punten: number;
    nummersGoed: number[];
  }[] = [];

  const resultaten: ControleOutput['resultaten'] = [];

  for (const deelnemer of deelnemers) {
    for (const ticket of deelnemer.tickets) {
      const { nummersGoed, aantalGoed, bonusGoed } = berekenScore(
        ticket.nummers,
        trekking.nummers,
        trekking.bonusBal,
        spelConfig
      );
      const punten = berekenPunten(aantalGoed, bonusGoed);

      alleScores.push({
        userId: deelnemer.userId,
        userNaam: deelnemer.userNaam,
        ticketId: ticket.id,
        ticketNaam: ticket.naam,
        aantalGoed,
        bonusGoed,
        punten,
        nummersGoed,
      });

      resultaten.push({
        userId: deelnemer.userId,
        userNaam: deelnemer.userNaam,
        ticketId: ticket.id,
        ticketNaam: ticket.naam,
        rondeId: trekking.rondeId,
        seizoenId: trekking.seizoenId,
        trekkingId: trekking.id,
        nummersGoed,
        aantalGoed,
        bonusGoed,
        punten,
        isWinnaar: false, // wordt hieronder ingevuld
      });
    }
  }

  const winnaars = bepaalWinnaars(alleScores, prijsConfig);
  const winnaarKeys = new Set(winnaars.map(w => `${w.userId}-${w.ticketNaam}`));

  // Markeer winnaars in resultaten
  for (const r of resultaten) {
    if (winnaarKeys.has(`${r.userId}-${r.ticketNaam}`)) {
      r.isWinnaar = true;
    }
  }

  // Ranglijst updates: extra punten per userId (beste ticket telt)
  const puntPerUser: Record<string, number> = {};
  for (const s of alleScores) {
    if (!puntPerUser[s.userId] || s.punten > puntPerUser[s.userId]) {
      puntPerUser[s.userId] = s.punten;
    }
  }
  const ranglijstUpdates: RanglijstUpdate[] = Object.entries(puntPerUser).map(([userId, extraPunten]) => ({
    userId,
    extraPunten,
  }));

  return { resultaten, winnaars, ranglijstUpdates };
}
