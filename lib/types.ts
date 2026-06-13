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

export interface Seizoen {
  id: string;
  naam: string;
  startDatum: string;
  eindDatum?: string;
  status: 'actief' | 'gesloten';
  totalePot: number;
}

export interface Ronde {
  id: string;
  seizoenId: string;
  nummer: number;
  startDatum: string;
  sluitingsDatum: string;
  trekkingsDatum: string;
  status: 'open' | 'gesloten' | 'getrokken';
  inleg: number;
  pot: number;
}

export interface Trekking {
  id: string;
  rondeId: string;
  datum: string;
  nummers: number[];
  bonusBal?: number;
  winnaars: Winnaar[];
}

export interface Winnaar {
  userId: string;
  ticketNaam: string;
  aantalGoed: number;
  uitbetaling: number;
}

export interface Kasmutatie {
  id: string;
  datum: Timestamp | null;
  omschrijving: string;
  /** positief = inkomsten, negatief = uitgaven */
  bedrag: number;
  type: 'inleg' | 'uitbetaling' | 'correctie';
  rondeId?: string;
  userId?: string;
  betalingId?: string;
  aangemaaktDoor?: string;
}

export interface SpelConfig {
  id: string;
  naam: string;
  aantalGetallen: number;
  min: number;
  max: number;
  bonusBal: boolean;
}

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
