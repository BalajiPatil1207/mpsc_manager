import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const loadProgressFromDB = async (uid) => {
  try {
    const userRef = doc(db, 'user_progress', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'object') {
          localStorage.setItem(key, JSON.stringify(data[key]));
        } else {
          localStorage.setItem(key, data[key]);
        }
      });
      return true;
    }
  } catch (err) {
    console.error("Error loading progress from DB:", err);
  }
  return false;
};

export const saveToDB = async (key, value) => {
  if (value === undefined) return;
  if (typeof value === 'object') {
    localStorage.setItem(key, JSON.stringify(value));
  } else {
    localStorage.setItem(key, value);
  }

  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      const userRef = doc(db, 'user_progress', uid);
      await setDoc(userRef, { [key]: value, lastSynced: new Date().toISOString() }, { merge: true });
    } catch(err) {
      console.error("DB Sync failed", err);
    }
  }
};

export const saveMultipleToDB = async (updates) => {
  const sanitized = {};
  Object.keys(updates).forEach(key => {
     const value = updates[key];
     if (value !== undefined) {
         sanitized[key] = value;
         if (typeof value === 'object') {
           localStorage.setItem(key, JSON.stringify(value));
         } else {
           localStorage.setItem(key, value);
         }
     }
  });

  const uid = auth.currentUser?.uid;
  if (uid && Object.keys(sanitized).length > 0) {
    try {
       const userRef = doc(db, 'user_progress', uid);
       await setDoc(userRef, { ...sanitized, lastSynced: new Date().toISOString() }, { merge: true });
    } catch(err) {
       console.error("Batch DB Sync failed", err);
    }
  }
};
