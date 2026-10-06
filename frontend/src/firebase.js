import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqVvY2QgeZ9zwnXumVQy8M1Ox55hP5VUA",
  authDomain: "linear-axle-492009-h3.firebaseapp.com",
  projectId: "linear-axle-492009-h3",
  storageBucket: "linear-axle-492009-h3.firebasestorage.app",
  messagingSenderId: "815762665247",
  appId: "1:815762665247:web:fd9430c710301eaada4a2a",
  measurementId: "G-EV6HE2LDGY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
