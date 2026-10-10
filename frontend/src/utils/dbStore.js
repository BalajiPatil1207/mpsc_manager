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

// Deep drop of undefined fields to prevent Firebase errors
const deeplySanitize = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(deeplySanitize).filter(v => v !== undefined);
  } else if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      const val = deeplySanitize(obj[key]);
      if (val !== undefined) sanitized[key] = val;
    }
    return sanitized;
  }
  return obj;
};

export const saveMultipleToDB = async (updates) => {
  const sanitizedUpdates = deeplySanitize(updates);
  
  const localStorageKeys = {};
  Object.keys(sanitizedUpdates).forEach(key => {
     const value = sanitizedUpdates[key];
     localStorageKeys[key] = value;
     if (typeof value === 'object') {
       localStorage.setItem(key, JSON.stringify(value));
     } else {
       localStorage.setItem(key, value);
     }
  });

  const uid = auth.currentUser?.uid;
  if (uid && Object.keys(localStorageKeys).length > 0) {
    try {
       const userRef = doc(db, 'user_progress', uid);
       await setDoc(userRef, { ...sanitizedUpdates, lastSynced: new Date().toISOString() }, { merge: true });
    } catch(err) {
       console.error("Batch DB Sync failed", err);
    }
  }
};
