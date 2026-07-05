import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { verwerkTrekking, LidTickets } from './lib/controle-engine';
import { SpelConfig, PrijsConfig, Trekking, NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './lib/types';

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

async function getPrijsConfig(): Promise<PrijsConfig> {
  const snap = await db.doc('prijsConfig/default').get();
  if (!snap.exists) return { modus: 'alle_goed_wint' };
  const d = snap.data()!;
  return { modus: d.modus, vastePrijzen: d.vastePrijzen, minimumScore: d.minimumScore };
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

async function getAllFcmTokens(setting: keyof NotificationSettings): Promise<{ userId: string; tokens: string[] }[]> {
  const usersSnap = await db.collection('users').where('actief', '==', true).get();
  const results: { userId: string; tokens: string[] }[] = [];
  for (const userDoc of usersSnap.docs) {
    const tokens = await getFcmTokens(userDoc.id, setting);
    if (tokens.length > 0) results.push({ userId: userDoc.id, tokens });
  }
  return results;
}

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

    const [spelConfig, prijsConfig] = await Promise.all([getSpelConfig(), getPrijsConfig()]);
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
        deelnemers.push({ userId: lid.id, userNaam: userData.naam as string ?? 'Onbekend', tickets });
      } else {
        nietBetalers.push({ userId: lid.id, userNaam: userData.naam as string ?? 'Onbekend' });
      }
    }

    functions.logger.info(`Deelnemers: ${deelnemers.length}, Niet betaald: ${nietBetalers.length}`);

    const output = verwerkTrekking({ trekking, deelnemers, spelConfig, prijsConfig });

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
        body: `Je had deze week niet betaald en deed helaas niet mee. De pot staat nu op ${potTekst}. Doe volgende week mee — hopelijk zien we je dan! 💪`,
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
    const openBetalingen = await db.collection('betalingen').where('status', 'in', ['open']).get();
    const userIds = [...new Set(openBetalingen.docs.map(d => d.data().userId as string))];
    for (const userId of userIds) {
      const tokens = await getFcmTokens(userId, 'herinneringen');
      await sendToTokens(tokens, {
        title: '⏰ Betaalherinnering',
        body: 'Je inleg staat nog open. Betaal en meld het in de app vóór de trekking van zaterdag.',
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

    for (const userDoc of usersSnap.docs) {
      if (alBetaling.has(userDoc.id)) continue;
      const userData = userDoc.data();
      const tickets = (userData.tickets ?? []) as { id: string; nummers: number[] }[];
      if (tickets.length === 0) continue;

      const ref = db.collection('betalingen').doc();
      batch.set(ref, {
        userId: userDoc.id,
        userNaam: userData.naam ?? 'Onbekend',
        bedrag: 4,
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

    if (aantalAangemaakt > 0) {
      await batch.commit();
      functions.logger.info(`${aantalAangemaakt} betalingen aangemaakt voor week ${volgendeWeek}`);
    } else {
      functions.logger.info(`Geen nieuwe betalingen nodig voor week ${volgendeWeek} — al aangemaakt`);
    }
  }
);
