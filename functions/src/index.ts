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

async function sendToTokens(tokens: string[], notification: { title: string; body: string }, data?: Record<string, string>) {
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
      functions.logger.info(`${invalidTokens.length} ongeldige FCM tokens — worden opgeschoond`);
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

    const batch = db.batch();
    for (const resultaat of output.resultaten) {
      const ref = db.collection('resultaten').doc();
      batch.set(ref, { ...resultaat, verwerktOp: admin.firestore.FieldValue.serverTimestamp() });
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

    // Bereken actueel kassaldo voor in de notificatie
    const kasmutaties = await db.collection('kasmutaties').get();
    const kassaldo = kasmutaties.docs.reduce((sum, d) => sum + (d.data().bedrag ?? 0), 0);
    const potTekst = `€${kassaldo.toFixed(0)}`;
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
        // Winnaar!
        title = '🎰 Jackpot!';
        body = `De ballen zijn gevallen... ${getrokkenTekst}. En jij had ze allemaal goed! 🏆 Gefeliciteerd ${deelnemer.userNaam}, jij wint de pot van ${potTekst}! Wat een avond!`;
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

      await sendToTokens(tokens, { title, body }, { trekkingId });
    }

    // Push naar niet-betalers
    for (const nietBetaler of nietBetalers) {
      const tokens = await getFcmTokens(nietBetaler.userId, 'herinneringen');
      if (tokens.length === 0) continue;
      await sendToTokens(tokens, {
        title: '🎱 Trekking gemist',
        body: `Je had deze week niet betaald, dus de getrokken nummers [${trekking.nummers.join(', ')}] tellen niet mee voor jouw verzameling. Je eerder verzamelde nummers blijven wel gewoon staan — betaal op tijd om weer mee te doen. De pot staat nu op ${potTekst}. 💪`,
      }, { path: '/betalen' });
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
    await sendToTokens(tokens, {
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
      await sendToTokens(tokens, {
        title: '⏰ Betaalherinnering',
        body: 'Je inleg voor deze week staat nog open. Betaal vóór zaterdag 18:00 — mis je de deadline, dan telt de trekking van morgen niet mee voor je verzameling.',
      }, { path: '/betalen' });
    }
    functions.logger.info(`Herinneringen verstuurd naar ${userIds.length} leden.`);
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
        await sendToTokens(tokens, {
          title: '🎱 Lotto-uitslag invoeren',
          body: 'De trekking van vanavond is beschikbaar. Voer de nummers in via de app.',
        }, { path: '/trekkingen' });
        aantalVerstuurd++;
      }
    }
    functions.logger.info(`Trekking-herinnering verstuurd naar ${aantalVerstuurd} beheerder(s).`);
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
        await sendToTokens(tokens, {
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
      await sendToTokens(tokens, {
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

    const batch = db.batch();
    for (const resultaat of output.resultaten) {
      const ref = db.collection('resultaten').doc();
      batch.set(ref, { ...resultaat, verwerktOp: admin.firestore.FieldValue.serverTimestamp() });
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
