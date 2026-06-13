import { User } from './types';

export const mockUser: User = {
  id: 'user-1',
  naam: 'Neeltje Visser',
  email: 'neeltje@lottoclub.nl',
  rol: 'lid',
  tickets: [
    { id: 'mock-a', naam: 'Formulier A', nummers: [6, 10, 15, 18, 19, 22, 31] },
    { id: 'mock-b', naam: 'Formulier B', nummers: [2, 4, 8, 17, 21, 33, 44] },
  ],
  lidSinds: null,
  ranglijstPunten: 48,
  actief: true,
};

export const mockLeden: User[] = [
  { id: 'user-1', naam: 'Neeltje Visser', email: 'neeltje@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: null, ranglijstPunten: 48, actief: true },
  { id: 'user-2', naam: 'Jenny Smit', email: 'jenny@lottoclub.nl', rol: 'kashouder', tickets: [], lidSinds: null, ranglijstPunten: 52, actief: true },
  { id: 'user-3', naam: 'Jan de Boer', email: 'jan@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: null, ranglijstPunten: 43, actief: true },
  { id: 'user-4', naam: 'Lisa van Dam', email: 'lisa@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: null, ranglijstPunten: 38, actief: true },
  { id: 'user-5', naam: 'Peter Janssen', email: 'peter@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: null, ranglijstPunten: 35, actief: true },
  { id: 'user-6', naam: 'Tim Hoekstra', email: 'tim@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: null, ranglijstPunten: 22, actief: true },
  { id: 'user-7', naam: 'Rob de Vries', email: 'rob@lottoclub.nl', rol: 'lid', tickets: [], lidSinds: null, ranglijstPunten: 18, actief: true },
];
