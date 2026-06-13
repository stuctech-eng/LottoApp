import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SpelConfig, PrijsConfig } from './types';

export const DEFAULT_SPELCONFIG: SpelConfig = {
  naam: 'Nederlandse Lotto',
  aantalGetallen: 6,
  minGetal: 1,
  maxGetal: 45,
  bonusBal: true,
};

export const DEFAULT_PRIJSCONFIG: PrijsConfig = {
  modus: 'hoogste_score_wint',
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

/** Live-luisteren naar /prijsConfig/default. Valt terug op DEFAULT als doc niet bestaat. */
export function subscribePrijsConfig(callback: (config: PrijsConfig) => void) {
  const ref = doc(db, 'prijsConfig', 'default');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          modus: data.modus ?? DEFAULT_PRIJSCONFIG.modus,
          vastePrijzen: data.vastePrijzen,
          minimumScore: data.minimumScore,
        });
      } else {
        callback(DEFAULT_PRIJSCONFIG);
      }
    },
    () => callback(DEFAULT_PRIJSCONFIG)
  );
}

/**
 * Schrijf de standaardconfiguraties naar Firestore als ze nog niet bestaan.
 * Wordt éénmalig aangeroepen door de beheerder-admin pagina.
 */
export async function initSpelConfigAlsNietBestaat() {
  const spelRef = doc(db, 'spelConfig', 'default');
  const prijsRef = doc(db, 'prijsConfig', 'default');

  await setDoc(spelRef, DEFAULT_SPELCONFIG, { merge: true });
  await setDoc(prijsRef, DEFAULT_PRIJSCONFIG, { merge: true });
}
