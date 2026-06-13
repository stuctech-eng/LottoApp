import { PaymentProviderId } from '@/lib/types';

export interface PaymentProviderInfo {
  id: PaymentProviderId;
  naam: string;
  beschrijving: string;
  icoon: string;
  /** true zodra deze provider een werkende betaalflow heeft */
  geimplementeerd: boolean;
}
