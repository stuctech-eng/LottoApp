export type NotificationProviderId = 'whatsapp' | 'email' | 'push' | 'sms';

export interface NotificationProviderInfo {
  id: NotificationProviderId;
  naam: string;
  beschrijving: string;
  icoon: string;
  geimplementeerd: boolean;
}
