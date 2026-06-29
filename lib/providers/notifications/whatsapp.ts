import { NotificationProviderInfo } from './types';

export const whatsappProvider: NotificationProviderInfo = {
  id: 'whatsapp',
  naam: 'WhatsApp',
  beschrijving: 'Betaalverzoeken en herinneringen via wa.me — geen Business API, geen kosten',
  icoon: '💬',
  geimplementeerd: true,
};

/**
 * Formatteer een Nederlands telefoonnummer naar internationaal
 * formaat zonder '+' of spaties, zoals wa.me vereist.
 * Voorbeeld: "06 12345678" -> "31612345678"
 */
function formatTelefoonVoorWhatsapp(telefoon: string): string {
  let nummer = telefoon.replace(/[\s\-()]/g, '');
  if (nummer.startsWith('+')) nummer = nummer.slice(1);
  if (nummer.startsWith('0')) nummer = '31' + nummer.slice(1);
  return nummer;
}

/** Bouw een wa.me-link met voorgevuld bericht. */
export function whatsappLink(telefoon: string, bericht: string): string {
  const nummer = formatTelefoonVoorWhatsapp(telefoon);
  return `https://wa.me/${nummer}?text=${encodeURIComponent(bericht)}`;
}

export function buildWhatsappBetaalverzoek(naam: string, bedrag: number, omschrijving: string): string {
  return `🎱 LottoClub\n\nHallo ${naam},\n\n${omschrijving}\nBedrag: €${bedrag.toFixed(2)}\n\nJe kunt dit melden in de app via "Betalen" zodra je hebt betaald.\n\nSucces!`;
}

/**
 * Bouw een WhatsApp-herinnering met optionele Tikkie-link.
 * Als tikkieLink is ingesteld in /paymentConfig/main, wordt die
 * automatisch toegevoegd aan het bericht zodat het lid direct kan betalen.
 */
export function buildWhatsappHerinnering(
  naam: string,
  bedrag: number,
  omschrijving: string,
  tikkieLink?: string
): string {
  const tikkie = tikkieLink
    ? `\n💳 Betaal direct via Tikkie:\n${tikkieLink}\n`
    : '';
  return `🎱 LottoClub\n\nHerinnering voor ${naam}:\n\nJe betaling staat nog open.\n${omschrijving}\nBedrag: €${bedrag.toFixed(2)}\n${tikkie}\nMeld je betaling in de app via "Betalen" zodra je hebt betaald.`;
}
