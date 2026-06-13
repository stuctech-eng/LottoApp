import { PaymentProviderInfo } from './types';

/**
 * Mollie iDEAL — STUB, nog niet actief.
 *
 * Vereist voor activatie:
 * - Mollie account + live API key
 * - Server-side API route (app/api/mollie/...) die betaallinks aanmaakt
 * - Webhook endpoint dat Mollie payment-status terugkoppelt naar /betalingen
 *
 * Zodra dit gebouwd is: zet in /paymentConfig
 *   activeProvider: 'mollie'
 *   providers.mollie.enabled: true
 * en de app schakelt over zonder verdere codewijzigingen.
 */
export const mollieProvider: PaymentProviderInfo = {
  id: 'mollie',
  naam: 'Mollie iDEAL',
  beschrijving: 'Automatische iDEAL-betaling (nog niet geactiveerd — API-key ontbreekt)',
  icoon: '💳',
  geimplementeerd: false,
};
