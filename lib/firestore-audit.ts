import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { AuditAction, AuditLogEntry } from './types';

interface LogAuditUser {
  uid: string;
  naam: string;
}

/** Schrijf een audit-log entry. Faalt stil (logt naar console) om hoofdacties niet te blokkeren. */
export async function logAudit(
  actie: AuditAction,
  omschrijving: string,
  user: LogAuditUser,
  extra?: { doelUserId?: string }
) {
  try {
    await addDoc(collection(db, 'auditLog'), {
      actie,
      omschrijving,
      userId: user.uid,
      userNaam: user.naam,
      doelUserId: extra?.doelUserId ?? null,
      datum: serverTimestamp(),
    });
  } catch (err) {
    console.error('Audit log mislukt:', err);
  }
}

/** Live-luisteren naar de meest recente audit-log entries. */
export function subscribeAuditLog(callback: (entries: AuditLogEntry[]) => void, limitCount = 50) {
  const q = query(collection(db, 'auditLog'), orderBy('datum', 'desc'), fbLimit(limitCount));
  return onSnapshot(
    q,
    (snap) => {
      const entries: AuditLogEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          actie: data.actie,
          omschrijving: data.omschrijving,
          userId: data.userId,
          userNaam: data.userNaam,
          doelUserId: data.doelUserId ?? undefined,
          datum: data.datum ?? null,
        };
      });
      callback(entries);
    },
    (err) => {
      console.error('subscribeAuditLog error:', err);
      callback([]);
    }
  );
}
