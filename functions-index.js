const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();

// Collects FCM tokens of every member who has access to this market
// (FOREX_VIP/CRYPTO_VIP/ALL_VIP or admin), based on their saved fcmTokens array.
async function getTokensForMarket(market) {
  const snap = await admin.firestore().collection('members').get();
  const tokens = [];
  snap.forEach((doc) => {
    const m = doc.data();
    const tier = m.tier || 'FREE';
    const hasAccess =
      tier === 'ALL_VIP' ||
      (market === 'FOREX' && tier === 'FOREX_VIP') ||
      (market === 'CRYPTO' && tier === 'CRYPTO_VIP') ||
      m.role === 'admin';
    if (hasAccess && Array.isArray(m.fcmTokens)) {
      tokens.push(...m.fcmTokens);
    }
  });
  return [...new Set(tokens)];
}

async function removeInvalidToken(token) {
  const snap = await admin.firestore().collection('members')
    .where('fcmTokens', 'array-contains', token).get();
  const batch = admin.firestore().batch();
  snap.forEach((doc) => {
    batch.update(doc.ref, { fcmTokens: admin.firestore.FieldValue.arrayRemove(token) });
  });
  await batch.commit();
}

async function sendToTokens(tokens, title, body, data) {
  if (!tokens.length) return;
  // FCM allows max 500 tokens per multicast call
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    try {
      const res = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: data || {},
        webpush: { fcmOptions: { link: '/' } }
      });
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error && r.error.code === 'messaging/registration-token-not-registered') {
          removeInvalidToken(chunk[idx]).catch(() => {});
        }
      });
    } catch (e) {
      console.error('FCM send error:', e);
    }
  }
}

// Notify on every new signal
exports.onNewSignal = onDocumentCreated('signals/{signalId}', async (event) => {
  const s = event.data.data();
  const tokens = await getTokensForMarket(s.market);
  const title = `${s.pair} ${s.dir} — New Signal`;
  const body = `${s.market} | Entry: ${s.entry} | SL: ${s.sl} | TP1: ${s.tp1}`;
  await sendToTokens(tokens, title, body, { signalId: event.params.signalId, type: 'new_signal' });
});

// Notify whenever a signal's status changes (TP hit, SL hit, BE hit, etc.)
exports.onSignalStatusChange = onDocumentUpdated('signals/{signalId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.roadmapStatus === after.roadmapStatus) return;
  const tokens = await getTokensForMarket(after.market);
  const title = `${after.pair} — ${after.roadmapStatus}`;
  const body = `Trade ${after.tradeCode || ''} updated: ${after.roadmapStatus}`;
  await sendToTokens(tokens, title, body, { signalId: event.params.signalId, type: 'status_update' });
});
