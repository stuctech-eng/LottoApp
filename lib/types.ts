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

export interface Betaling {
  id: string;
  userId: string;
  rondeId: string;
  bedrag: number;
  status: 'open' | 'betaald' | 'verificatie' | 'afgewezen';
  methode: 'ideal' | 'bewijs';
  datum?: string;
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
  datum: string;
  omschrijving: string;
  bedrag: number;
  type: 'inleg' | 'uitbetaling' | 'correctie';
  rondeId?: string;
  userId?: string;
}

export interface SpelConfig {
  id: string;
  naam: string;
  aantalGetallen: number;
  min: number;
  max: number;
  bonusBal: boolean;
}

export interface PrijsConfig {
  id: string;
  modus: 'vaste_prijzen' | 'percentage_pot' | 'winnaar_neemt_alles';
  vaste_prijzen: Record<number, number | string>;
}
