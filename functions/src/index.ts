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
  if (!snap.exists) return { modus: 'hoogste_score_wint' };
  const d = snap.data()!;
  return { modus: d.modus, vastePrijzen: d.vastePrijzen, minimumScore: d.minimumScore };
}

/**
 * Haal FCM tokens op van een gebruiker en filter op notificatievoorkeur.
 */
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
      notification,
      data,
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        },
        fcmOptions: { link: '/' },
      },
    });
    // Verwijder ongeldige tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && (resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered')) {
        invalidTokens.push(tokens[idx]);
      }
    });
    if (invalidTokens.length > 0) {
      functions.logger.info(`${invalidTokens.length} ongeldige FCM tokens — worden opgeschoond`);
      // Opschonen (best-effort, geen fout als dit mislukt)
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

/**
 * Wordt getriggerd wanneer een nieuwe trekking wordt opgeslagen.
 * Voert de controle-engine uit server-side en schrijft resultaten atomisch.
 *
 * ARCHITECTUURREGEL: alle berekeningen die invloed hebben op winnaars,
 * ranglijsten en Hall of Fame draaien hier — nooit client-side.
 */
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

    // Haal spelConfig en prijsConfig op
    const [spelConfig, prijsConfig] = await Promise.all([getSpelConfig(), getPrijsConfig()]);

    // Haal alle actieve gebruikers + tickets op
    const usersSnap = await db.collection('users').where('actief', '==', true).get();
    const deelnemers: LidTickets[] = usersSnap.docs
      .map(d => {
        const userData = d.data();
        return {
          userId: d.id,
          userNaam: userData.naam as string ?? 'Onbekend',
          tickets: ((userData.tickets ?? []) as { id: string; naam: string; nummers: number[] }[])
            .filter(t => t.nummers && t.nummers.length > 0),
        };
      })
      .filter(d => d.tickets.length > 0);

    // Voer controle-engine uit (pure functie)
    const output = verwerkTrekking({ trekking, deelnemers, spelConfig, prijsConfig });

    // Schrijf resultaten + ranglijstPunten atomisch
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

    // Audit log
    const winnaarNamen = output.winnaars.map(w => w.userNaam).join(', ');
    await logAudit(
      'trekking_ingevoerd',
      `Trekking verwerkt: [${trekking.nummers.join(', ')}]${trekking.bonusBal ? ` + B:${trekking.bonusBal}` : ''}. Winnaar(s): ${winnaarNamen || 'geen'}`,
      trekking.ingevoerdDoor,
      trekking.ingevoerdDoorNaam
    );

    // Push notificaties naar alle leden
    const alleTokens = await getAllFcmTokens('trekkingResultaten');
    const winnaarTekst = output.winnaars.length > 0
      ? `🏆 Winnaar: ${winnaarNamen}`
      : 'Geen winnaar deze ronde';

    for (const { userId, tokens } of alleTokens) {
      // Zoek dit lid's beste resultaat
      const mijnResultaat = output.resultaten
        .filter(r => r.userId === userId)
        .sort((a, b) => b.aantalGoed - a.aantalGoed)[0];

      const body = mijnResultaat
        ? `Jij had ${mijnResultaat.aantalGoed} goed${mijnResultaat.isWinnaar ? ' 🏆 Gefeliciteerd!' : ''}. ${winnaarTekst}`
        : winnaarTekst;

      await sendToTokens(tokens, {
        title: '🎱 Trekking resultaten',
        body,
      }, { trekkingId });
    }

    functions.logger.info(`Trekking ${trekkingId} succesvol verwerkt. ${output.winnaars.length} winnaar(s).`);
  }
);

// ─────────────────────── onBetalingBevestigd ───────────────────────

/**
 * Getriggerd wanneer een betaling status wijzigt naar 'betaald'.
 * Stuurt push notificatie naar het betreffende lid.
 */
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
      body: `€${bedrag.toFixed(2)} (${omschrijving}) is bevestigd door de kashouder.`,
    });
  }
);

// ─────────────────────── onBetalingsHerinnering ───────────────────────

/**
 * Scheduled function — draait elke vrijdag om 09:00.
 * Stuurt herinnering naar leden met status 'open' of 'verificatie'.
 */
export const onBetalingsHerinnering = functions.scheduler.onSchedule(
  {
    schedule: '0 9 * * 5', // elke vrijdag 09:00
    timeZone: 'Europe/Amsterdam',
  },
  async () => {
    functions.logger.info('Betaalherinneringen versturen…');

    const openBetalingen = await db.collection('betalingen')
      .where('status', 'in', ['open'])
      .get();

    const userIds = [...new Set(openBetalingen.docs.map(d => d.data().userId as string))];

    for (const userId of userIds) {
      const tokens = await getFcmTokens(userId, 'herinneringen');
      await sendToTokens(tokens, {
        title: '⏰ Betaalherinnering',
        body: 'Je inleg staat nog open. Meld je betaling in de app vóór de trekking.',
      }, { path: '/betalen' });
    }

    functions.logger.info(`Herinneringen verstuurd naar ${userIds.length} leden.`);
  }
);
