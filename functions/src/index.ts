import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { verwerkTrekking, LidTickets } from './lib/controle-engine';
import { SpelConfig, Trekking, NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './lib/types';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// ─────────────────────── Helpers ───────────────────────

async function getSpelConfig(): Promise<SpelConfig> {
  const snap = await db.doc('spelConfig/default').get();
  if (!snap.exists) {
    return { naam: 'Nederlandse Lotto', aantalGetallen: 6, minGetal: 1, maxGetal: 45, bonusBal: true };
  }
  const d = snap.data()!;
  return { naam: d.naam, aantalGetallen: d.aantalGetallen, minGetal: d.minGetal, maxGetal: d.maxGetal, bonusBal: d.bonusBal };
}

/**
 * Haalt de actueel ingestelde standaard inleg op uit
 * /verenigingConfig/main (beheerbaar via Beheer → Instellingen).
 * Valt terug op 4 (gelijk aan STANDAARD_INLEG in lib/constants.ts)
 * als het document nog niet bestaat of het veld ontbreekt/ongeldig is.
 */
async function getStandaardInleg(): Promise<number> {
  const snap = await db.doc('verenigingConfig/main').get();
  const bedrag = snap.data()?.standaardInleg;
  if (typeof bedrag === 'number' && bedrag > 0) return bedrag;
  return 4;
}

/**
 * Bepaalt welke reeds verwerkte trekkingen van dit seizoen bij de HUIDIGE
 * speelreeks horen: alles ná de laatste trekking met een winnaar, of alles
 * vanaf het begin als er nog nooit gewonnen is. Geen orderBy() gebruikt
 * (architectuurregel) — sortering gebeurt hier in JS.
 *
 * `uitgesloten` is de trekkingId die zelf nog niet meetelt (de trekking
 * die op dit moment verwerkt wordt).
 */
async function bepaalSpeelreeksTrekkingen(
  seizoenId: string,
  uitgesloten?: string
): Promise<{ id: string; datum: Date }[]> {
  const snap = await db.collection('trekkingen')
    .where('seizoenId', '==', seizoenId)
    .where('verwerkt', '==', true)
    .get();

  const trekkingen = snap.docs
    .map(d => ({ id: d.id, datum: (d.data().datum as admin.firestore.Timestamp | null)?.toDate() ?? new Date(0) }))
    .filter(t => t.id !== uitgesloten)
    .sort((a, b) => a.datum.getTime() - b.datum.getTime());

  if (trekkingen.length === 0) return [];

  // Zoek de laatste trekking (chronologisch) met een winnaar — alles
  // daarna hoort bij de huidige speelreeks.
  let speelreeksStart = 0;
  for (let i = trekkingen.length - 1; i >= 0; i--) {
    const winnaarSnap = await db.collection('resultaten')
      .where('trekkingId', '==', trekkingen[i].id)
      .where('isWinnaar', '==', true)
      .limit(1)
      .get();
    if (!winnaarSnap.empty) {
      speelreeksStart = i + 1;
      break;
    }
  }
  return trekkingen.slice(speelreeksStart);
}

/**
 * Haalt per ticketId de meest actuele cumulatieve matchedNumbers op
 * binnen de huidige speelreeks (van vóór de trekking die nu verwerkt
 * wordt). Leeg als dit de eerste trekking van een nieuwe speelreeks is.
 */
async function getVorigeMatchesPerTicket(seizoenId: string, huidigeTrekkingId: string): Promise<Map<string, number[]>> {
  const speelreeksTrekkingen = await bepaalSpeelreeksTrekkingen(seizoenId, huidigeTrekkingId);
  if (speelreeksTrekkingen.length === 0) return new Map();

  // Loop chronologisch (oud → nieuw) door ALLE trekkingen van de
  // speelreeks tot nu toe — niet alleen de laatste. Per ticket bewaren
  // we het resultaat van de meest recente trekking waarin dat ticket
  // daadwerkelijk meedeed (dus wél betaald had). Zo blijft
  // matchedNumbers behouden voor een speler die een week overslaat
  // (bijv. niet betaald): die week telt niet mee, maar eerder
  // verzamelde nummers gaan niet verloren.
  const map = new Map<string, number[]>();
  for (const t of speelreeksTrekkingen) {
    const resultatenSnap = await db.collection('resultaten').where('trekkingId', '==', t.id).get();
    resultatenSnap.docs.forEach(d => {
      const data = d.data();
      map.set(data.ticketId as string, (data.matchedNumbers as number[] | undefined) ?? []);
    });
  }
  return map;
}

/**
 * ISO-8601 weeknummer als string, bijv. "2026-W27".
 * Week loopt van maandag t/m zondag. Week 1 = week met eerste donderdag.
 *
 * FIX: de oude berekening gebruikte een andere methode waardoor zaterdag
 * soms in een andere week viel dan de rest van de week. Bijv. betaling op
 * woensdag 1 juli viel in W27, maar trekking op zaterdag 4 juli viel in W28
 * met de oude methode. Met ISO-8601 vallen beide in W27.
 *
 * Identiek aan huidigTrekkingWeek() in lib/firestore-payments.ts.
 */
function getTrekkingWeek(datum: Date): string {
  const d = new Date(Date.UTC(
    datum.getFullYear(),
    datum.getMonth(),
    datum.getDate()
  ));
  const dayNum = d.getUTCDay() || 7; // maandag=1 ... zondag=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // naar donderdag van deze week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNr = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNr).padStart(2, '0')}`;
}

async function getBetalersVoorWeek(trekkingWeek: string): Promise<Set<string>> {
  const snap = await db.collection('betalingen')
    .where('status', '==', 'betaald')
    .where('trekkingWeek', '==', trekkingWeek)
    .get();
  const betalers = new Set<string>();
  snap.docs.forEach(d => {
    const userId = d.data().userId as string;
    if (userId) betalers.add(userId);
  });
  functions.logger.info(`Betalers voor week ${trekkingWeek}: ${betalers.size} leden`);
  return betalers;
}

/**
 * Server-side variant van berekenActuelePrijzenpot() in
 * lib/firestore-prijzenpot.ts — zelfde logica (speelreeks-grens +
 * som van bevestigde, niet-storting betalingen vanaf die grens),
 * hier met de admin-SDK omdat een Cloud Function geen client-code
 * kan importeren (zie ook heeftHuidigeSpeelreeksAlTrekkingen).
 *
 * uitgeslotenTrekkingId: telt niet mee bij het bepalen van "de
 * laatste trekking met winnaar" — nodig zowel live (de trekking die
 * nu net verwerkt wordt, bestaat nog niet in /resultaten op het
 * moment van aanroepen, dus puur defensief) als bij historische
 * reconstructie (de winnende trekking zelf mag niet als grens voor
 * zíjn eigen prijzenpot-berekening worden gebruikt).
 *
 * totEnMetWeek: begrenst de som naar boven — nodig voor historische
 * reconstructie van een inmiddels AFGESLOTEN speelreeks, zodat geld
 * dat pas ná die winst bevestigd is (voor de volgende speelreeks)
 * niet meetelt. Live (tijdens onTrekkingVerwerkt) laat je dit weg,
 * net als de live clientfunctie.
 */
async function berekenPrijzenpotServerSide(opts?: { totEnMetWeek?: string; uitgeslotenTrekkingId?: string }): Promise<number> {
  const winnendeResultatenSnap = await db.collection('resultaten').where('isWinnaar', '==', true).get();

  let vanafWeek: string | null = null;
  const trekkingIds = [...new Set(
    winnendeResultatenSnap.docs
      .map(d => d.data().trekkingId as string)
      .filter(id => id !== opts?.uitgeslotenTrekkingId)
  )];

  if (trekkingIds.length > 0) {
    let laatsteWinDatum: Date | null = null;
    for (const trekkingId of trekkingIds) {
      const trekkingSnap = await db.doc(`trekkingen/${trekkingId}`).get();
      const datum = trekkingSnap.exists ? (trekkingSnap.data()?.datum?.toDate?.() as Date | undefined) : undefined;
      if (datum && (!laatsteWinDatum || datum > laatsteWinDatum)) laatsteWinDatum = datum;
    }
    if (laatsteWinDatum) {
      const naWinst = new Date(laatsteWinDatum);
      naWinst.setDate(naWinst.getDate() + 7);
      vanafWeek = getTrekkingWeek(naWinst);
    }
  }

  const betalingenSnap = await db.collection('betalingen').where('status', '==', 'betaald').get();
  let pot = 0;
  betalingenSnap.forEach(d => {
    const data = d.data();
    if (data.isSaldoStorting === true) return;
    const week = data.trekkingWeek as string | undefined;
    if (!week) return;
    if (vanafWeek && week < vanafWeek) return;
    if (opts?.totEnMetWeek && week > opts.totEnMetWeek) return;
    pot += (data.bedrag as number | undefined) ?? 0;
  });
  return pot;
}

async function getFcmTokens(userId: string, setting: keyof NotificationSettings): Promise<string[]> {
  const userDoc = await db.doc(`users/${userId}`).get();
  if (!userDoc.exists) return [];
  const data = userDoc.data()!;
  const settings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.notificationSettings ?? {}) };
  if (!settings[setting]) return [];
  const tokensSnap = await db.collection(`users/${userId}/fcmTokens`).get();
  return tokensSnap.docs.map(d => d.data().token as string).filter(Boolean);
}

// getAllFcmTokens was hier ongebruikte dode code (nergens aangeroepen) —
// veroorzaakte een TypeScript-buildfout door noUnusedLocals in tsconfig.
// Verwijderd; geen functionaliteit verloren.

/**
 * BUGFIX (14 augustus 2026): deze functie LOGDE eerder alleen dat
 * ongeldige tokens "worden opgeschoond" — maar verwijderde ze nooit
 * daadwerkelijk uit Firestore. Gevolg: dode tokens (ontstaan door
 * PWA-herinstallaties, cache-wissen, browser-sessiewissels) stapelden
 * zich op en werden bij ELKE melding opnieuw geprobeerd, voor altijd.
 * Op 14 augustus bleken alle 4 opgeslagen tokens van kashouder/
 * beheerder ongeldig — de functie draaide foutloos, maar niemand
 * kreeg iets, want er was simpelweg geen enkel geldig token meer over.
 *
 * userId is nodig om te weten uit welke users/{userId}/fcmTokens/
 * subcollectie een ongeldig token daadwerkelijk verwijderd moet
 * worden — vandaar de nieuwe, verplichte parameter.
 */
async function sendToTokens(userId: string, tokens: string[], notification: { title: string; body: string }, data?: Record<string, string>) {
  if (tokens.length === 0) return;
  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      data: { title: notification.title, body: notification.body, ...(data ?? {}) },
      webpush: { fcmOptions: { link: data?.path ?? '/' } },
    });
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && (resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered')) {
        invalidTokens.push(tokens[idx]);
      }
    });
    if (invalidTokens.length > 0) {
      functions.logger.info(`${invalidTokens.length} ongeldige FCM tokens voor ${userId} — worden nu écht verwijderd`);
      await Promise.all(
        invalidTokens.map(token => db.doc(`users/${userId}/fcmTokens/${token}`).delete().catch(() => {
          // Los, niet-kritiek: als verwijderen zelf al faalt (bijv. het
          // document bestond al niet meer), mag dat de rest van het
          // versturen niet verstoren.
        }))
      );
    }
  } catch (err) {
    functions.logger.error('FCM send error:', err);
  }
}

async function logAudit(actie: string, omschrijving: string, userId: string, userNaam: string) {
  await db.collection('auditLog').add({
    actie,
    omschrijving,
    userId,
    userNaam,
    datum: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ─────────────────────── onTrekkingVerwerkt ───────────────────────

export const onTrekkingVerwerkt = functions.firestore.onDocumentCreated(
  'trekkingen/{trekkingId}',
  async (event) => {
    const trekkingId = event.params.trekkingId;
    const data = event.data?.data();
    if (!data || data.verwerkt === true) {
      functions.logger.info(`Trekking ${trekkingId} al verwerkt of leeg — skip`);
      return;
    }

    const trekking: Trekking = {
      id: trekkingId,
      rondeId: data.rondeId ?? '',
      seizoenId: data.seizoenId ?? '',
      nummers: data.nummers ?? [],
      bonusBal: data.bonusBal ?? null,
      datum: data.datum ?? null,
      ingevoerdDoor: data.ingevoerdDoor ?? '',
      ingevoerdDoorNaam: data.ingevoerdDoorNaam ?? '',
      verwerkt: false,
    };

    functions.logger.info(`Verwerken trekking ${trekkingId}: [${trekking.nummers.join(', ')}]`);

    const trekkingDatum = trekking.datum ? trekking.datum.toDate() : new Date();
    const trekkingWeek = getTrekkingWeek(trekkingDatum);
    functions.logger.info(`TrekkingWeek: ${trekkingWeek}`);

    const [spelConfig, vorigeMatchesPerTicket] = await Promise.all([
      getSpelConfig(),
      getVorigeMatchesPerTicket(trekking.seizoenId, trekkingId),
    ]);
    const betalers = await getBetalersVoorWeek(trekkingWeek);

    const usersSnap = await db.collection('users').where('actief', '==', true).get();
    const alleActieveLeden = usersSnap.docs.map(d => ({ id: d.id, data: d.data() }));

    const deelnemers: LidTickets[] = [];
    const nietBetalers: { userId: string; userNaam: string }[] = [];

    for (const lid of alleActieveLeden) {
      const userData = lid.data;

      // Leden die nog op een nieuwe speelreeks wachten (net lid via
      // uitnodiging mid-reeks, of heractiveerd terwijl ze nog
      // wachtten) mogen nooit meedoen aan de LOPENDE reeks — ook niet
      // als ze toch al een ticket hebben en betaald hebben. Vroeger
      // hing dit toevallig af van een lege tickets-lijst; dat is geen
      // garantie (de UI verbiedt ticket aanmaken tijdens wachten
      // niet, en heractiveren herstelt een eerder aangemaakt ticket).
      // Daarom hier expliciet gecheckt, ongeacht ticket/betaalstatus.
      if (userData.wachtOpNieuweSpeelreeks === true) continue;

      const tickets = ((userData.tickets ?? []) as { id: string; naam: string; nummers: number[] }[])
        .filter(t => t.nummers && t.nummers.length > 0);
      if (tickets.length === 0) continue;

      if (betalers.has(lid.id)) {
        deelnemers.push({
          userId: lid.id,
          userNaam: userData.naam as string ?? 'Onbekend',
          tickets: tickets.map(t => ({ ticket: t, vorigeMatches: vorigeMatchesPerTicket.get(t.id) ?? [] })),
        });
      } else {
        nietBetalers.push({ userId: lid.id, userNaam: userData.naam as string ?? 'Onbekend' });
      }
    }

    functions.logger.info(`Deelnemers: ${deelnemers.length}, Niet betaald: ${nietBetalers.length}`);

    const output = verwerkTrekking({ trekking, deelnemers, spelConfig });

    // Prijzenpot van déze speelreeks — vóór de batch berekend (de
    // winnaars van deze trekking staan dan nog niet in /resultaten),
    // en meegeschreven op elk winnend resultaat zodat het bedrag
    // vastligt op het moment van winnen, i.p.v. steeds opnieuw (en
    // dus mogelijk anders) live herberekend te worden. Zie ook de
    // uitgebreide toelichting in lib/firestore-prijzenpot.ts over
    // waarom dit NIET hetzelfde is als het totale kassaldo.
    //
    // Bij meerdere winnaars wordt de pot GEDEELD: prijsBedrag is per
    // winnaar dus prijzenpot / aantal winnaars, niet de volle pot
    // voor iedereen.
    const prijzenpot = await berekenPrijzenpotServerSide({ uitgeslotenTrekkingId: trekkingId });
    const prijsPerWinnaar = output.winnaars.length > 0 ? prijzenpot / output.winnaars.length : 0;

    const batch = db.batch();
    for (const resultaat of output.resultaten) {
      const ref = db.collection('resultaten').doc();
      batch.set(ref, {
        ...resultaat,
        prijsBedrag: resultaat.isWinnaar ? prijsPerWinnaar : null,
        verwerktOp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    for (const update of output.ranglijstUpdates) {
      if (update.extraPunten > 0) {
        batch.update(db.doc(`users/${update.userId}`), {
          ranglijstPunten: admin.firestore.FieldValue.increment(update.extraPunten),
        });
      }
    }
    batch.update(db.doc(`trekkingen/${trekkingId}`), { verwerkt: true });
    if (trekking.rondeId) {
      batch.update(db.doc(`rondes/${trekking.rondeId}`), { status: 'verwerkt' });
    }
    await batch.commit();

    const winnaarNamen = output.winnaars.map(w => w.userNaam).join(', ');
    await logAudit(
      'trekking_ingevoerd',
      `Trekking verwerkt (${trekkingWeek}): [${trekking.nummers.join(', ')}]${trekking.bonusBal ? ` + B:${trekking.bonusBal}` : ''}. Deelnemers: ${deelnemers.length}. Winnaar(s): ${winnaarNamen || 'geen'}. Niet betaald: ${nietBetalers.length}`,
      trekking.ingevoerdDoor,
      trekking.ingevoerdDoorNaam
    );

    // BUGFIX: gebruikte hier eerder het totale, cumulatieve kassaldo
    // (incl. al bevestigde stortingen voor toekomstige weken) — dat
    // gaf een te hoog, misleidend bedrag in precies de melding waar
    // het om de prijzenpot van déze speelreeks gaat. `prijzenpot`
    // (hierboven al berekend voor het resultaat-record) is hier het
    // juiste getal.
    const potTekst = `€${prijzenpot.toFixed(0)}`;
    const getrokkenTekst = trekking.nummers.join(', ');

    // Push naar deelnemers met persoonlijk verhaal
    for (const deelnemer of deelnemers) {
      const tokens = await getFcmTokens(deelnemer.userId, 'trekkingResultaten');
      if (tokens.length === 0) continue;

      const mijnResultaat = output.resultaten
        .filter(r => r.userId === deelnemer.userId)
        .sort((a, b) => b.aantalGoed - a.aantalGoed)[0];

      let title: string;
      let body: string;

      if (mijnResultaat?.isWinnaar) {
        // Winnaar! Bij meerdere winnaars wordt de pot gedeeld — dan
        // melden we het eigen aandeel, niet de volle pot.
        title = '🎰 Jackpot!';
        const winstTekst = output.winnaars.length > 1
          ? `jij wint mee — met ${output.winnaars.length} winnaars is de pot van ${potTekst} gedeeld, jouw deel: €${prijsPerWinnaar.toFixed(0)}`
          : `jij wint de pot van €${prijsPerWinnaar.toFixed(0)}`;
        body = `De ballen zijn gevallen... ${getrokkenTekst}. En jij had ze allemaal goed! 🏆 Gefeliciteerd ${deelnemer.userNaam}, ${winstTekst}! Wat een avond!`;
      } else if (output.winnaars.length > 0) {
        // Er is een winnaar maar niet jij
        const aantalGoed = mijnResultaat?.aantalGoed ?? 0;
        title = '🎱 Trekking resultaat';
        body = `De ballen zijn gevallen... ${getrokkenTekst}. Jij had ${aantalGoed} goed — helaas niet genoeg deze keer. ${winnaarNamen} won de pot! Volgende week weer een kans. 💪`;
      } else {
        // Geen winnaar
        const aantalGoed = mijnResultaat?.aantalGoed ?? 0;
        title = '🎱 Geen winnaar deze week!';
        body = `De ballen vielen op ${getrokkenTekst}. Jij had ${aantalGoed} goed. Niemand had alle 6 — de pot groeit naar ${potTekst}! Wie pakt hem volgende zaterdag? 🤞`;
      }

      await sendToTokens(deelnemer.userId, tokens, { title, body }, { trekkingId });
    }

    // Push naar niet-betalers
    for (const nietBetaler of nietBetalers) {
      const tokens = await getFcmTokens(nietBetaler.userId, 'herinneringen');
      if (tokens.length === 0) continue;
      await sendToTokens(nietBetaler.userId, tokens, {
        title: '🎱 Trekking gemist',
        body: `Je had deze week niet betaald, dus de getrokken nummers [${trekking.nummers.join(', ')}] tellen niet mee voor jouw verzameling. Je eerder verzamelde nummers blijven wel gewoon staan — betaal op tijd om weer mee te doen. De pot staat nu op ${potTekst}. 💪`,
      }, { path: '/betalen' });
    }

    // Nieuwe speelreeks begonnen (er is een winnaar) → leden die
    // wachtten op precies dit moment mogen nu meedoen. Los van de
    // trekking-batch hierboven, want dit raakt een andere set
    // gebruikers dan de deelnemers/niet-betalers van deze trekking.
    if (output.winnaars.length > 0) {
      const wachtendeSnap = await db.collection('users')
        .where('wachtOpNieuweSpeelreeks', '==', true)
        .get();
      if (!wachtendeSnap.empty) {
        const vrijgaveBatch = db.batch();
        for (const wachtendDoc of wachtendeSnap.docs) {
          vrijgaveBatch.update(wachtendDoc.ref, { wachtOpNieuweSpeelreeks: false });
        }
        await vrijgaveBatch.commit();

        for (const wachtendDoc of wachtendeSnap.docs) {
          const tokens = await getFcmTokens(wachtendDoc.id, 'trekkingResultaten');
          if (tokens.length === 0) continue;
          await sendToTokens(wachtendDoc.id, tokens, {
            title: '🎉 Er is een winnaar!',
            body: `${winnaarNamen} won de pot — de nieuwe speelreeks is begonnen en jij doet vanaf nu mee!`,
          }, { path: '/dashboard' });
        }
        functions.logger.info(`${wachtendeSnap.size} wachtend(e) lid/leden vrijgegeven voor de nieuwe speelreeks.`);
      }
    }

    functions.logger.info(`Trekking ${trekkingId} succesvol verwerkt. ${output.winnaars.length} winnaar(s). ${nietBetalers.length} leden uitgesloten wegens niet-betaling.`);
  }
);

// ─────────────────────── onBetalingBevestigd ───────────────────────

export const onBetalingBevestigd = functions.firestore.onDocumentUpdated(
  'betalingen/{betalingId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== 'betaald') return;

    const userId = after.userId as string;
    const bedrag = after.bedrag as number;
    const omschrijving = after.omschrijving as string;

    functions.logger.info(`Betaling bevestigd voor ${userId}: €${bedrag}`);

    const tokens = await getFcmTokens(userId, 'betalingBevestigd');
    await sendToTokens(userId, tokens, {
      title: '✅ Betaling bevestigd',
      body: `€${bedrag.toFixed(2)} (${omschrijving}) is bevestigd. Je doet mee aan de trekking van deze week!`,
    });
  }
);

// ─────────────────────── onBetalingsHerinnering ───────────────────────

export const onBetalingsHerinnering = functions.scheduler.onSchedule(
  {
    schedule: '0 9 * * 5', // elke vrijdag 09:00
    timeZone: 'Europe/Amsterdam',
  },
  async () => {
    functions.logger.info('Betaalherinneringen versturen…');
    // KRITIEK: alleen 'open' betalingen van de HUIDIGE week meetellen —
    // zonder deze filter zou een verdwaald oud 'open'-document van een
    // eerdere week (zie README) een foutieve herinnering veroorzaken.
    const huidigeWeek = getTrekkingWeek(new Date());
    const openBetalingen = await db.collection('betalingen')
      .where('status', '==', 'open')
      .where('trekkingWeek', '==', huidigeWeek)
      .get();
    const userIds = [...new Set(openBetalingen.docs.map(d => d.data().userId as string))];
    for (const userId of userIds) {
      const tokens = await getFcmTokens(userId, 'herinneringen');
      await sendToTokens(userId, tokens, {
        title: '⏰ Betaalherinnering',
        body: 'Je inleg voor deze week staat nog open. Betaal vóór zaterdag 18:00 — mis je de deadline, dan telt de trekking van morgen niet mee voor je verzameling.',
      }, { path: '/betalen' });
    }
    functions.logger.info(`Herinneringen verstuurd naar ${userIds.length} leden.`);
  }
);

// ─────────────────────── onOnboardingVoltooid ───────────────────────

/**
 * Welkomstmelding zodra een nieuw lid de VERPLICHTE onboarding heeft
 * afgerond (telefoon + ticket, app/welkom/page.tsx stap 6) — bewust
 * niet bij het aanmaken van het account zelf (verzilverUitnodiging),
 * want op dat moment heeft het lid nog geen van beide.
 *
 * Twee varianten, op basis van wachtOpNieuweSpeelreeks: wie meteen
 * mag meedoen krijgt een concrete oproep om te storten vóór de
 * zaterdag-18:00-deadline; wie nog moet wachten krijgt een andere
 * boodschap zónder die druk — voor hen geldt die deadline nu niet.
 */
export const onOnboardingVoltooid = functions.firestore.onDocumentUpdated(
  'users/{userId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.onboardingCompleted === true) return;
    if (after.onboardingCompleted !== true) return;

    const userId = event.params.userId;
    const naam = (after.naam as string | undefined) ?? 'daar';
    const voornaam = naam.split(' ')[0];
    const wacht = after.wachtOpNieuweSpeelreeks === true;

    const tokens = await getFcmTokens(userId, 'herinneringen');
    if (tokens.length === 0) {
      functions.logger.info(`Welkomstmelding overgeslagen voor ${naam} — geen (geldig) FCM-token of 'herinneringen' staat uit.`);
      return;
    }

    const standaardInleg = await getStandaardInleg();
    const body = wacht
      ? `Hoi ${voornaam}! Je speelreeks begint zodra er een winnaar valt — zet je saldo en ticket nu alvast klaar, dan doe je automatisch mee zodra het zover is.`
      : `Hoi ${voornaam}! Stort €${standaardInleg.toFixed(2)} (of vul je LottoSaldo aan) om deze week al mee te spelen — vóór zaterdag 18:00.`;

    await sendToTokens(userId, tokens, {
      title: '🎉 Welkom bij LottoClub!',
      body,
    }, { path: '/betalen' });

    functions.logger.info(`Welkomstmelding verstuurd naar ${naam} (${wacht ? 'wachtend' : 'niet-wachtend'}).`);
  }
);

// ─────────────────────── onWoensdagSaldoHerinnering ───────────────────────

/**
 * Elke woensdag 09:00 — vroege, algemene herinnering om het
 * LottoSaldo op orde te brengen voor deze week. Los van, en
 * aanvullend op, de bestaande vrijdag-09:00- en zaterdag-12:00-
 * meldingen — elk moment heeft zijn eigen doel en toon (zie
 * docs/changelog.md): woensdag is vriendelijk en algemeen, vrijdag
 * een concrete herinnering, zaterdag een gerichte laatste-kans-melding
 * alleen voor wie dan nog te weinig saldo heeft.
 *
 * Zelfde detectie als de bestaande vrijdagmelding (open betalingen
 * van de huidige week). Bewust NIET de zelfhelende variant — die fix
 * staat apart gepland (nog niet live) en wordt hier niet stilzwijgend
 * meegenomen, zie het overleg hierover in docs/changelog.md.
 */
export const onWoensdagSaldoHerinnering = functions.scheduler.onSchedule(
  {
    schedule: '0 9 * * 3', // elke woensdag 09:00
    timeZone: 'Europe/Amsterdam',
  },
  async () => {
    functions.logger.info('Woensdag-saldo-herinnering versturen…');
    const huidigeWeek = getTrekkingWeek(new Date());
    const openBetalingen = await db.collection('betalingen')
      .where('status', '==', 'open')
      .where('trekkingWeek', '==', huidigeWeek)
      .get();
    const userIds = [...new Set(openBetalingen.docs.map(d => d.data().userId as string))];
    for (const userId of userIds) {
      const tokens = await getFcmTokens(userId, 'herinneringen');
      if (tokens.length === 0) continue;
      await sendToTokens(userId, tokens, {
        title: '💰 LottoSaldo',
        body: 'Vergeet je LottoSaldo niet aan te vullen voor deze week.',
      }, { path: '/betalen' });
    }
    functions.logger.info(`Woensdagherinnering verstuurd naar ${userIds.length} leden.`);
  }
);

// ─────────────────────── onTrekkingHerinnering ───────────────────────

export const onTrekkingHerinnering = functions.scheduler.onSchedule(
  {
    schedule: '30 19 * * 6', // elke zaterdag 19:30
    timeZone: 'Europe/Amsterdam',
  },
  async () => {
    functions.logger.info('Trekking-herinnering versturen naar beheerders…');
    const usersSnap = await db.collection('users')
      .where('actief', '==', true)
      .where('rol', '==', 'beheerder')
      .get();
    let aantalVerstuurd = 0;
    for (const userDoc of usersSnap.docs) {
      const tokens = await getFcmTokens(userDoc.id, 'trekkingResultaten');
      if (tokens.length > 0) {
        await sendToTokens(userDoc.id, tokens, {
          title: '🎱 Lotto-uitslag invoeren',
          body: 'De trekking van vanavond is beschikbaar. Voer de nummers in via de app.',
        }, { path: '/trekkingen' });
        aantalVerstuurd++;
      }
    }
    functions.logger.info(`Trekking-herinnering verstuurd naar ${aantalVerstuurd} beheerder(s).`);
  }
);

// ─────────────────────── onTikkieCheckHerinnering ───────────────────────

/**
 * Sinds leden hun storting niet meer zelf melden in de app (25 juli
 * 2026), is er geen automatisch signaal meer wanneer er geld is
 * binnengekomen. Deze herinnering compenseert dat: elke vrijdagavond
 * een duwtje richting kashouder/beheerder om zelf even in Tikkie te
 * kijken en eventuele stortingen te registreren, vóórdat het weekend
 * ingaat en de trekking van zaterdag verwerkt moet worden.
 */
export const onTikkieCheckHerinnering = functions.scheduler.onSchedule(
  {
    schedule: '0 20 * * 5', // elke vrijdag 20:00
    timeZone: 'Europe/Amsterdam',
  },
  async () => {
    functions.logger.info('Tikkie-check-herinnering versturen naar kashouder(s)/beheerder(s)…');
    // Twee losse queries i.p.v. één where('rol','in',[...]) gecombineerd
    // met where('actief','==',true) — die combinatie kan een
    // composite index vereisen die, indien afwezig, stil een lege
    // array teruggeeft (zelfde klasse probleem als eerder met
    // orderBy() geconstateerd). Twee simpele queries zijn altijd veilig.
    const kashoudersSnap = await db.collection('users')
      .where('actief', '==', true)
      .where('rol', '==', 'kashouder')
      .get();
    const beheerdersSnap = await db.collection('users')
      .where('actief', '==', true)
      .where('rol', '==', 'beheerder')
      .get();
    const alleDocs = [...kashoudersSnap.docs, ...beheerdersSnap.docs];
    let aantalVerstuurd = 0;
    for (const userDoc of alleDocs) {
      const tokens = await getFcmTokens(userDoc.id, 'herinneringen');
      if (tokens.length > 0) {
        await sendToTokens(userDoc.id, tokens, {
          title: '💳 Tikkie checken',
          body: 'Tijd om Tikkie te checken op nieuwe stortingen, vóór de trekking van morgen.',
        }, { path: '/kashouder/financieel' });
        aantalVerstuurd++;
      }
    }
    functions.logger.info(`Tikkie-check-herinnering verstuurd naar ${aantalVerstuurd} kashouder(s)/beheerder(s).`);
  }
);

// ─────────────────────── onTikkieLinkVerval ───────────────────────

/**
 * Tikkie-betaalverzoeken verlopen doorgaans na 14 dagen. De app heeft
 * geen Tikkie-API-toegang en kan dus niet daadwerkelijk detecteren of
 * de link nog werkt — dit is een tijd-gebaseerde herinnering, geen
 * garantie. Draait elke maandag; stuurt alleen een melding als de
 * link 12+ dagen niet is bijgewerkt (twee dagen buffer vóór de
 * typische 14-dagen-vervaldatum).
 */
export const onTikkieLinkVerval = functions.scheduler.onSchedule(
  {
    schedule: '0 9 * * 1', // elke maandag 09:00
    timeZone: 'Europe/Amsterdam',
  },
  async () => {
    const configSnap = await db.doc('paymentConfig/main').get();
    const bijgewerkt = configSnap.data()?.tikkieLinkBijgewerkt as admin.firestore.Timestamp | undefined;
    if (!bijgewerkt) {
      functions.logger.info('Geen tikkieLinkBijgewerkt-datum bekend — melding overgeslagen.');
      return;
    }

    const dagenGeleden = Math.floor((Date.now() - bijgewerkt.toDate().getTime()) / 86400000);
    if (dagenGeleden < 12) {
      functions.logger.info(`Tikkie-link is ${dagenGeleden} dagen oud — nog geen melding nodig.`);
      return;
    }

    functions.logger.info(`Tikkie-link is ${dagenGeleden} dagen oud — melding versturen naar beheerders…`);
    const usersSnap = await db.collection('users')
      .where('actief', '==', true)
      .where('rol', '==', 'beheerder')
      .get();
    let aantalVerstuurd = 0;
    for (const userDoc of usersSnap.docs) {
      const tokens = await getFcmTokens(userDoc.id, 'herinneringen');
      if (tokens.length > 0) {
        await sendToTokens(userDoc.id, tokens, {
          title: '🔗 Tikkie-link waarschijnlijk verlopen',
          body: `De Tikkie-link is ${dagenGeleden} dagen niet bijgewerkt en verloopt doorgaans na 14 dagen. Ververs 'm via Beheer → Instellingen.`,
        }, { path: '/beheerder/admin' });
        aantalVerstuurd++;
      }
    }
    functions.logger.info(`Tikkie-vervalmelding verstuurd naar ${aantalVerstuurd} beheerder(s).`);
  }
);

// ─────────────────────── onBetalingenAanmaken ───────────────────────

export const onBetalingenAanmaken = functions.firestore.onDocumentUpdated(
  'trekkingen/{trekkingId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.verwerkt === true) return;
    if (after.verwerkt !== true) return;

    functions.logger.info(`Betalingen aanmaken na trekking ${event.params.trekkingId}`);

    // Volgende week via ISO-8601 berekening — zelfde methode als getTrekkingWeek
    const volgendeWeekDatum = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const volgendeWeek = getTrekkingWeek(volgendeWeekDatum);

    functions.logger.info(`Aanmaken betalingen voor week: ${volgendeWeek}`);

    const usersSnap = await db.collection('users').where('actief', '==', true).get();
    const bestaandeBetalingen = await db.collection('betalingen')
      .where('trekkingWeek', '==', volgendeWeek)
      .get();
    const alBetaling = new Set(bestaandeBetalingen.docs.map(d => d.data().userId as string));

    const batch = db.batch();
    let aantalAangemaakt = 0;
    let aantalAutomatischBetaald = 0;
    const laagSaldoMeldingen: { userId: string; weken: number }[] = [];
    const INLEG = await getStandaardInleg();

    for (const userDoc of usersSnap.docs) {
      if (alBetaling.has(userDoc.id)) continue;
      const userData = userDoc.data();
      const tickets = (userData.tickets ?? []) as { id: string; nummers: number[] }[];
      if (tickets.length === 0) continue;
      // Nieuw lid dat toetrad tijdens een al-lopende speelreeks: mag
      // pas meedoen zodra de huidige reeks eindigt (winnaar valt) en
      // een nieuwe, eerlijke reeks begint — geen betaaldocument, geen
      // afschrijving, hun eerder gestorte saldo blijft gewoon
      // onaangeroerd staan tot dat moment (zie onTrekkingVerwerkt).
      if (userData.wachtOpNieuweSpeelreeks === true) continue;

      const lottoSaldo = (userData.lottoSaldo as number | undefined) ?? 0;

      if (lottoSaldo >= INLEG) {
        // LottoSaldo-systeem: genoeg tegoed → automatisch afboeken,
        // week direct op 'betaald' zetten. Lid hoeft niets te doen.
        //
        // BELANGRIJK: hier wordt GEEN nieuwe kasmutatie aangemaakt.
        // Het geld is al bij de storting zelf als kasmutatie geteld
        // (zie lib/firestore-payments.ts, stortLottoSaldo) — de
        // kashouder ontvangt het namelijk direct op het moment van
        // storten, niet pas bij deze wekelijkse "verbruik"-stap. Nog
        // een kasmutatie hier zou het bedrag dubbel tellen.
        const betalingRef = db.collection('betalingen').doc();
        batch.set(betalingRef, {
          userId: userDoc.id,
          userNaam: userData.naam ?? 'Onbekend',
          bedrag: INLEG,
          omschrijving: 'Inleg LottoClub (automatisch via LottoSaldo)',
          provider: 'offline',
          status: 'betaald',
          trekkingWeek: volgendeWeek,
          tikkieGeopend: false,
          aangemaakt: admin.firestore.FieldValue.serverTimestamp(),
          bevestigd: admin.firestore.FieldValue.serverTimestamp(),
          bevestigdDoor: 'systeem-lottosaldo',
        });
        batch.update(userDoc.ref, { lottoSaldo: admin.firestore.FieldValue.increment(-INLEG) });
        aantalAutomatischBetaald++;

        const nieuwSaldo = lottoSaldo - INLEG;
        const wekenTegoed = Math.floor(nieuwSaldo / INLEG);
        if (wekenTegoed === 2 || wekenTegoed === 1) {
          laagSaldoMeldingen.push({ userId: userDoc.id, weken: wekenTegoed });
        }
      } else {
        // Onvoldoende (of geen) LottoSaldo → normale handmatige flow,
        // ongewijzigd gedrag.
        const ref = db.collection('betalingen').doc();
        batch.set(ref, {
          userId: userDoc.id,
          userNaam: userData.naam ?? 'Onbekend',
          bedrag: INLEG,
          omschrijving: 'Inleg LottoClub',
          provider: 'offline',
          status: 'open',
          trekkingWeek: volgendeWeek,
          tikkieGeopend: false,
          aangemaakt: admin.firestore.FieldValue.serverTimestamp(),
          bevestigd: null,
          bevestigdDoor: null,
        });
        aantalAangemaakt++;
      }
    }

    if (aantalAangemaakt > 0 || aantalAutomatischBetaald > 0) {
      await batch.commit();
      functions.logger.info(`${aantalAangemaakt} betalingen aangemaakt voor week ${volgendeWeek}`);
    } else {
      functions.logger.info(`Geen nieuwe betalingen nodig voor week ${volgendeWeek} — al aangemaakt`);
    }

    // Lage-saldo pushmeldingen — na de batch, zodat een eventuele
    // Firestore-fout in de batch niet halverwege al meldingen verstuurt.
    for (const { userId, weken } of laagSaldoMeldingen) {
      const tokens = await getFcmTokens(userId, 'herinneringen');
      if (tokens.length === 0) continue;
      await sendToTokens(userId, tokens, {
        title: weken === 1 ? '🔴 LottoSaldo bijna op' : '🟡 LottoSaldo wordt laag',
        body: weken === 1
          ? 'Je hebt nog maar 1 week LottoSaldo over. Stort bij zodat je automatisch blijft meedoen.'
          : 'Je hebt nog 2 weken LottoSaldo over. Denk aan bijstorten om automatisch te blijven meedoen.',
      }, { path: '/profiel' });
    }
  }
);

// ─────────────────────── herberekenSpeelreeks ───────────────────────

/**
 * Herberekent alle resultaten van de HUIDIGE speelreeks opnieuw, van
 * begin tot eind, chronologisch. Nuttig als er ooit een fout wordt
 * ontdekt in de score-berekening, of tijdens het testen — zonder dat
 * daar een eenmalig migratiescript voor nodig is.
 *
 * Bewust alleen de huidige speelreeks: oudere, al afgesloten
 * speelreeksen (met een winnaar) blijven ongewijzigd.
 *
 * Alleen beheerders mogen dit aanroepen.
 */
export const herberekenSpeelreeks = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  if (!userDoc.exists || userDoc.data()?.rol !== 'beheerder') {
    throw new functions.https.HttpsError('permission-denied', 'Alleen beheerders mogen dit uitvoeren.');
  }

  const seizoenId = request.data?.seizoenId as string | undefined;
  if (!seizoenId) {
    throw new functions.https.HttpsError('invalid-argument', 'seizoenId is verplicht.');
  }

  const speelreeksTrekkingenBasis = await bepaalSpeelreeksTrekkingen(seizoenId);
  if (speelreeksTrekkingenBasis.length === 0) {
    return { herberekend: 0, bericht: 'Geen trekkingen gevonden in de huidige speelreeks.' };
  }

  functions.logger.info(`Herberekening gestart: ${speelreeksTrekkingenBasis.length} trekking(en) in huidige speelreeks.`);

  // Volledige trekking-data ophalen (basis had alleen id + datum)
  const trekkingDocs = await Promise.all(
    speelreeksTrekkingenBasis.map(t => db.doc(`trekkingen/${t.id}`).get())
  );

  // Oude resultaten van de huidige speelreeks verwijderen. Punten worden
  // straks NIET via een delta-correctie bijgewerkt (dat bleek foutgevoelig
  // bij herhaald herberekenen) maar na afloop in één keer hard herberekend
  // als de exacte som van alle resultaten — zie verderop.
  for (const t of speelreeksTrekkingenBasis) {
    const oudeResultatenSnap = await db.collection('resultaten').where('trekkingId', '==', t.id).get();
    for (const r of oudeResultatenSnap.docs) {
      await r.ref.delete();
    }
  }

  const spelConfig = await getSpelConfig();
  const usersSnap = await db.collection('users').where('actief', '==', true).get();
  const alleLeden = usersSnap.docs.map(d => ({ id: d.id, data: d.data() }));

  let vorigeMatchesPerTicket = new Map<string, number[]>();
  const alleWinnaarNamen: string[] = [];

  for (const trekkingDoc of trekkingDocs) {
    const data = trekkingDoc.data();
    if (!data) continue;

    const trekking: Trekking = {
      id: trekkingDoc.id,
      rondeId: data.rondeId ?? '',
      seizoenId: data.seizoenId ?? '',
      nummers: data.nummers ?? [],
      bonusBal: data.bonusBal ?? null,
      datum: data.datum ?? null,
      ingevoerdDoor: data.ingevoerdDoor ?? '',
      ingevoerdDoorNaam: data.ingevoerdDoorNaam ?? '',
      verwerkt: true,
    };

    // KRITIEK: alleen leden die deze specifieke week hebben betaald
    // tellen mee — zelfde regel als de live onTrekkingVerwerkt trigger.
    // Elke trekking heeft zijn eigen trekkingWeek (afgeleid van de
    // datum van die trekking), dus dit wordt per trekking opnieuw bepaald.
    const trekkingDatum = data.datum ? (data.datum as admin.firestore.Timestamp).toDate() : new Date();
    const trekkingWeekVoorDezeTrekking = getTrekkingWeek(trekkingDatum);
    const betalersVoorDezeTrekking = await getBetalersVoorWeek(trekkingWeekVoorDezeTrekking);

    const deelnemers: LidTickets[] = [];
    for (const lid of alleLeden) {
      // Zelfde wachtrij-check als onTrekkingVerwerkt — zie de
      // toelichting daar. Bij herberekenen moet dit net zo streng zijn.
      if (lid.data.wachtOpNieuweSpeelreeks === true) continue;
      if (!betalersVoorDezeTrekking.has(lid.id)) continue;
      const tickets = ((lid.data.tickets ?? []) as { id: string; naam: string; nummers: number[] }[])
        .filter(t => t.nummers && t.nummers.length > 0);
      if (tickets.length === 0) continue;
      deelnemers.push({
        userId: lid.id,
        userNaam: lid.data.naam as string ?? 'Onbekend',
        tickets: tickets.map(t => ({ ticket: t, vorigeMatches: vorigeMatchesPerTicket.get(t.id) ?? [] })),
      });
    }

    const output = verwerkTrekking({ trekking, deelnemers, spelConfig });

    // Zelfde prijzenpot-vastlegging als in onTrekkingVerwerkt — zie
    // toelichting daar, inclusief het delen van de pot bij meerdere
    // winnaars. Bij herberekenen kan dit dus een eerder vastgelegd
    // prijsBedrag opnieuw (en mogelijk anders) berekenen, wat precies
    // de bedoeling is: herberekenen betekent "reconstrueer dit
    // opnieuw, vanaf de brondata".
    const prijzenpot = await berekenPrijzenpotServerSide({ uitgeslotenTrekkingId: trekkingDoc.id });
    const prijsPerWinnaar = output.winnaars.length > 0 ? prijzenpot / output.winnaars.length : 0;

    const batch = db.batch();
    for (const resultaat of output.resultaten) {
      const ref = db.collection('resultaten').doc();
      batch.set(ref, {
        ...resultaat,
        prijsBedrag: resultaat.isWinnaar ? prijsPerWinnaar : null,
        verwerktOp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    for (const r of output.resultaten) {
      vorigeMatchesPerTicket.set(r.ticketId, r.matchedNumbers);
    }
    alleWinnaarNamen.push(...output.winnaars.map(w => w.userNaam));
  }

  // ranglijstPunten hard herberekenen als de exacte som van alle
  // punten-velden over ÁLLE resultaten van een gebruiker (niet alleen
  // deze speelreeks) — dit is zelfherstellend, ongeacht hoe vaak
  // herberekenSpeelreeks eerder is aangeroepen. Een fragiele
  // optel/aftrek-delta bleek bij herhaald herberekenen te kunnen
  // afwijken van de werkelijke som in /resultaten.
  const alleResultatenSnap = await db.collection('resultaten').get();
  const totaalPuntenPerUser: Record<string, number> = {};
  alleResultatenSnap.docs.forEach(d => {
    const data = d.data();
    const userId = data.userId as string;
    const punten = data.punten as number ?? 0;
    totaalPuntenPerUser[userId] = (totaalPuntenPerUser[userId] ?? 0) + punten;
  });

  const puntenBatch = db.batch();
  for (const lid of alleLeden) {
    puntenBatch.update(db.doc(`users/${lid.id}`), {
      ranglijstPunten: totaalPuntenPerUser[lid.id] ?? 0,
    });
  }
  await puntenBatch.commit();

  await logAudit(
    'trekking_gewijzigd',
    `Speelreeks herberekend: ${speelreeksTrekkingenBasis.length} trekking(en) opnieuw verwerkt. Winnaar(s): ${alleWinnaarNamen.join(', ') || 'geen'}.`,
    request.auth.uid,
    userDoc.data()?.naam ?? 'Beheerder'
  );

  functions.logger.info(`Herberekening voltooid: ${speelreeksTrekkingenBasis.length} trekking(en).`);

  return {
    herberekend: speelreeksTrekkingenBasis.length,
    winnaars: alleWinnaarNamen,
  };
});

// ─────────────────────── vulHistorischPrijsBedragIn ───────────────────────

/**
 * Eenmalige backfill: vult prijsBedrag in op winnaar-resultaten van
 * vóór het bestaan van dat veld (waar het dus nog ontbreekt).
 * Reconstrueert het bedrag met dezelfde prijzenpot-logica als
 * onTrekkingVerwerkt, maar begrensd tot en met de week van de
 * winnende trekking zelf — geld dat pas ná die winst bevestigd is,
 * hoort bij de volgende speelreeks, niet bij deze uitbetaling.
 *
 * Veilig om vaker te draaien: raakt standaard alleen resultaten waar
 * prijsBedrag nog ontbreekt (null of niet aanwezig). Bij meerdere
 * winnaars van dezelfde trekking wordt de pot gedeeld door het
 * aantal winnaars — elke winnaar krijgt zijn eigen aandeel, niet de
 * volle pot.
 *
 * Met forceer: true worden OOK winnaars met een al ingevuld
 * prijsBedrag opnieuw berekend — nodig als brondata achteraf is
 * gecorrigeerd (bijv. een betaling die alsnog als 'gecorrigeerd'
 * gemarkeerd werd) en het eerder vastgelegde bedrag dus niet meer
 * klopt.
 *
 * Alleen beheerders mogen dit aanroepen.
 */
export const vulHistorischPrijsBedragIn = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  if (!userDoc.exists || userDoc.data()?.rol !== 'beheerder') {
    throw new functions.https.HttpsError('permission-denied', 'Alleen beheerders mogen dit uitvoeren.');
  }

  const forceer = request.data?.forceer === true;

  const winnaarsSnap = await db.collection('resultaten').where('isWinnaar', '==', true).get();
  const teVullen = forceer ? winnaarsSnap.docs : winnaarsSnap.docs.filter(d => d.data().prijsBedrag == null);

  if (teVullen.length === 0) {
    return { bijgewerkt: 0, details: [] as { userNaam: string; trekkingId: string; prijsBedrag: number }[] };
  }

  // Groeperen per trekking — winnaars van dezelfde trekking delen
  // dezelfde prijzenpot-berekening (en dus hetzelfde bedrag).
  const perTrekking = new Map<string, typeof teVullen>();
  for (const d of teVullen) {
    const trekkingId = d.data().trekkingId as string;
    if (!perTrekking.has(trekkingId)) perTrekking.set(trekkingId, []);
    perTrekking.get(trekkingId)!.push(d);
  }

  const details: { userNaam: string; trekkingId: string; prijsBedrag: number }[] = [];
  const batch = db.batch();

  for (const [trekkingId, docsTeVullen] of perTrekking) {
    const trekkingSnap = await db.doc(`trekkingen/${trekkingId}`).get();
    const trekkingDatum = trekkingSnap.exists ? (trekkingSnap.data()?.datum?.toDate?.() as Date | undefined) : undefined;
    if (!trekkingDatum) {
      functions.logger.warn(`Trekking ${trekkingId} niet gevonden of zonder datum — overgeslagen.`);
      continue;
    }
    const trekkingWeek = getTrekkingWeek(trekkingDatum);

    // Totaal aantal winnaars van déze trekking — niet alleen degenen
    // die nog een leeg prijsBedrag hebben, want anders zou een
    // gedeeltelijke tweede run de pot verkeerd delen.
    const alleWinnaarsSnap = await db.collection('resultaten')
      .where('trekkingId', '==', trekkingId)
      .where('isWinnaar', '==', true)
      .get();
    const aantalWinnaars = alleWinnaarsSnap.size;

    const totalePot = await berekenPrijzenpotServerSide({
      totEnMetWeek: trekkingWeek,
      uitgeslotenTrekkingId: trekkingId,
    });
    const prijsBedrag = aantalWinnaars > 0 ? totalePot / aantalWinnaars : 0;

    for (const d of docsTeVullen) {
      batch.update(d.ref, { prijsBedrag });
      details.push({ userNaam: d.data().userNaam as string ?? 'Onbekend', trekkingId, prijsBedrag });
    }
  }

  await batch.commit();

  await logAudit(
    'trekking_gewijzigd',
    `Historisch prijsBedrag ingevuld voor ${details.length} winnaar-resultaat(en) over ${perTrekking.size} trekking(en).`,
    request.auth.uid,
    userDoc.data()?.naam ?? 'Beheerder'
  );

  functions.logger.info(`vulHistorischPrijsBedragIn voltooid: ${details.length} resultaat(en) bijgewerkt.`);

  return { bijgewerkt: details.length, details };
});

// ─────────────────────── bekijkPrijzenpotDetails ───────────────────────

/**
 * Alleen-lezen diagnose-tool: toont ITEMIZED welke bevestigde
 * betalingen meetelden in de prijzenpot-berekening van een winnende
 * trekking, i.p.v. alleen het eindtotaal. Bedoeld om een onverwacht
 * bedrag te kunnen controleren zonder eindeloos door het auditlog te
 * moeten scrollen (zie ook de iPhone-first debug-filosofie: fouten/
 * afwijkingen moeten in de app zelf te analyseren zijn).
 *
 * Zonder trekkingId: pakt de meest recente trekking met een winnaar.
 * Schrijft niets. Alleen beheerders mogen dit aanroepen.
 */
export const bekijkPrijzenpotDetails = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const userDoc = await db.doc(`users/${request.auth.uid}`).get();
  if (!userDoc.exists || userDoc.data()?.rol !== 'beheerder') {
    throw new functions.https.HttpsError('permission-denied', 'Alleen beheerders mogen dit uitvoeren.');
  }

  let trekkingId = request.data?.trekkingId as string | undefined;
  const winnendeResultatenSnap = await db.collection('resultaten').where('isWinnaar', '==', true).get();

  if (!trekkingId) {
    if (winnendeResultatenSnap.empty) {
      throw new functions.https.HttpsError('not-found', 'Er is nog geen winnaar geweest.');
    }
    const trekkingIds = [...new Set(winnendeResultatenSnap.docs.map(d => d.data().trekkingId as string))];
    let laatste: { id: string; datum: Date } | null = null;
    for (const id of trekkingIds) {
      const snap = await db.doc(`trekkingen/${id}`).get();
      const datum = snap.exists ? (snap.data()?.datum?.toDate?.() as Date | undefined) : undefined;
      if (datum && (!laatste || datum > laatste.datum)) laatste = { id, datum };
    }
    if (!laatste) {
      throw new functions.https.HttpsError('not-found', 'Kon geen winnende trekking met datum vinden.');
    }
    trekkingId = laatste.id;
  }

  const trekkingSnap = await db.doc(`trekkingen/${trekkingId}`).get();
  if (!trekkingSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Trekking niet gevonden.');
  }
  const trekkingDatum = trekkingSnap.data()?.datum?.toDate?.() as Date | undefined;
  if (!trekkingDatum) {
    throw new functions.https.HttpsError('failed-precondition', 'Trekking heeft geen datum.');
  }
  const trekkingWeek = getTrekkingWeek(trekkingDatum);

  // Zelfde speelreeks-grens als berekenPrijzenpotServerSide, hier
  // itemized teruggegeven i.p.v. alleen de som.
  const anderTrekkingIds = [...new Set(
    winnendeResultatenSnap.docs
      .map(d => d.data().trekkingId as string)
      .filter(id => id !== trekkingId)
  )];
  let vanafWeek: string | null = null;
  let laatsteWinDatum: Date | null = null;
  for (const id of anderTrekkingIds) {
    const snap = await db.doc(`trekkingen/${id}`).get();
    const datum = snap.exists ? (snap.data()?.datum?.toDate?.() as Date | undefined) : undefined;
    if (datum && (!laatsteWinDatum || datum > laatsteWinDatum)) laatsteWinDatum = datum;
  }
  if (laatsteWinDatum) {
    const naWinst = new Date(laatsteWinDatum);
    naWinst.setDate(naWinst.getDate() + 7);
    vanafWeek = getTrekkingWeek(naWinst);
  }

  const betalingenSnap = await db.collection('betalingen').where('status', '==', 'betaald').get();
  const items: { userNaam: string; trekkingWeek: string; bedrag: number; docId: string }[] = [];
  let totaal = 0;
  betalingenSnap.forEach(d => {
    const data = d.data();
    if (data.isSaldoStorting === true) return;
    const week = data.trekkingWeek as string | undefined;
    if (!week) return;
    if (vanafWeek && week < vanafWeek) return;
    if (week > trekkingWeek!) return;
    const bedrag = (data.bedrag as number | undefined) ?? 0;
    items.push({ userNaam: data.userNaam as string ?? 'Onbekend', trekkingWeek: week, bedrag, docId: d.id });
    totaal += bedrag;
  });
  items.sort((a, b) => a.trekkingWeek.localeCompare(b.trekkingWeek));

  const aantalWinnaars = winnendeResultatenSnap.docs.filter(d => d.data().trekkingId === trekkingId).length;

  return { trekkingId, trekkingWeek, vanafWeek, aantalWinnaars, totaal, items };
});

// ─────────────────────── verzilverUitnodiging ───────────────────────

/**
 * Verzilvert een ledenuitnodiging NA succesvol inloggen (Google,
 * e-mail/wachtwoord, of magic-link — de auth zelf is al gebeurd
 * vóórdat deze functie wordt aangeroepen; request.auth bevestigt dat).
 *
 * Alles gebeurt in één Firestore-transactie zodat een token nooit
 * twee keer kan worden verzilverd, ook niet bij een race condition
 * (bijv. dezelfde link twee keer snel achter elkaar geopend).
 *
 * Sinds de invoering van dit uitnodigingssysteem wordt er NERGENS
 * anders meer automatisch een /users/{uid}-document aangemaakt bij
 * een eerste login — dat gebeurt voortaan uitsluitend hier.
 */

/**
 * Bepaalt of de huidige speelreeks al minstens 1 trekking heeft gehad
 * (dus of andere spelers al voorsprong hebben opgebouwd) — gebruikt om
 * te beslissen of een NIEUW lid moet wachten tot de volgende
 * speelreeks (eerlijkheid: niemand mag instappen als anderen al
 * cumulatief nummers hebben verzameld). Zelfde speelreeks-grens-logica
 * als lib/firestore-prijzenpot.ts (client), hier server-side herhaald
 * omdat een Cloud Function geen client-code kan importeren.
 */
async function heeftHuidigeSpeelreeksAlTrekkingen(): Promise<boolean> {
  const winnendeResultatenSnap = await db.collection('resultaten').where('isWinnaar', '==', true).get();

  let vanafDatum: Date | null = null;
  if (!winnendeResultatenSnap.empty) {
    const trekkingIds = [...new Set(winnendeResultatenSnap.docs.map(d => d.data().trekkingId as string))];
    let laatsteWinDatum: Date | null = null;
    for (const trekkingId of trekkingIds) {
      const trekkingSnap = await db.doc(`trekkingen/${trekkingId}`).get();
      const datum = trekkingSnap.exists ? (trekkingSnap.data()?.datum?.toDate?.() as Date | undefined) : undefined;
      if (datum && (!laatsteWinDatum || datum > laatsteWinDatum)) laatsteWinDatum = datum;
    }
    vanafDatum = laatsteWinDatum;
  }

  const trekkingenSnap = await db.collection('trekkingen').where('verwerkt', '==', true).get();
  const trekkingenInHuidigeSpeelreeks = trekkingenSnap.docs.filter(d => {
    const datum = d.data().datum?.toDate?.() as Date | undefined;
    if (!datum) return false;
    return !vanafDatum || datum > vanafDatum;
  });
  return trekkingenInHuidigeSpeelreeks.length > 0;
}

export const verzilverUitnodiging = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const uid = request.auth.uid;
  const token = request.data?.token as string | undefined;
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Geen geldig uitnodigingstoken meegegeven.');
  }
  // Optioneel: bij e-mail/wachtwoord-registratie heeft Firebase Auth
  // geen displayName, dus laat het formulier op de uitnodigingspagina
  // zelf een naam vragen en hier meegeven. Bij Google/magic-link is
  // dit veld leeg en valt de functie terug op het Auth-token.
  const ingevoerdeNaam = (request.data?.naam as string | undefined)?.trim();

  const authNaam = ingevoerdeNaam
    || (request.auth.token.name as string | undefined)
    || (request.auth.token.email as string | undefined)?.split('@')[0]
    || 'Nieuw lid';
  const authEmail = (request.auth.token.email as string | undefined) ?? null;
  const authFoto = (request.auth.token.picture as string | undefined) ?? null;

  const inviteRef = db.doc(`invites/${token}`);
  const userRef = db.doc(`users/${uid}`);

  // Vóór de transactie bepaald (niet erin — dit doet eigen, losse
  // lezingen die niet via tx.get() gaan). Een kleine kans op een
  // net-verouderd resultaat als er EXACT op dit moment een trekking
  // wordt verwerkt is acceptabel: wordt vanzelf rechtgezet zodra de
  // eerstvolgende winnaar valt.
  const moetWachten = await heeftHuidigeSpeelreeksAlTrekkingen();

  await db.runTransaction(async (tx) => {
    const [inviteSnap, userSnap] = await Promise.all([tx.get(inviteRef), tx.get(userRef)]);

    if (!inviteSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Deze uitnodiging bestaat niet (meer).');
    }
    const invite = inviteSnap.data()!;

    if (invite.gebruikt === true) {
      throw new functions.https.HttpsError('failed-precondition', 'Deze uitnodiging is al gebruikt.');
    }
    const vervalOp = invite.vervalOp?.toDate?.() as Date | undefined;
    if (!vervalOp || vervalOp.getTime() < Date.now()) {
      throw new functions.https.HttpsError('failed-precondition', 'Deze uitnodiging is verlopen.');
    }

    if (userSnap.exists) {
      // Dit account heeft al een profiel — nooit overschrijven. Dit
      // voorkomt dat een bestaand lid per ongeluk (of moedwillig) zijn
      // eigen profiel reset door een uitnodigingslink te openen.
      throw new functions.https.HttpsError('already-exists', 'Dit account heeft al een clublidmaatschap.');
    }

    tx.set(userRef, {
      naam: authNaam,
      email: authEmail,
      foto: authFoto,
      rol: 'lid',
      tickets: [],
      lidSinds: admin.firestore.FieldValue.serverTimestamp(),
      ranglijstPunten: 0,
      actief: true,
      lottoSaldo: 0,
      lottoSaldoIntroSeen: false,
      onboardingCompleted: false,
      wachtOpNieuweSpeelreeks: moetWachten,
    });

    tx.update(inviteRef, {
      gebruikt: true,
      gebruiktOp: admin.firestore.FieldValue.serverTimestamp(),
      gebruiktDoorUid: uid,
      gebruiktDoorNaam: authNaam,
    });
  });

  // Audit-log-entry na de transactie — gebruikt de bestaande
  // logAudit-helper (zelfde veldnamen als de rest van het auditlog),
  // niet in de transactie zelf omdat die een andere schrijfmethode
  // gebruikt (add() i.p.v. tx.set()).
  await logAudit(
    'uitnodiging_verzilverd',
    `${authNaam} verzilverde een uitnodiging en werd lid`,
    uid,
    authNaam
  );

  // Melding naar de beheerder(s) — puur informatief, geen actie
  // vereist (vandaar bewust geen plek in "Vereist aandacht"; sinds de
  // verplichte onboarding-stap heeft een nieuw lid sowieso al een
  // ticket + telefoonnummer tegen de tijd dat dit bericht aankomt).
  // Alleen beheerder, nooit kashouder — expliciet zo gekozen.
  const beheerdersSnap = await db.collection('users')
    .where('actief', '==', true)
    .where('rol', '==', 'beheerder')
    .get();
  for (const beheerderDoc of beheerdersSnap.docs) {
    const tokens = await getFcmTokens(beheerderDoc.id, 'nieuweLeden');
    if (tokens.length > 0) {
      await sendToTokens(beheerderDoc.id, tokens, {
        title: '👋 Nieuw lid',
        body: `${authNaam} heeft de uitnodiging verzilverd en is lid geworden.`,
      }, { path: '/leden' });
    }
  }

  functions.logger.info(`Uitnodiging ${token} verzilverd door ${authNaam} (${uid}).`);
  return { succes: true };
});

// ─────────────────────── stuurTestNotificatie ───────────────────────

/**
 * Callable functie, alleen voor de ingelogde gebruiker zelf — stuurt
 * direct een testmelding naar de eigen opgeslagen tokens, zonder op
 * een geplande functie te hoeven wachten (bijv. de zaterdag-19:30-
 * trekkingsherinnering). Gebouwd 15 augustus 2026 om de fix van
 * sendToTokens' token-opschoning direct te kunnen verifiëren, in
 * plaats van tot de volgende geplande melding te moeten wachten.
 *
 * Gebruikt bewust dezelfde sendToTokens-functie als alle echte
 * meldingen — een geslaagde testmelding bewijst dus dat de hele
 * keten (tokens ophalen, versturen, ongeldige opschonen) werkt,
 * niet een aparte, losse implementatie die iets anders zou testen.
 */
export const stuurTestNotificatie = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const uid = request.auth.uid;

  // Alles binnen een try/catch — Firebase verbergt normaal elke
  // onverwachte fout achter het generieke 'internal', zonder details
  // naar de client te sturen (bewuste beveiliging). Voor dit
  // diagnose-doeleinde is dat onhandig: we willen de ECHTE
  // foutmelding juist wél zien, rechtstreeks in de app, in plaats van
  // een aparte omweg via Cloud Logging nodig te hebben.
  try {
    const tokens = await getFcmTokens(uid, 'herinneringen');
    if (tokens.length === 0) {
      return { succes: false, foutmelding: 'Geen (geldig) token gevonden voor jouw account. Open eerst Profiel → FCM Diagnostiek om er een aan te maken.' };
    }

    await sendToTokens(uid, tokens, {
      title: '🔔 Testmelding',
      body: 'Als je dit ziet, werkt je notificatie-instelling correct!',
    }, { path: '/profiel' });

    functions.logger.info(`Testmelding verstuurd naar ${uid} (${tokens.length} token(s) geprobeerd).`);
    return { succes: true, aantalTokens: tokens.length };
  } catch (err: unknown) {
    const details = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    functions.logger.error(`stuurTestNotificatie fout voor ${uid}:`, err);
    return { succes: false, foutmelding: `Interne fout: ${details}` };
  }
});

/**
 * TIJDELIJKE DIAGNOSE-FUNCTIE (15 augustus 2026) — raakt bewust NIET
 * sendToTokens of de echte, productie-meldingen. Stuurt, in
 * tegenstelling tot de rest van de app, WEL een top-level
 * `notification`-veld mee naast `data` — puur om te testen of het
 * probleem "server meldt succes, maar er komt niets aan" zit in de
 * data-only-aanpak (service worker moet de melding zelf tonen) of
 * dieper (bijv. een token dat FCM als geldig beschouwt, maar dat in
 * werkelijkheid niet aflevert). Als DEZE testmelding wél aankomt,
 * weten we zeker waar het probleem zit. Kan na de diagnose weer
 * verwijderd worden.
 */
export const stuurTestNotificatieMetNotificationVeld = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const uid = request.auth.uid;
  try {
    const tokens = await getFcmTokens(uid, 'herinneringen');
    if (tokens.length === 0) {
      return { succes: false, foutmelding: 'Geen (geldig) token gevonden.' };
    }
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: '🔔 Testmelding (met notification-veld)',
        body: 'Als je DEZE ziet maar de andere niet, ligt het aan de data-only-aanpak.',
      },
      data: { path: '/profiel' },
    });
    functions.logger.info(`Diagnose-testmelding (met notification-veld) verstuurd naar ${uid}: ${JSON.stringify(response)}`);
    return { succes: true, aantalTokens: tokens.length, response: JSON.stringify(response.responses) };
  } catch (err: unknown) {
    const details = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    functions.logger.error(`stuurTestNotificatieMetNotificationVeld fout voor ${uid}:`, err);
    return { succes: false, foutmelding: `Interne fout: ${details}` };
  }
});

// ─────────────────────── onZaterdagSaldoHerinnering ───────────────────────

/**
 * Elke zaterdag 12:00 — een gerichte, rustige laatste-kans-melding,
 * UITSLUITEND voor leden die op dít moment nog te weinig saldo hebben
 * voor de deadline van diezelfde avond (18:00, zie
 * app/betalen/page.tsx). Wie al genoeg saldo heeft, krijgt niets meer
 * — dat werd sinds de nieuwe woensdagmelding overbodige ruis (zie
 * docs/changelog.md voor de volledige afweging tussen deze twee
 * meldingen).
 *
 * Alleen voor leden die daadwerkelijk meespelen — leden die nog op de
 * nieuwe speelreeks wachten (wachtOpNieuweSpeelreeks) doen vanavond
 * toch niet mee, dus voor hen zou dit bericht alleen verwarrend zijn.
 */
/**
 * Gedeelde kernlogica, herbruikbaar door zowel de geplande zaterdag-
 * 12:00-melding als door een handmatige trigger (zie
 * stuurZaterdagSaldoHerinneringNu hieronder) — zodat je dit niet een
 * hele week hoeft af te wachten om te kunnen testen.
 */
async function voerZaterdagSaldoHerinneringUit() {
  const statusRef = db.doc('debug/zaterdagSaldoHerinnering');
  const details: { userId: string; naam: string; reden: string }[] = [];

  try {
    const standaardInleg = await getStandaardInleg();

    const usersSnap = await db.collection('users')
      .where('actief', '==', true)
      .get();

    let aantalMetTicket = 0;
    let aantalNietWachtend = 0;
    let aantalMetToken = 0;
    let aantalVerstuurd = 0;

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const naam = (data.naam as string | undefined) ?? userDoc.id;
      const tickets = (data.tickets ?? []) as { id: string; nummers: number[] }[];
      if (tickets.length === 0) {
        details.push({ userId: userDoc.id, naam, reden: 'geen ticket' });
        continue;
      }
      aantalMetTicket++;

      if (data.wachtOpNieuweSpeelreeks === true) {
        details.push({ userId: userDoc.id, naam, reden: 'wacht op nieuwe speelreeks' });
        continue;
      }
      aantalNietWachtend++;

      const tokens = await getFcmTokens(userDoc.id, 'herinneringen');
      if (tokens.length === 0) {
        details.push({ userId: userDoc.id, naam, reden: 'geen (geldig) FCM-token, of \'herinneringen\'-instelling staat uit' });
        continue;
      }
      aantalMetToken++;

      const saldo = (data.lottoSaldo as number | undefined) ?? 0;
      const genoegSaldo = saldo >= standaardInleg;

      // Sinds de woensdagmelding erbij kwam: alleen nog een gerichte,
      // rustige laatste-kans-melding voor wie dan nog te weinig saldo
      // heeft — geen "goed bezig!"-bevestiging meer naar iedereen die
      // toch al voldoende saldo heeft, dat hoort niet meer bij het
      // doel van dít moment (zie docs/changelog.md).
      if (genoegSaldo) {
        details.push({ userId: userDoc.id, naam, reden: `genoeg saldo (€${saldo.toFixed(2)}) — geen melding nodig` });
        continue;
      }

      await sendToTokens(userDoc.id, tokens, {
        title: '🔴 LottoSaldo bijna op',
        body: 'Je LottoSaldo is bijna op. Vul het vandaag nog aan als je deze week wilt blijven meespelen.',
      }, { path: '/betalen' });
      details.push({ userId: userDoc.id, naam, reden: `verstuurd (saldo €${saldo.toFixed(2)})` });
      aantalVerstuurd++;
    }

    await statusRef.set({
      laatsteRun: admin.firestore.FieldValue.serverTimestamp(),
      succes: true,
      foutmelding: null,
      aantalGebruikersGevonden: usersSnap.size,
      aantalMetTicket,
      aantalNietWachtend,
      aantalMetToken,
      aantalVerstuurd,
      details,
    });

    functions.logger.info(`Zaterdag-saldo-herinnering verstuurd naar ${aantalVerstuurd} spelend(e) lid/leden.`);
    return { succes: true, aantalVerstuurd };
  } catch (err: unknown) {
    const foutmelding = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    functions.logger.error('Zaterdag-saldo-herinnering fout:', err);
    await statusRef.set({
      laatsteRun: admin.firestore.FieldValue.serverTimestamp(),
      succes: false,
      foutmelding,
      details,
    });
    return { succes: false, foutmelding };
  }
}

export const onZaterdagSaldoHerinnering = functions.scheduler.onSchedule(
  {
    schedule: '0 12 * * 6', // elke zaterdag 12:00
    timeZone: 'Europe/Amsterdam',
  },
  async () => {
    functions.logger.info('Zaterdag-saldo-herinnering versturen (geplande run)…');
    await voerZaterdagSaldoHerinneringUit();
  }
);

/**
 * Handmatige trigger, alleen voor beheerder — voert exact dezelfde
 * logica uit als de geplande zaterdag-12:00-versie, zodat je niet
 * een hele week hoeft te wachten om te testen of het werkt.
 */
export const stuurZaterdagSaldoHerinneringNu = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (callerSnap.data()?.rol !== 'beheerder') {
    throw new functions.https.HttpsError('permission-denied', 'Alleen beheerder mag dit handmatig triggeren.');
  }
  functions.logger.info(`Zaterdag-saldo-herinnering handmatig getriggerd door ${request.auth.uid}.`);
  return await voerZaterdagSaldoHerinneringUit();
});

// ─────────────────────── Geplande notificaties (Beheer → Notificaties) ───────────────────────
//
// Beheerder maakt vanuit de app zelf meldingen aan (eenmalig of
// wekelijks), zonder dat daar ooit een nieuwe Cloud Function-deploy
// voor nodig is. Kernprincipe: ÉÉN vaste, generieke achtergrondfunctie
// die elke 5 minuten checkt wat er nu verstuurd moet worden — nooit
// een aparte scheduler per notificatie (kan Firebase Cloud Functions
// sowieso niet dynamisch, schedules liggen vast bij deploy-tijd).
//
// De kernlogica hieronder (isAanDeBeurt, berekenBeoogdTijdstipDezeWeek)
// is vooraf geïsoleerd getest met 9 scenario's — inclusief het meest
// kritieke: twee "gelijktijdige" claim-pogingen op dezelfde
// notificatie+periode, waarvan er precies één mag slagen. Die
// bescherming leunt op Firestore's create() die vanzelf faalt als het
// document al bestaat — geen handmatige transactie-logica nodig.

function berekenBeoogdTijdstipDezeWeek(geplandOp: Date, nu: Date): Date {
  const dagVanWeek = geplandOp.getDay();
  const uur = geplandOp.getHours();
  const minuut = geplandOp.getMinutes();
  const nuDag = nu.getDay();
  const verschilInDagen = dagVanWeek - nuDag;
  const resultaat = new Date(nu);
  resultaat.setDate(nu.getDate() + verschilInDagen);
  resultaat.setHours(uur, minuut, 0, 0);
  return resultaat;
}

function isAanDeBeurt(
  notif: { herhaling: string; actief: boolean; geplandOp: Date; laatstVerstuurdVoorPeriode: string | null },
  nu: Date
): { periode: string; due: boolean } {
  if (notif.herhaling === 'eenmalig') {
    return {
      periode: 'eenmalig',
      due: notif.geplandOp <= nu && notif.actief === true,
    };
  }
  const huidigePeriode = getTrekkingWeek(nu); // hergebruikt dezelfde ISO-weekberekening als de rest van de app
  const beoogdeTijd = berekenBeoogdTijdstipDezeWeek(notif.geplandOp, nu);
  return {
    periode: huidigePeriode,
    due: nu >= beoogdeTijd && notif.laatstVerstuurdVoorPeriode !== huidigePeriode && notif.actief === true,
  };
}

async function bepaalDoelgroep(doelgroep: string): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const usersSnap = await db.collection('users').where('actief', '==', true).get();
  return usersSnap.docs.filter((d) => {
    const data = d.data();
    if (doelgroep === 'alleLeden') return true;
    if (doelgroep === 'spelendeLeden') {
      const tickets = data.tickets ?? [];
      return tickets.length > 0 && data.wachtOpNieuweSpeelreeks !== true;
    }
    if (doelgroep === 'beheerderKashouder') {
      return data.rol === 'beheerder' || data.rol === 'kashouder';
    }
    return false;
  });
}

async function verwerkGeplandeNotificatiesCore() {
  const nu = new Date();
  // Geen orderBy() — filteren/sorteren gebeurt hieronder in JS.
  const notificatiesSnap = await db.collection('geplandeNotificaties').where('actief', '==', true).get();

  let verwerkt = 0;
  for (const notifDoc of notificatiesSnap.docs) {
    const data = notifDoc.data();
    const geplandOp = data.geplandOp?.toDate?.() as Date | undefined;
    if (!geplandOp) continue;

    const { periode, due } = isAanDeBeurt(
      {
        herhaling: data.herhaling,
        actief: data.actief,
        geplandOp,
        laatstVerstuurdVoorPeriode: data.laatstVerstuurdVoorPeriode ?? null,
      },
      nu
    );
    if (!due) continue;

    // Atomaire claim: create() faalt vanzelf (ALREADY_EXISTS) als een
    // andere run dit al claimde — dat IS de dubbel-verzending-bescherming.
    const verzendingRef = db.doc(`notificatieVerzendingen/${notifDoc.id}_${periode}`);
    try {
      await verzendingRef.create({
        notificatieId: notifDoc.id,
        periode,
        verstuurdOp: admin.firestore.FieldValue.serverTimestamp(),
        aantalDoelgroep: 0,
        aantalMetToken: 0,
        aantalVerstuurd: 0,
      });
    } catch (err: unknown) {
      // Code 6 / 'already-exists' = normaal, gewoon al geclaimd door een andere run.
      const alBestaand = (err as { code?: number | string })?.code === 6 || (err as { code?: string })?.code === 'already-exists';
      if (!alBestaand) functions.logger.error(`Claim mislukt voor ${notifDoc.id}_${periode}:`, err);
      continue;
    }

    // Claim gelukt — nu pas daadwerkelijk versturen.
    const doelLeden = await bepaalDoelgroep(data.doelgroep);
    let aantalMetToken = 0;
    let aantalVerstuurd = 0;
    for (const lidDoc of doelLeden) {
      const tokens = await getFcmTokens(lidDoc.id, 'herinneringen');
      if (tokens.length === 0) continue;
      aantalMetToken++;
      await sendToTokens(lidDoc.id, tokens, { title: data.titel, body: data.bericht });
      aantalVerstuurd++;
    }

    await verzendingRef.update({ aantalDoelgroep: doelLeden.length, aantalMetToken, aantalVerstuurd });

    const notifUpdate: Record<string, unknown> = { laatstVerstuurdOp: admin.firestore.FieldValue.serverTimestamp() };
    if (data.herhaling === 'eenmalig') {
      notifUpdate.actief = false; // ontbrekend/false actief = niet meer tonen, consistent met de rest van de app
    } else {
      notifUpdate.laatstVerstuurdVoorPeriode = periode;
    }
    await notifDoc.ref.update(notifUpdate);

    functions.logger.info(`Geplande notificatie "${data.titel}" verstuurd (${aantalVerstuurd}/${doelLeden.length}), periode ${periode}.`);
    verwerkt++;
  }
  return { verwerkt };
}

export const verwerkGeplandeNotificaties = functions.scheduler.onSchedule(
  { schedule: '*/5 * * * *', timeZone: 'Europe/Amsterdam' },
  async () => {
    await verwerkGeplandeNotificatiesCore();
  }
);

/**
 * Handmatige trigger, alleen voor beheerder — voert exact dezelfde
 * kernlogica uit, zodat een nieuw aangemaakte notificatie meteen te
 * testen is zonder tot de eerstvolgende 5-minuten-tik te wachten.
 */
export const testVerwerkGeplandeNotificatiesNu = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Niet ingelogd.');
  }
  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (callerSnap.data()?.rol !== 'beheerder') {
    throw new functions.https.HttpsError('permission-denied', 'Alleen beheerder mag dit handmatig triggeren.');
  }
  try {
    const resultaat = await verwerkGeplandeNotificatiesCore();
    return { succes: true, ...resultaat };
  } catch (err: unknown) {
    const details = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    functions.logger.error('testVerwerkGeplandeNotificatiesNu fout:', err);
    return { succes: false, foutmelding: `Interne fout: ${details}` };
  }
});
