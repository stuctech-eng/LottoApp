import { PaymentProviderId } from '@/lib/types';
import { PaymentProviderInfo } from './types';
import { offlineProvider } from './offline';
import { mollieProvider } from './mollie';

/**
 * Centrale registry van alle betaalproviders.
 * tikkie, stripe, incasso zijn nog niet geïmplementeerd —
 * placeholders zodat /paymentConfig al naar ze kan verwijzen
 * zonder dat de UI breekt.
 */
export const PAYMENT_PROVIDERS: Record<PaymentProviderId, PaymentProviderInfo> = {
  offline: offlineProvider,
  mollie: mollieProvider,
  tikkie: {
    id: 'tikkie',
    naam: 'Tikkie',
    beschrijving: 'Nog niet geïmplementeerd',
    icoon: '🔗',
    geimplementeerd: false,
  },
  stripe: {
    id: 'stripe',
    naam: 'Stripe',
    beschrijving: 'Nog niet geïmplementeerd',
    icoon: '💠',
    geimplementeerd: false,
  },
  incasso: {
    id: 'incasso',
    naam: 'Incasso',
    beschrijving: 'Nog niet geïmplementeerd (toekomst)',
    icoon: '🏦',
    geimplementeerd: false,
  },
};

export { offlineProvider, mollieProvider };
