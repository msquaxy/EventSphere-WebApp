import {
  addDoc,
  collection,
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
} from "firebase/firestore";
import { db } from "../firebase/config";

export async function getEvent(eventId) {
  const snapshot = await getDoc(doc(db, "events", eventId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export function subscribePublishedEvents(callback, onError) {
  return onSnapshot(
    query(collection(db, "events"), where("status", "in", ["published", "cancelled"]), orderBy("startAt", "asc")),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeOrganizerEvents(organizerId, callback, onError) {
  return onSnapshot(
    query(collection(db, "events"), where("organizerId", "==", organizerId), orderBy("createdAt", "desc")),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function saveEvent(eventId, values) {
  const reference = eventId ? doc(db, "events", eventId) : doc(collection(db, "events"));
  const payload = {
    ...values,
    updatedAt: serverTimestamp(),
  };
  if (eventId) {
    await updateDoc(reference, payload);
  } else {
    await setDoc(reference, { ...payload, createdAt: serverTimestamp() });
  }
  return reference.id;
}

export function subscribeUserOrders(userId, callback, onError) {
  return onSnapshot(
    query(collection(db, "orders"), where("attendeeId", "==", userId), orderBy("createdAt", "desc")),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeEventOrders(eventId, callback, onError) {
  return onSnapshot(
    query(collection(db, "orders"), where("eventId", "==", eventId), orderBy("createdAt", "desc")),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function getOrdersForEvents(eventIds) {
  if (!eventIds.length) return [];
  const snapshots = await Promise.all(eventIds.map((eventId) => getDocs(
    query(collection(db, "orders"), where("eventId", "==", eventId))
  )));
  return snapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function getTicketsForOrder(orderId, attendeeId) {
  const snapshot = await getDocs(query(
    collection(db, "tickets"),
    where("orderId", "==", orderId),
    where("attendeeId", "==", attendeeId),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getTicketsForEvent(eventId) {
  const snapshot = await getDocs(query(collection(db, "tickets"), where("eventId", "==", eventId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function subscribeOrder(orderId, callback, onError) {
  return onSnapshot(doc(db, "orders", orderId), (snapshot) => {
    callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
}

export async function getOrganizer(organizerId) {
  if (!organizerId) return null;
  const snapshot = await getDoc(doc(db, "users", organizerId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function addSavedEvent(userId, eventId) {
  await setDoc(doc(db, "savedEvents", `${userId}_${eventId}`), {
    userId,
    eventId,
    createdAt: serverTimestamp(),
  });
}

export async function removeSavedEvent(userId, eventId) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "savedEvents", `${userId}_${eventId}`));
}

export function subscribeSavedEvents(userId, callback, onError) {
  return onSnapshot(
    query(collection(db, "savedEvents"), where("userId", "==", userId)),
    (snapshot) => callback(snapshot.docs.map((item) => item.data().eventId)),
    onError
  );
}

export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getAllEvents() {
  const snapshot = await getDocs(collection(db, "events"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getAllOrders() {
  const snapshot = await getDocs(collection(db, "orders"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
