
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// =========================================================================
// CRITICAL: REPLACE THESE WITH YOUR ACTUAL FIREBASE PROJECT CONFIG VALUES!
// You can find these in your Firebase project settings in the Firebase console.
// Go to: Firebase Console > Project Settings > General (tab) > Your apps > Web app SDK setup and configuration.
// Using incorrect values here will lead to authentication and other Firebase errors.
// =========================================================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDHg2ZOAOE3MsV6XGgbuW6XGkLDJsBiBzg", // This is still a placeholder, replace it
  authDomain: "water-dispatch-2d5a7.firebaseapp.com",
  projectId: "water-dispatch-2d5a7",
  storageBucket: "water-dispatch-2d5a7.appspot.com", // Corrected to .appspot.com as per typical Firebase setup
  messagingSenderId: "868795121118",
  appId: "1:868795121118:web:2b4510a72facf15597714f",
  measurementId: "G-S9MHCS2FML"
};

// Initialize Firebase
// This logic prevents re-initializing the app if it's already been initialized (e.g., during hot reloads)
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence for Firestore
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db, { cacheSizeBytes: CACHE_SIZE_UNLIMITED })
    .then(() => {
      console.log("Firestore offline persistence enabled with unlimited cache size.");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Firestore offline persistence could not be enabled: Multiple tabs open or other precondition failed. Firestore will work online.");
        // This can happen if multiple tabs are open and persistence is already enabled in another tab.
        // It's usually not a critical error for subsequent operations if one tab already has it.
      } else if (err.code === 'unimplemented') {
        console.warn("Firestore offline persistence could not be enabled: Browser does not support required features. Firestore will work online.");
        // The current browser does not support all of the features required to enable persistence
      } else {
        console.error("Error enabling Firestore offline persistence:", err, "Firestore will attempt to work online.");
      }
    });
}

// Initialize Firebase Cloud Messaging only on the client-side
const messaging = typeof window !== 'undefined' ? getMessaging(app) : undefined;

export { app, auth, db, storage, messaging, firebaseConfig };
