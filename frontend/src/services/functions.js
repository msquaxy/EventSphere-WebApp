import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { firebaseConfig } from "../firebase/config";

const functions = getFunctions(undefined, "asia-southeast1");
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

const invoke = (name) => httpsCallable(functions, name, { timeout: 30_000 });

export async function createCheckout(eventId, quantity) {
  const result = await invoke("createCheckoutSession")({ eventId, quantity });
  if (!result.data.orderId || (!result.data.checkoutUrl && !result.data.free && !result.data.demo)) throw new Error("The payment session could not be created.");
  return result.data;
}

export async function checkInTicket(code) {
  const result = await invoke("checkInTicket")({ code });
  return result.data;
}

export async function cancelPendingOrder(orderId) {
  const result = await invoke("cancelOrder")({ orderId });
  return result.data;
}

export async function completeDemoOrder(orderId) {
  const result = await invoke("completeDemoOrder")({ orderId });
  return result.data;
}

export function usingEmulator() {
  return import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
}

export const appOrigin = window.location.origin;
export const firebaseProjectId = firebaseConfig.projectId;
