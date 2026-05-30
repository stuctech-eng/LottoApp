import { User, Seizoen, Ronde, Trekking, Kasmutatie } from './types';

export const mockUser: User = {
  id: 'user-1',
  naam: 'Neeltje Visser',
  email: 'neeltje@lottoclub.nl',
  rol: 'lid',
  tickets: [
    { naam: 'Formulier A', nummers: [6, 10, 15, 18, 19, 22, 31] },
    { naam: 'Formulier B', nummers: [2, 4, 8, 17, 21, 33, 44] },
  ],
  lidSinds: 'januari 2024',
  ranglijstPunten: 48,
  actief: true,
};

export const mockLeden: User[] = [
  { id: 'user-1', naam: 'Neeltje Visser', email: 'neeltje@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: 'jan 2024', ranglijstPunten: 48, actief: true },
  { id: 'user-2', naam: 'Jenny Smit', email: 'jenny@lottoclub.nl', rol: 'kashouder', tickets: [], lidSinds: 'jan 2024', ranglijstPunten: 52, actief: true },
  { id: 'user-3', naam: 'Jan de Boer', email: 'jan@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: 'feb 2024', ranglijstPunten: 43, actief: true },
  { id: 'user-4', naam: 'Lisa van Dam', email: 'lisa@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: 'mrt 2024', ranglijstPunten: 38, actief: true },
  { id: 'user-5', naam: 'Peter Janssen', email: 'peter@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: 'jan 2024', ranglijstPunten: 35, actief: true },
  { id: 'user-6', naam: 'Tim Hoekstra', email: 'tim@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: 'apr 2024', ranglijstPunten: 22, actief: true },
  { id: 'user-7', naam: 'Rob de Vries', email: 'rob@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: 'mei 2024', ranglijstPunten: 18, actief: true },
];

export const mockSeizoen: Seizoen = {
  id: 'seizoen-2026',
  naam: 'Seizoen 2026',
  startDatum: '2026-01-01',
  status: 'actief',
  totalePot: 1247,
};

export const mockRonde: Ronde = {
  id: 'ronde-22',
  seizoenId: 'seizoen-2026',
  nummer: 22,
  startDatum: '2026-05-24',
  sluitingsDatum: '2026-05-30',
  trekkingsDatum: '2026-05-31',
  status: 'open',
  inleg: 4,
  pot: 1247,
};

export const mockTrekkingen: Trekking[] = [
  {
    id: 'trekking-21',
    rondeId: 'ronde-21',
    datum: '2026-05-24',
    nummers: [6, 16, 19, 23, 24, 31],
    bonusBal: 12,
    winnaars: [{ userId: 'user-2', ticketNaam: 'Formulier A', aantalGoed: 4, uitbetaling: 25 }],
  },
  {
    id: 'trekking-20',
    rondeId: 'ronde-20',
    datum: '2026-05-17',
    nummers: [10, 12, 15, 27, 34, 40],
    bonusBal: 8,
    winnaars: [{ userId: 'user-1', ticketNaam: 'Formulier A', aantalGoed: 4, uitbetaling: 25 }],
  },
  {
    id: 'trekking-19',
    rondeId: 'ronde-19',
    datum: '2026-05-10',
    nummers: [3, 11, 22, 28, 31, 38],
    bonusBal: 5,
    winnaars: [{ userId: 'user-3', ticketNaam: 'Formulier A', aantalGoed: 3, uitbetaling: 25 }],
  },
];

export const mockKasmutaties: Kasmutatie[] = [
  { id: 'k1', datum: '2026-05-30', omschrijving: 'Inleg leden — ronde 22', bedrag: 56, type: 'inleg', rondeId: 'ronde-22' },
  { id: 'k2', datum: '2026-05-24', omschrijving: 'Uitbetaling winnaar — Jenny Smit', bedrag: -25, type: 'uitbetaling', rondeId: 'ronde-21' },
  { id: 'k3', datum: '2026-05-23', omschrijving: 'Inleg leden — ronde 21', bedrag: 68, type: 'inleg', rondeId: 'ronde-21' },
  { id: 'k4', datum: '2026-05-17', omschrijving: 'Uitbetaling winnaar — Neeltje Visser', bedrag: -25, type: 'uitbetaling', rondeId: 'ronde-20' },
  { id: 'k5', datum: '2026-05-16', omschrijving: 'Inleg leden — ronde 20', bedrag: 68, type: 'inleg', rondeId: 'ronde-20' },
  { id: 'k6', datum: '2026-04-26', omschrijving: 'Inleg leden — ronde 19', bedrag: 68, type: 'inleg', rondeId: 'ronde-19' },
  { id: 'k7', datum: '2026-04-20', omschrijving: 'Kascorrectie', bedrag: 4, type: 'correctie' },
  { id: 'k8', datum: '2026-04-19', omschrijving: 'Uitbetaling winnaar — Jan de Boer', bedrag: -25, type: 'uitbetaling', rondeId: 'ronde-18' },
];
