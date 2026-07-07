import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Ticket, Rol } from './types';

export function normaliseerRol(raw: unknown): Rol {
  const waarde = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (waarde === 'kashouder' || waarde === 'beheerder') return waarde;
  return 'lid';
}

export function subscribeAllUsers(
  callback: (users: User[]) => void,
  onError?: (err: Error) => void
) {
  // Geen orderBy — voorkomt index-problemen die lege array teruggeven
  const q = query(collection(db, 'users'));
  return onSnapshot(
    q,
    (snap) => {
      const users: User[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          naam: data.naam ?? '',
          email: data.email ?? '',
          telefoon: data.telefoon,
          foto: data.foto ?? null,
          rol: normaliseerRol(data.rol),
          tickets: data.tickets ?? [],
          lidSinds: data.lidSinds ?? null,
          ranglijstPunten: data.ranglijstPunten ?? 0,
          actief: data.actief ?? true,
        };
      });
      // Sorteer client-side op naam
      users.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
      callback(users);
    },
    (err) => onError?.(err)
  );
}

export async function updateUserTickets(uid: string, tickets: Ticket[]) {
  await updateDoc(doc(db, 'users', uid), { tickets });
}

export async function updateUserTelefoon(uid: string, telefoon: string) {
  await updateDoc(doc(db, 'users', uid), { telefoon });
}

export async function updateUserRol(uid: string, rol: import('./types').Rol) {
  await updateDoc(doc(db, 'users', uid), { rol });
}

export function formatLidSinds(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  const date = ts.toDate();
  return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}

export function nieuwTicketId(): string {
  return `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
