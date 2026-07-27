import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Ticket, Rol } from './types';
import { logAudit } from './firestore-audit';

export function normaliseerRol(raw: unknown): Rol {
  const waarde = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (waarde === 'kashouder' || waarde === 'beheerder') return waarde;
  return 'lid';
}

export function subscribeAllUsers(
  callback: (users: User[]) => void,
  onError?: (err: Error) => void
) {
  // Geen orderBy — voorkomt index-problemen die silent lege array teruggeven
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
          lottoSaldo: data.lottoSaldo ?? 0,
          lottoSaldoIntroSeen: data.lottoSaldoIntroSeen ?? false,
          onboardingCompleted: data.onboardingCompleted,
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

/**
 * "Verwijderen" is bewust een soft-delete: het account en alle
 * historische data (betalingen, trekkingen, resultaten, auditlog)
 * blijven volledig bestaan — alleen actief wordt false. Overal in de
 * app waar al gefilterd wordt op actieve leden (betaalvoortgang,
 * Openstaand-lijst, prijzenpot-relevante berekeningen) verdwijnt dit
 * lid daardoor vanzelf uit het dagelijkse zicht, zonder ooit data te
 * verliezen. Alleen de beheerder mag dit — de rol-check gebeurt op de
 * aanroepende pagina, niet hier (net als bij de andere functies in
 * dit bestand).
 */
export async function verwijderLid(
  lid: { id: string; naam: string },
  beheerder: { uid: string; naam: string }
) {
  await updateDoc(doc(db, 'users', lid.id), { actief: false });
  await logAudit(
    'lid_verwijderd',
    `${beheerder.naam} verwijderde ${lid.naam} uit de club — account en historie blijven bewaard`,
    beheerder,
    { doelUserId: lid.id }
  );
}

/**
 * Tegenhanger van verwijderLid — zet een eerder verwijderd lid direct
 * weer actief. Vervangt bewust de "nieuwe uitnodiging"-route uit het
 * oorspronkelijke ontwerp: omdat het profiel van een verwijderd lid
 * blijft bestaan, zou een nieuwe uitnodiging altijd worden geweigerd
 * door verzilverUitnodiging (die expliciet weigert als er al een
 * profiel bestaat) — heractiveren is dus de enige werkende weg terug.
 */
export async function heractiveerLid(
  lid: { id: string; naam: string },
  beheerder: { uid: string; naam: string }
) {
  await updateDoc(doc(db, 'users', lid.id), { actief: true });
  await logAudit(
    'lid_heractiveerd',
    `${beheerder.naam} heractiveerde ${lid.naam}`,
    beheerder,
    { doelUserId: lid.id }
  );
}

/**
 * ECHTE verwijdering — anders dan verwijderLid (soft-delete via
 * actief:false), haalt dit het Firestore /users/{uid}-document
 * volledig weg. Onomkeerbaar. Bewust alleen bedoeld voor test-
 * accounts of andere gevallen waar geen historie hoeft te blijven
 * bestaan — voor een lid dat écht heeft meegespeeld, gebruik
 * verwijderLid (soft-delete), nooit dit.
 *
 * Raakt bewust NIET de Firebase Auth-account zelf (dat vereist de
 * Admin SDK / een Cloud Function, niet beschikbaar vanaf de client) —
 * dat account blijft technisch bestaan maar zonder profiel, en is
 * onschadelijk: mocht hetzelfde e-mailadres ooit opnieuw een
 * uitnodiging verzilveren, wordt gewoon een vers profiel aangemaakt.
 *
 * Betalingen/resultaten/kasmutaties die ooit aan dit account
 * gekoppeld waren blijven staan (die worden nooit verwijderd, ook
 * niet hier) — voor een test-account zonder financiële geschiedenis
 * heeft dat in de praktijk geen effect.
 */
export async function verwijderLidDefinitief(
  lid: { id: string; naam: string },
  beheerder: { uid: string; naam: string }
) {
  await logAudit(
    'lid_definitief_verwijderd',
    `${beheerder.naam} verwijderde ${lid.naam} DEFINITIEF — profiel bestaat niet meer, alleen historische betalingen/resultaten (indien aanwezig) blijven bewaard`,
    beheerder,
    { doelUserId: lid.id }
  );
  await deleteDoc(doc(db, 'users', lid.id));
}

export function formatLidSinds(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  const date = ts.toDate();
  return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}

export function nieuwTicketId(): string {
  return `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
