import type { FirestoreDate } from "@/types";

export function toDate(value: FirestoreDate | string): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  if (typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate();
  if (typeof value === "object" && "seconds" in value) return new Date(value.seconds * 1000);
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const valid = (date: Date | null): date is Date => Boolean(date) && !Number.isNaN((date as Date).getTime());

// Locale-independent formatting (Hermes' Intl support differs between devices).
export function formatDate(
  value: FirestoreDate,
  options: { weekday?: "short" | "long"; year?: boolean } = {},
): string {
  const date = toDate(value);
  if (!valid(date)) return "Date to be announced";
  const { weekday, year = true } = options;
  const parts = [`${MONTHS[date.getMonth()]} ${date.getDate()}`];
  if (year) parts[0] += `, ${date.getFullYear()}`;
  if (weekday) {
    const names = weekday === "long" ? WEEKDAYS_LONG : WEEKDAYS_SHORT;
    return `${names[date.getDay()]}, ${parts[0]}`;
  }
  return parts[0];
}

export function formatTime(value: FirestoreDate): string {
  const date = toDate(value);
  if (!valid(date)) return "";
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}

export function formatDateTime(value: FirestoreDate): string {
  return `${formatDate(value, { weekday: "short" })} · ${formatTime(value)}`;
}

export function monthShort(value: FirestoreDate): string {
  const date = toDate(value);
  return valid(date) ? MONTHS[date.getMonth()].toUpperCase() : "";
}

export function dayOfMonth(value: FirestoreDate): string {
  const date = toDate(value);
  return valid(date) ? String(date.getDate()) : "";
}

export function formatMoney(centavos = 0): string {
  const pesos = centavos / 100;
  const whole = centavos % 100 === 0;
  const fixed = Math.abs(pesos).toFixed(whole ? 0 : 2);
  const [integer, decimals] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${pesos < 0 ? "-" : ""}₱${grouped}${decimals ? `.${decimals}` : ""}`;
}

export function initials(name = ""): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/user-not-found": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Choose a password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Cannot connect to Firebase. Check your internet connection.",
    "auth/user-disabled": "This account has been disabled.",
  };
  const err = error as { code?: string; message?: string } | undefined;
  if (err?.code && messages[err.code]) return messages[err.code];
  if (err?.code === "permission-denied" && /insufficient permissions/i.test(err.message || "")) {
    return "You don't have permission to do that. If this keeps happening, sign out and sign in again.";
  }
  return err?.message?.replace(/^Firebase:\s*/i, "") || fallback;
}

export function haversineKm(
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null,
): number {
  if (!a || !b) return Infinity;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function remainingTickets(event: { capacity?: number; soldCount?: number; reservedCount?: number }): number {
  return Math.max(0, (event.capacity || 0) - (event.soldCount || 0) - (event.reservedCount || 0));
}

// "2026-12-02T18:00" in the device's local time (the website stores the same label on events).
export function localInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
