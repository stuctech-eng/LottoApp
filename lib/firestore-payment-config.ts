import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { PaymentConfig } from './types';

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  activeProvider: 'offline',
  providers: {
    offline: { enabled: true },
    mollie: { enabled: false },
    tikkie: { enabled: false },
    stripe: { enabled: false },
    incasso: { enabled: false },
  },
};

/**
 * Live-luisteren naar /paymentConfig/main.
 * Bestaat het document niet (nog geen admin-write gedaan),
 * dan valt deze terug op DEFAULT_PAYMENT_CONFIG zodat de app
 * altijd een geldige configuratie heeft.
 */
export function subscribePaymentConfig(callback: (config: PaymentConfig) => void) {
  const ref = doc(db, 'paymentConfig', 'main');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PaymentConfig;
        callback({ ...DEFAULT_PAYMENT_CONFIG, ...data, providers: { ...DEFAULT_PAYMENT_CONFIG.providers, ...data.providers } });
      } else {
        callback(DEFAULT_PAYMENT_CONFIG);
      }
    },
    () => callback(DEFAULT_PAYMENT_CONFIG)
  );
}
