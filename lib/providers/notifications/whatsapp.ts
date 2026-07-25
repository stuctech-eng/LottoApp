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

// buildWhatsappBetaalverzoek is verwijderd (25 juli 2026) — nergens
// meer gebruikt sinds de betaalflow is vereenvoudigd naar één route
// (kashouder registreert direct, geen apart eerste-verzoek-bericht).

/**
 * Bouw een WhatsApp-herinnering met optionele Tikkie-link.
 * Als tikkieLink is ingesteld in /paymentConfig/main, wordt die
 * automatisch toegevoegd aan het bericht zodat het lid direct kan storten.
 *
 * Sinds 25 juli 2026: leden melden hun storting niet meer zelf in de
 * app — de kashouder ziet het bedrag in Tikkie en verwerkt het direct.
 * Deze tekst verwijst daarom niet meer naar een meld-stap.
 */
export function buildWhatsappHerinnering(
  naam: string,
  bedrag: number,
  omschrijving: string,
  tikkieLink?: string
): string {
  const tikkie = tikkieLink
    ? `\n💳 Stort direct via Tikkie:\n${tikkieLink}\n`
    : '';
  return `🎱 LottoClub\n\nHerinnering voor ${naam}:\n\nJe hebt deze week nog niet gestort.\n${omschrijving}\nBedrag: €${bedrag.toFixed(2)}\n${tikkie}\nStort via Tikkie — je hoeft verder niks te melden in de app, ik verwerk het zelf zodra ik het zie.\n\n💡 Tip: stort in één keer een groter bedrag, dan wordt dat automatisch verspreid over meerdere weken — geen herinneringen meer nodig.`;
}
