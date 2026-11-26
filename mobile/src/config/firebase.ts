import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { connectAuthEmulator, getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";

// NOTE: process.env.EXPO_PUBLIC_* must be referenced statically so Expo can inline the values.
export const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true";
const emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST || "127.0.0.1";

const projectId =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || (useEmulator ? "demo-eventsphere" : "eventsp-ea90b");

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || (useEmulator ? "demo-api-key" : ""),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || (useEmulator ? "1:123456789:web:demo" : ""),
};

export const firebaseReady =
  useEmulator || Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const webOrigin = (process.env.EXPO_PUBLIC_WEB_ORIGIN || "https://eventsp-ea90b.web.app").replace(/\/$/, "");
export const requireEmailVerification = process.env.EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION === "true";

// The Cloud Functions in the web project are deployed to this region.
export const functionsRegion = "asia-southeast1";

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firebase ships this in its React Native build of "firebase/auth", but the bundled type
// declarations don't list it, so it is read through a typed cast.
const getReactNativePersistence = (
  FirebaseAuth as unknown as { getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence }
).getReactNativePersistence;

function createAuth(): Auth {
  try {
    if (!getReactNativePersistence) throw new Error("React Native auth persistence is unavailable.");
    // Persist the login between app launches (same accounts as the website).
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    // Already initialised (fast refresh) -> reuse it; anything else is worth a warning.
    if ((error as { code?: string }).code !== "auth/already-initialized") {
      console.warn("Falling back to default Firebase auth (login will not persist):", error);
    }
    return getAuth(app);
  }
}

function createDb(): Firestore {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

export const auth: Auth = createAuth();
export const db: Firestore = createDb();
export const functions: Functions = getFunctions(app, functionsRegion);

if (useEmulator) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
  } catch {
    // Emulators were already connected (fast refresh).
  }
}
