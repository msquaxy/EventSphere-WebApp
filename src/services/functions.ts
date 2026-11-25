import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import type { CheckInResult, CheckoutResult } from "@/types";

// Same callable Cloud Functions the website uses, so bookings and check-ins stay in sync.
const invoke = <Req, Res>(name: string) => httpsCallable<Req, Res>(functions, name, { timeout: 30_000 });

export async function createCheckout(eventId: string, quantity: number): Promise<CheckoutResult> {
  const result = await invoke<{ eventId: string; quantity: number }, CheckoutResult>("createCheckoutSession")({
    eventId,
    quantity,
  });
  const data = result.data;
  if (!data.orderId || (!data.checkoutUrl && !data.free && !data.demo)) {
    throw new Error("The payment session could not be created.");
  }
  return data;
}

export async function checkInTicket(code: string): Promise<CheckInResult> {
  const result = await invoke<{ code: string }, CheckInResult>("checkInTicket")({ code });
  return result.data;
}

export async function cancelPendingOrder(orderId: string): Promise<{ cancelled: boolean }> {
  const result = await invoke<{ orderId: string }, { cancelled: boolean }>("cancelOrder")({ orderId });
  return result.data;
}

export async function completeDemoOrder(orderId: string): Promise<{ status: string }> {
  const result = await invoke<{ orderId: string }, { status: string }>("completeDemoOrder")({ orderId });
  return result.data;
}
