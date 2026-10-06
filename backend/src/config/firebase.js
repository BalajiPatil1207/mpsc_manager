const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const path = require('path');

const serviceAccount = require("../../linear-axle-492009-h3-firebase-adminsdk-fbsvc-88a6a5695b.json");

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { app, db, auth };
