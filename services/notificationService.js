const { initFirebaseAdmin } = require('../config/firebaseAdmin');

/**
 * Writes a notification document to Firestore at:
 *   notifications/{userId}/items/{autoId}
 *
 * The client attaches a real-time onSnapshot listener to this subcollection
 * (see client/src/firebase/notifications.js) so the bell icon and toast
 * updates live, with zero polling.
 *
 * Fails silently (logs a warning) if Firebase Admin isn't configured yet,
 * so the REST API / MongoDB flows keep working even without Firebase set up.
 */
async function sendNotification(userId, { type, title, body, relatedId, relatedType }) {
  const db = initFirebaseAdmin();
  if (!db) return; // Firebase not configured - skip gracefully

  try {
    await db
      .collection('notifications')
      .doc(String(userId))
      .collection('items')
      .add({
        type, // 'swap_request' | 'swap_accepted' | 'swap_rejected' | 'message'
        title,
        body,
        relatedId: relatedId ? String(relatedId) : null,
        relatedType: relatedType || null,
        read: false,
        createdAt: new Date().toISOString()
      });
  } catch (err) {
    console.warn('[notificationService] Failed to write notification:', err.message);
  }
}

module.exports = { sendNotification };
