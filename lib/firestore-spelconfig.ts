import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SpelConfig } from './types';

export const DEFAULT_SPELCONFIG: SpelConfig = {
  naam: 'Nederlandse Lotto',
  aantalGetallen: 6,
  minGetal: 1,
  maxGetal: 45,
  bonusBal: true,
};

/** Live-luisteren naar /spelConfig/default. Valt terug op DEFAULT als doc niet bestaat. */
export function subscribeSpelConfig(callback: (config: SpelConfig) => void) {
  const ref = doc(db, 'spelConfig', 'default');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          naam: data.naam ?? DEFAULT_SPELCONFIG.naam,
          aantalGetallen: data.aantalGetallen ?? DEFAULT_SPELCONFIG.aantalGetallen,
          minGetal: data.minGetal ?? DEFAULT_SPELCONFIG.minGetal,
          maxGetal: data.maxGetal ?? DEFAULT_SPELCONFIG.maxGetal,
          bonusBal: data.bonusBal ?? DEFAULT_SPELCONFIG.bonusBal,
        });
      } else {
        callback(DEFAULT_SPELCONFIG);
      }
    },
    () => callback(DEFAULT_SPELCONFIG)
  );
}

/**
 * Schrijft de standaard spelconfiguratie naar Firestore als die nog niet
 * bestaat. Wordt éénmalig aangeroepen door de beheerder-admin pagina.
 *
 * LottoClub gebruikt altijd dezelfde vaste spelmodus ("6 goed is
 * winnaar", cumulatief per speelreeks — zie lib/controle-engine.ts).
 * Er is daarom geen prijsConfig meer nodig: die keuzemogelijkheid is
 * bewust verwijderd.
 */
export async function initSpelConfigAlsNietBestaat() {
  const spelRef = doc(db, 'spelConfig', 'default');
  await setDoc(spelRef, DEFAULT_SPELCONFIG, { merge: true });
}
