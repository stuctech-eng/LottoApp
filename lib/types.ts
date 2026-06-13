import type { Timestamp } from 'firebase/firestore';

export type Rol = 'lid' | 'kashouder' | 'beheerder';

export interface User {
  id: string;
  naam: string;
  email: string;
  telefoon?: string;
  foto?: string | null;
  rol: Rol;
  tickets: Ticket[];
  lidSinds: Timestamp | null;
  ranglijstPunten: number;
  actief: boolean;
}

export interface Ticket {
  id: string;
  naam: string;
  nummers: number[];
}

// ─────────────────────── SpelConfig ───────────────────────

export interface SpelConfig {
  naam: string;
  aantalGetallen: number;
  minGetal: number;
  maxGetal: number;
  bonusBal: boolean;
}

// ─────────────────────── PrijsConfig ───────────────────────

export type PrijsConfigModus =
  | 'hoogste_score_wint'   // hoogste score = 1 winnaar (of meerdere bij gelijkspel)
  | 'meerdere_winnaars'    // iedereen met score >= drempel wint
  | 'vaste_prijzen';       // vaste uitbetaling per score (bijv. 5 goed = €25)

export interface PrijsConfig {
  modus: PrijsConfigModus;
  /** Alleen bij modus='vaste_prijzen': score -> uitbetaling in euro */
  vastePrijzen?: Record<number, number>;
  /** Alleen bij modus='meerdere_winnaars': minimale score om te winnen */
  minimumScore?: number;
}

// ─────────────────────── Seizoen / Ronde ───────────────────────

export interface Seizoen {
  id: string;
  naam: string;
  startDatum: Timestamp | null;
  eindDatum?: Timestamp | null;
  status: 'actief' | 'gesloten';
}

export interface Ronde {
  id: string;
  seizoenId: string;
  nummer: number;
  sluitingsDatum: Timestamp | null;
  trekkingsDatum: Timestamp | null;
  status: 'open' | 'gesloten' | 'verwerkt';
  inleg: number;
}

// ─────────────────────── Trekking ───────────────────────

export interface Trekking {
  id: string;
  rondeId: string;
  seizoenId: string;
  nummers: number[];
  bonusBal: number | null;
  datum: Timestamp | null;
  ingevoerdDoor: string;   // userId
  ingevoerdDoorNaam: string;
  verwerkt: boolean;
}

// ─────────────────────── Resultaat ───────────────────────

/**
 * Opgeslagen resultaat per ticket per ronde.
 * Geschreven door de controle-engine na verwerking van een trekking.
 */
export interface Resultaat {
  id: string;
  userId: string;
  userNaam: string;
  ticketId: string;
  ticketNaam: string;
  rondeId: string;
  seizoenId: string;
  trekkingId: string;
  nummersGoed: number[];   // welke nummers klopten
  aantalGoed: number;
  bonusGoed: boolean;
  punten: number;
  isWinnaar: boolean;
  verwerktOp: Timestamp | null;
}

// ─────────────────────── Kasmutatie ───────────────────────

export interface Kasmutatie {
  id: string;
  datum: Timestamp | null;
  omschrijving: string;
  bedrag: number;
  type: 'inleg' | 'uitbetaling' | 'correctie';
  rondeId?: string;
  userId?: string;
  betalingId?: string;
  aangemaaktDoor?: string;
}

// ─────────────────────── Betalingen ───────────────────────

export type PaymentProviderId = 'offline' | 'mollie' | 'tikkie' | 'stripe' | 'incasso';

export interface PaymentConfig {
  activeProvider: PaymentProviderId;
  providers: Record<PaymentProviderId, { enabled: boolean }>;
}

export type BetalingStatus = 'open' | 'verificatie' | 'betaald' | 'afgewezen';

export interface Betaling {
  id: string;
  userId: string;
  userNaam: string;
  bedrag: number;
  omschrijving: string;
  provider: PaymentProviderId;
  status: BetalingStatus;
  aangemaakt: Timestamp | null;
  bevestigd?: Timestamp | null;
  bevestigdDoor?: string | null;
  rondeId?: string;
}

// ─────────────────────── Audit ───────────────────────

export type AuditAction =
  | 'gebruiker_aangemaakt'
  | 'gebruiker_verwijderd'
  | 'ticket_toegevoegd'
  | 'ticket_gewijzigd'
  | 'ticket_verwijderd'
  | 'rol_gewijzigd'
  | 'betaling_gemeld'
  | 'betaling_bevestigd'
  | 'betaling_afgewezen'
  | 'uitbetaling_geregistreerd'
  | 'kascorrectie'
  | 'trekking_ingevoerd'
  | 'trekking_gewijzigd'
  | 'seizoen_gestart'
  | 'seizoen_gesloten';

export interface AuditLogEntry {
  id: string;
  actie: AuditAction;
  omschrijving: string;
  userId: string;
  userNaam: string;
  doelUserId?: string;
  datum: Timestamp | null;
}
