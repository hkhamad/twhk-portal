const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

// Fires automatically whenever the admin posts a new signal in Firestore.
// Sends a real push notification to every member's saved device —
// works even if their phone/app is fully closed.
exports.notifyOnNewSignal = onDocumentCreated("signals/{signalId}", async (event) => {
  const signal = event.data.data();

  const membersSnap = await admin.firestore().collection("members").get();

  const isPremiumSignal = signal.tag === "PREMIUM";
  const market = signal.market || "FOREX";
  const tierField = market === "CRYPTO" ? "cryptoTier" : "forexTier";

  const jobs = [];
  membersSnap.forEach((doc) => {
    const member = doc.data();
    if (!member.fcmToken) return; // this member never enabled notifications

    const isPremiumMember = member[tierField] === "PREMIUM";
    const masked = isPremiumSignal && !isPremiumMember;

    const body = masked
      ? `${signal.pair} ${signal.dir} — Premium Signal (login to view)`
      : `${signal.pair} ${signal.dir} — Entry ${signal.entry}`;

    jobs.push(
      admin.messaging().send({
        token: member.fcmToken,
        notification: {
          title: "TW-HK Naya Signal",
          body,
        },
        webpush: {
          fcmOptions: { link: "/" },
        },
      })
    );
  });

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error("Push failed:", r.reason && r.reason.message);
    }
  });

  console.log(`Signal ${event.params.signalId}: attempted ${jobs.length} pushes`);
});
