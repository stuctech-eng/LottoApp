import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { STANDAARD_INLEG } from './constants';

export interface VerenigingConfig {
  naam: string;
  standaardInleg: number;
}

/**
 * Fallback totdat /verenigingConfig/main is geladen, of als het
 * document nog niet bestaat (bijv. vóór de eerste keer opslaan via
 * Beheer → Instellingen). STANDAARD_INLEG in lib/constants.ts blijft
 * hiermee de "als er niets is ingesteld"-waarde — zelfde patroon als
 * TICKET_CONFIG/spelConfig al gebruikt in dit project.
 */
export const DEFAULT_VERENIGING_CONFIG: VerenigingConfig = {
  naam: 'LottoClub',
  standaardInleg: STANDAARD_INLEG,
};

function parseVerenigingConfig(data: Record<string, unknown> | undefined): VerenigingConfig {
  const naam = typeof data?.naam === 'string' && data.naam.trim().length > 0
    ? data.naam.trim()
    : DEFAULT_VERENIGING_CONFIG.naam;
  const standaardInleg = typeof data?.standaardInleg === 'number' && data.standaardInleg > 0
    ? data.standaardInleg
    : DEFAULT_VERENIGING_CONFIG.standaardInleg;
  return { naam, standaardInleg };
}

/** Live-luisteren naar /verenigingConfig/main — voor gebruik in React-componenten. */
export function subscribeVerenigingConfig(callback: (config: VerenigingConfig) => void) {
  const ref = doc(db, 'verenigingConfig', 'main');
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? parseVerenigingConfig(snap.data()) : DEFAULT_VERENIGING_CONFIG);
    },
    () => callback(DEFAULT_VERENIGING_CONFIG)
  );
}

/**
 * Eenmalige (niet-live) opvraging — voor gebruik in actiefuncties
 * buiten React-componenten, bijv. lib/firestore-payments.ts, waar een
 * doorlopende subscription niet past bij een losse actie zoals het
 * bevestigen van een betaling.
 */
export async function haalVerenigingConfigOp(): Promise<VerenigingConfig> {
  try {
    const snap = await getDoc(doc(db, 'verenigingConfig', 'main'));
    return snap.exists() ? parseVerenigingConfig(snap.data()) : DEFAULT_VERENIGING_CONFIG;
  } catch {
    return DEFAULT_VERENIGING_CONFIG;
  }
}

export async function updateVerenigingConfig(updates: Partial<VerenigingConfig>) {
  await setDoc(doc(db, 'verenigingConfig', 'main'), updates, { merge: true });
}
