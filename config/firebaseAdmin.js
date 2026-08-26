/**
 * Firebase Admin SDK initialization (server-side).
 *
 * Used to write real-time notification documents to Firestore whenever a
 * swap request is created, accepted, or rejected. The frontend listens to
 * these documents live via the Firebase client SDK (see client/src/firebase).
 *
 * Three ways to configure this, checked in order:
 *   1. FIREBASE_SERVICE_ACCOUNT env var — the entire downloaded JSON pasted
 *      as one single-line string. Simplest for most hosts.
 *   2. Individual env vars matching the JSON file's own key names (project_id,
 *      private_key, client_email, etc. — see buildCredentialFromEnvFields()
 *      below). Useful on platforms/UIs where a single huge JSON-blob env var
 *      is awkward to manage, or where each secret gets added one at a time.
 *   3. server/serviceAccountKey.json — the raw downloaded file, for local
 *      development (already gitignored — never commit this file).
 *
 * Setup: Firebase Console -> Project Settings -> Service Accounts ->
 * Generate new private key. That download is the JSON used by all three
 * options above.
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;
let firestore = null;
let auth = null;

// Option 2: reconstruct the service account object from individual env vars.
// Accepts either the bare JSON field names (project_id, private_key, ...) or
// FIREBASE_-prefixed versions (FIREBASE_PROJECT_ID, ...) — bare names are
// checked first since they match copy-pasting the JSON's own key names
// directly, but the prefixed versions avoid collisions with unrelated env
// vars in a larger project and are the safer choice if you're setting these
// up fresh.
function buildCredentialFromEnvFields() {
  const projectId = process.env.project_id || process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.private_key || process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.client_email || process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) return null;

  return {
    type: process.env.type || 'service_account',
    project_id: projectId,
    private_key_id: process.env.private_key_id || process.env.FIREBASE_PRIVATE_KEY_ID,
    // Handles both real newlines (if the host's UI preserved them) and the
    // literal two-character "\n" text that shows up if they got escaped when
    // copy-pasted — this is the #1 cause of "Invalid PEM" errors with this
    // split-env-vars approach.
    private_key: privateKey.replace(/\\n/g, '\n'),
    client_email: clientEmail,
    client_id: process.env.client_id || process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.token_uri || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url:
      process.env.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.client_x509_cert_url || process.env.FIREBASE_CLIENT_X509_CERT_URL
  };
}

function initFirebaseAdmin() {
  if (initialized) return firestore;

  try {
    let credential;
    const envFieldsCredential = buildCredentialFromEnvFields();

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } else if (envFieldsCredential) {
      credential = admin.credential.cert(envFieldsCredential);
    } else {
      const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
      if (!fs.existsSync(keyPath)) {
        console.warn(
          '[firebaseAdmin] No Firebase credentials found (checked FIREBASE_SERVICE_ACCOUNT, ' +
          'individual env vars, and serviceAccountKey.json).\n' +
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
