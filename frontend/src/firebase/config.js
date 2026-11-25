import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (useEmulator ? "demo-api-key" : ""),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-eventsphere.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (useEmulator ? "demo-eventsphere" : ""),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:demo",
};

export const firebaseReady = useEmulator || Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
