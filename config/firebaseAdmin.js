/**
 * Firebase Admin SDK initialization (server-side).
 *
 * Used to write real-time notification documents to Firestore whenever a
 * swap request is created, accepted, or rejected. The frontend listens to
 * these documents live via the Firebase client SDK (see client/src/firebase).
 *
 * Setup:
 *   1. Create a Firebase project at https://console.firebase.google.com
 *   2. Enable Firestore (in "test mode" is fine for the prototype/viva)
 *   3. Project Settings -> Service Accounts -> Generate new private key
 *   4. Save the downloaded JSON as server/serviceAccountKey.json
 *      (already gitignored — never commit this file)
 *   5. Alternatively, set FIREBASE_SERVICE_ACCOUNT in .env as a single-line
 *      JSON string, which is useful for deployment environments.
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;
let firestore = null;
let auth = null;

function initFirebaseAdmin() {
  if (initialized) return firestore;

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } else {
      const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
      if (!fs.existsSync(keyPath)) {
        console.warn(
          '[firebaseAdmin] No serviceAccountKey.json found and FIREBASE_SERVICE_ACCOUNT not set.\n' +
          '  -> Real-time Firestore notifications AND "Continue with Google" sign-in will be\n' +
          '     unavailable until Firebase is configured.\n' +
          '  -> See server/config/firebaseAdmin.js for setup instructions.'
        );
        initialized = true; // avoid re-checking on every call
        return null;
      }
      credential = admin.credential.cert(require(keyPath));
    }

    admin.initializeApp({ credential });
    firestore = admin.firestore();
    auth = admin.auth();
    initialized = true;
    console.log('[firebaseAdmin] Firebase Admin initialized, Firestore + Auth ready.');
    return firestore;
  } catch (err) {
    console.warn('[firebaseAdmin] Failed to initialize Firebase Admin:', err.message);
    initialized = true;
    return null;
  }
}

function getFirebaseAuth() {
  initFirebaseAdmin();
  return auth;
}

module.exports = { initFirebaseAdmin, getFirebaseAuth };
