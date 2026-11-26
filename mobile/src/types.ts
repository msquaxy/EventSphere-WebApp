import type { Timestamp } from "firebase/firestore";

export type Role = "attendee" | "organizer" | "admin";
export type FirestoreDate = Timestamp | Date | { seconds: number } | number | null | undefined;

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: string;
  city: string;
  phone: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface EventItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  venueName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  startAt: FirestoreDate;
  endAt: FirestoreDate;
  capacity: number;
  priceCentavos: number;
  soldCount: number;
  reservedCount: number;
  coverImage?: string;
  status: "draft" | "published" | "cancelled" | string;
  organizerId: string;
  organizerName?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface Order {
  id: string;
  reference?: string;
  eventId: string;
  attendeeId: string;
  attendeeName?: string;
  attendeeEmail?: string;
  quantity: number;
  totalCentavos: number;
  eventStartAt?: FirestoreDate;
  status: "pending" | "paid" | "expired" | "refund_required" | string;
  paymentProvider?: string;
  checkoutSessionId?: string | null;
  expiresAt?: FirestoreDate;
  paidAt?: FirestoreDate;
  createdAt?: FirestoreDate;
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  attendeeId: string;
  attendeeName?: string;
  code: string;
  status: "valid" | "checked_in" | string;
  createdAt?: FirestoreDate;
  checkedInAt?: FirestoreDate;
}

export interface CheckoutResult {
  orderId: string;
  checkoutUrl?: string;
  free?: boolean;
  demo?: boolean;
}

export interface CheckInResult {
  ticket: Ticket;
  eventTitle: string;
  attendeeName?: string;
}
