// Standalone types voor gebruik in Cloud Functions
// Subset van lib/types.ts — geen Firestore Timestamp afhankelijkheid hier
// (admin SDK gebruikt eigen Timestamp type)

export type Rol = 'lid' | 'kashouder' | 'beheerder';

export interface Ticket {
  id: string;
  naam: string;
  nummers: number[];
}

export interface SpelConfig {
  naam: string;
  aantalGetallen: number;
  minGetal: number;
  maxGetal: number;
  bonusBal: boolean;
}

export type PrijsConfigModus =
  | 'hoogste_score_wint'
  | 'meerdere_winnaars'
  | 'vaste_prijzen';

export interface PrijsConfig {
  modus: PrijsConfigModus;
  vastePrijzen?: Record<number, number>;
  minimumScore?: number;
}

export interface Trekking {
  id: string;
  rondeId: string;
  seizoenId: string;
  nummers: number[];
  bonusBal: number | null;
  datum: FirebaseFirestore.Timestamp | null;
  ingevoerdDoor: string;
  ingevoerdDoorNaam: string;
  verwerkt: boolean;
}

export interface Resultaat {
  id?: string;
  userId: string;
  userNaam: string;
  ticketId: string;
  ticketNaam: string;
  rondeId: string;
  seizoenId: string;
  trekkingId: string;
  nummersGoed: number[];
  aantalGoed: number;
  bonusGoed: boolean;
  punten: number;
  isWinnaar: boolean;
  verwerktOp: FirebaseFirestore.Timestamp | null;
}

export interface NotificationSettings {
  trekkingResultaten: boolean;
  betalingBevestigd: boolean;
  herinneringen: boolean;
  winnaars: boolean;
  ranglijstUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  trekkingResultaten: true,
  betalingBevestigd: true,
  herinneringen: true,
  winnaars: true,
  ranglijstUpdates: false,
};
