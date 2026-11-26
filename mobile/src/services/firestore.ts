import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { EventItem, Order, Ticket, UserProfile } from "@/types";

type ErrorHandler = (error: Error) => void;

function mapDocs<T>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function getEvent(eventId: string): Promise<EventItem | null> {
  const snapshot = await getDoc(doc(db, "events", eventId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as EventItem) : null;
}

export function subscribePublishedEvents(callback: (events: EventItem[]) => void, onError?: ErrorHandler): Unsubscribe {
  return onSnapshot(
    query(collection(db, "events"), where("status", "in", ["published", "cancelled"]), orderBy("startAt", "asc")),
    (snapshot) => callback(mapDocs<EventItem>(snapshot)),
    onError,
  );
}

export function subscribeOrganizerEvents(
  organizerId: string,
  callback: (events: EventItem[]) => void,
  onError?: ErrorHandler,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "events"), where("organizerId", "==", organizerId), orderBy("createdAt", "desc")),
    (snapshot) => callback(mapDocs<EventItem>(snapshot)),
    onError,
  );
}

export async function saveEvent(eventId: string | null, values: Record<string, unknown>): Promise<string> {
  const payload = { ...values, updatedAt: serverTimestamp() };
  if (eventId) {
    await updateDoc(doc(db, "events", eventId), payload);
    return eventId;
  }
  const reference = doc(collection(db, "events"));
  await setDoc(reference, { ...payload, createdAt: serverTimestamp() });
  return reference.id;
}

export function subscribeUserOrders(userId: string, callback: (orders: Order[]) => void, onError?: ErrorHandler): Unsubscribe {
  return onSnapshot(
    query(collection(db, "orders"), where("attendeeId", "==", userId), orderBy("createdAt", "desc")),
    (snapshot) => callback(mapDocs<Order>(snapshot)),
    onError,
  );
}

export function subscribeEventOrders(eventId: string, callback: (orders: Order[]) => void, onError?: ErrorHandler): Unsubscribe {
  return onSnapshot(
    query(collection(db, "orders"), where("eventId", "==", eventId), orderBy("createdAt", "desc")),
    (snapshot) => callback(mapDocs<Order>(snapshot)),
    onError,
  );
}

export async function getOrdersForEvents(eventIds: string[]): Promise<Order[]> {
  if (!eventIds.length) return [];
  const snapshots = await Promise.all(
    eventIds.map((eventId) => getDocs(query(collection(db, "orders"), where("eventId", "==", eventId)))),
  );
  return snapshots.flatMap((snapshot) => mapDocs<Order>(snapshot));
}

export async function getTicketsForOrder(orderId: string, attendeeId: string): Promise<Ticket[]> {
  const snapshot = await getDocs(
    query(collection(db, "tickets"), where("orderId", "==", orderId), where("attendeeId", "==", attendeeId)),
  );
  return mapDocs<Ticket>(snapshot);
}

export async function getTicketsForEvent(eventId: string): Promise<Ticket[]> {
  const snapshot = await getDocs(query(collection(db, "tickets"), where("eventId", "==", eventId)));
  return mapDocs<Ticket>(snapshot);
}

export function subscribeOrder(orderId: string, callback: (order: Order | null) => void, onError?: ErrorHandler): Unsubscribe {
  return onSnapshot(
    doc(db, "orders", orderId),
    (snapshot) => callback(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Order) : null),
    onError,
  );
}

export async function getOrganizer(organizerId?: string): Promise<UserProfile | null> {
  if (!organizerId) return null;
  const snapshot = await getDoc(doc(db, "users", organizerId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile) : null;
}

export async function addSavedEvent(userId: string, eventId: string): Promise<void> {
  await setDoc(doc(db, "savedEvents", `${userId}_${eventId}`), { userId, eventId, createdAt: serverTimestamp() });
}

export async function removeSavedEvent(userId: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, "savedEvents", `${userId}_${eventId}`));
}

export function subscribeSavedEvents(userId: string, callback: (eventIds: string[]) => void, onError?: ErrorHandler): Unsubscribe {
  return onSnapshot(
    query(collection(db, "savedEvents"), where("userId", "==", userId)),
    (snapshot) => callback(snapshot.docs.map((item) => item.data().eventId as string)),
    onError,
  );
}
