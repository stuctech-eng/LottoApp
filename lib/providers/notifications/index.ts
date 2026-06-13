import { NotificationProviderId } from './types';
import { NotificationProviderInfo } from './types';
import { whatsappProvider } from './whatsapp';

export const NOTIFICATION_PROVIDERS: Record<NotificationProviderId, NotificationProviderInfo> = {
  whatsapp: whatsappProvider,
  email: { id: 'email', naam: 'E-mail', beschrijving: 'Nog niet geïmplementeerd', icoon: '✉️', geimplementeerd: false },
  push: { id: 'push', naam: 'Push', beschrijving: 'Nog niet geïmplementeerd (Fase 6)', icoon: '🔔', geimplementeerd: false },
  sms: { id: 'sms', naam: 'SMS', beschrijving: 'Nog niet geïmplementeerd (toekomst)', icoon: '📱', geimplementeerd: false },
};

export * from './whatsapp';
