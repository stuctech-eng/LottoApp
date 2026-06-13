import { PaymentProviderInfo } from './types';

/**
 * Offline provider — werkt zonder externe koppeling.
 *
 * Flow:
 * 1. Lid meldt betaling ("Ik heb betaald")
 * 2. Kashouder bevestigt in /kashouder/financieel
 * 3. Kas wordt bijgewerkt (kasmutatie +bedrag)
 * 4. AuditLog wordt bijgewerkt
 *
 * Dekt: contant, bankoverschrijving, betaalverzoek buiten de app,
 * of als noodoplossing wanneer Mollie tijdelijk uit staat.
 */
export const offlineProvider: PaymentProviderInfo = {
  id: 'offline',
  naam: 'Offline',
  beschrijving: 'Contant, overschrijving of extern betaalverzoek — lid meldt, kashouder bevestigt',
  icoon: '💬',
  geimplementeerd: true,
};
