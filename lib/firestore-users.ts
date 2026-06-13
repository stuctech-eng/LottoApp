import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Ticket } from './types';

/**
 * Live-luisteren naar alle gebruikers, gesorteerd op naam.
 * Geeft een unsubscribe-functie terug.
 */
export function subscribeAllUsers(
  callback: (users: User[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'users'), orderBy('naam'));
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
          rol: data.rol ?? 'lid',
          tickets: data.tickets ?? [],
          lidSinds: data.lidSinds ?? null,
          ranglijstPunten: data.ranglijstPunten ?? 0,
          actief: data.actief ?? true,
        };
      });
      callback(users);
    },
    (err) => onError?.(err)
  );
}

/** Vervangt de volledige tickets-array van een gebruiker. */
export async function updateUserTickets(uid: string, tickets: Ticket[]) {
  await updateDoc(doc(db, 'users', uid), { tickets });
}

/** Formatteer een Firestore Timestamp naar "januari 2026". */
export function formatLidSinds(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  const date = ts.toDate();
  return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}

/** Genereer een nieuw uniek ticket-id. */
export function nieuwTicketId(): string {
  return `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
