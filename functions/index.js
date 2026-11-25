import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { randomBytes, randomUUID, timingSafeEqual, createHmac } from "node:crypto";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();
const db = getFirestore();
const region = "asia-southeast1";
const runtime = { region, memory: "256MiB", timeoutSeconds: 60 };
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
const reservationMinutes = 30;

function activeProfile(auth) {
  if (!auth) throw new HttpsError("unauthenticated", "Please log in to continue.");
  return db.collection("users").doc(auth.uid).get();
}

async function requireActiveUser(auth) {
  const snapshot = await activeProfile(auth);
  if (!snapshot.exists || snapshot.data().status !== "active") {
    throw new HttpsError("permission-denied", "This account cannot continue.");
  }
  return { id: snapshot.id, ...snapshot.data() };
}

function referenceNumber() {
  return `ES-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function ticketCode() {
  return `ES-${randomBytes(6).toString("hex").toUpperCase()}`;
}

async function fulfillOrder(orderId) {
  return db.runTransaction(async (transaction) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) throw new HttpsError("not-found", "Booking not found.");
    const order = orderSnapshot.data();
    if (order.status === "paid") return { status: "paid", order };
    if (order.status !== "pending") return { status: order.status, order };

    const eventRef = db.collection("events").doc(order.eventId);
    const eventSnapshot = await transaction.get(eventRef);
    if (!eventSnapshot.exists) throw new HttpsError("not-found", "Event not found.");
    const event = eventSnapshot.data();
    const paidAt = FieldValue.serverTimestamp();

    if (event.status === "cancelled") {
      transaction.update(orderRef, {
        status: "refund_required",
        paidAt,
        updatedAt: paidAt,
      });
      transaction.update(eventRef, { reservedCount: FieldValue.increment(-order.quantity), updatedAt: paidAt });
      return { status: "refund_required", order };
    }

    for (let index = 0; index < order.quantity; index += 1) {
      const ticketRef = db.collection("tickets").doc(randomUUID());
      transaction.create(ticketRef, {
        orderId,
        eventId: order.eventId,
        attendeeId: order.attendeeId,
        attendeeName: order.attendeeName,
        code: ticketCode(),
        status: "valid",
        createdAt: paidAt,
      });
    }

    transaction.update(orderRef, {
      status: "paid",
      paidAt,
      updatedAt: paidAt,
    });
    transaction.update(eventRef, {
      reservedCount: FieldValue.increment(-order.quantity),
      soldCount: FieldValue.increment(order.quantity),
      updatedAt: paidAt,
    });
    return { status: "paid", order };
  });
}

function checkoutOrigin(context) {
  const configured = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (configured) return configured;
  if (isEmulator) return "http://localhost:5173";
  const origin = context.rawRequest?.headers?.origin;
  if (!origin || !origin.startsWith("https://")) {
    throw new HttpsError("failed-precondition", "Set APP_ORIGIN to your secure website URL.");
  }
  return origin.replace(/\/$/, "");
}

async function releaseOrder(orderId) {
  await db.runTransaction(async (transaction) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists || orderSnapshot.data().status !== "pending") return;
    const order = orderSnapshot.data();
    transaction.update(orderRef, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
    transaction.update(db.collection("events").doc(order.eventId), { reservedCount: FieldValue.increment(-order.quantity) });
  });
}

export const createCheckoutSession = onCall(runtime, async (request) => {
  const profile = await requireActiveUser(request.auth);
  const eventId = String(request.data?.eventId || "");
  const quantity = Number(request.data?.quantity);
  if (!eventId || !Number.isInteger(quantity) || quantity < 1 || quantity > 6) {
    throw new HttpsError("invalid-argument", "Choose between 1 and 6 tickets.");
  }

  const eventSnapshot = await db.collection("events").doc(eventId).get();
  if (!eventSnapshot.exists) throw new HttpsError("not-found", "This event is not available.");
  const event = eventSnapshot.data();
  if (event.status !== "published") throw new HttpsError("failed-precondition", "Tickets are not on sale for this event.");
  if (event.startAt.toDate() <= new Date()) throw new HttpsError("failed-precondition", "This event has already started.");
  const available = event.capacity - (event.soldCount || 0) - (event.reservedCount || 0);
  if (quantity > available) throw new HttpsError("failed-precondition", `Only ${Math.max(0, available)} tickets remain.`);

  const isFree = event.priceCentavos === 0;
  const paymongoKey = process.env.PAYMONGO_SECRET_KEY;
  if (!isFree && !paymongoKey && !isEmulator) {
    throw new HttpsError("failed-precondition", "Payments are not configured yet. Please contact the organizer.");
  }

  const orderRef = db.collection("orders").doc();
  const orderId = orderRef.id;
  const reference = referenceNumber();
  const createdAt = FieldValue.serverTimestamp();
  const origin = checkoutOrigin(request);

  await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(db.collection("events").doc(eventId));
    const current = currentSnapshot.data();
    const currentAvailable = current.capacity - (current.soldCount || 0) - (current.reservedCount || 0);
    if (current.status !== "published" || quantity > currentAvailable) {
      throw new HttpsError("failed-precondition", "Ticket availability changed. Please try again.");
    }
    transaction.create(orderRef, {
      reference,
      eventId,
      attendeeId: profile.id,
      attendeeName: profile.fullName,
      attendeeEmail: profile.email,
      quantity,
      totalCentavos: current.priceCentavos * quantity,
      eventStartAt: current.startAt,
      status: "pending",
      paymentProvider: isFree ? "free" : "paymongo",
      checkoutSessionId: null,
      expiresAt: isFree ? null : Timestamp.fromMillis(Date.now() + reservationMinutes * 60_000),
      createdAt,
      updatedAt: createdAt,
    });
    transaction.update(db.collection("events").doc(eventId), {
      reservedCount: FieldValue.increment(quantity),
      updatedAt: createdAt,
    });
  });

  if (isFree) {
    await fulfillOrder(orderId);
    return { free: true, orderId };
  }

  if (isEmulator && !paymongoKey) return { demo: true, orderId };

  let response;
  try {
    response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${paymongoKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [{
              name: `${event.title} — General Admission`,
              description: `${quantity} EventSphere ticket${quantity === 1 ? "" : "s"}`,
              amount: event.priceCentavos,
              currency: "PHP",
              quantity,
            }],
            payment_method_types: ["card", "gcash", "paymaya", "qrph"],
            success_url: `${origin}/checkout/return?orderId=${encodeURIComponent(orderId)}`,
            cancel_url: `${origin}/events/${encodeURIComponent(eventId)}?checkout=cancelled`,
            reference_number: reference,
            description: event.title,
            customer_email: profile.email,
            metadata: { orderId, eventId, reference },
            pass_on_fees: false,
            send_email_receipt: true,
          },
        },
      }),
    });
  } catch (error) {
    await releaseOrder(orderId);
    throw new HttpsError("unavailable", "The payment provider is unavailable. Please try again.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data?.attributes?.checkout_url) {
    await releaseOrder(orderId);
    console.error("PayMongo checkout failed", response.status, payload);
    throw new HttpsError("unavailable", "The payment provider could not open checkout. Please try again.");
  }

  await orderRef.update({
    checkoutSessionId: payload.data.id,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { checkoutUrl: payload.data.attributes.checkout_url, orderId };
});

export const paymongoWebhook = onRequest(runtime, async (request, response) => {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return response.status(503).json({ error: "Webhook secret is not configured." });

  const signatureHeader = request.headers["paymongo-signature"];
  const rawBody = request.rawBody;
  if (!signatureHeader || !rawBody) return response.status(400).json({ error: "Missing signature or body." });

  const parts = String(signatureHeader).split(",").reduce((values, part) => {
    const [key, value] = part.trim().split("=");
    if (key && value) values[key] = value;
    return values;
  }, {});
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return response.status(400).json({ error: "Stale webhook timestamp." });
  }

  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody.toString("utf8")}`).digest();
  const signatures = [parts.te, parts.li].filter(Boolean).map((value) => Buffer.from(value, "hex"));
  const valid = signatures.some((signature) => signature.length === expected.length && timingSafeEqual(signature, expected));
  if (!valid) return response.status(401).json({ error: "Invalid webhook signature." });

  let body;
  try { body = JSON.parse(rawBody.toString("utf8")); }
  catch { return response.status(400).json({ error: "Invalid JSON body." }); }

  const attributes = body.data?.attributes || {};
  const eventType = attributes.type || body.data?.type;
  const session = attributes.data || body.data?.data || {};
  const sessionAttributes = session.attributes || {};
  const metadata = sessionAttributes.metadata || {};
  if (eventType !== "checkout_session.payment.paid") return response.status(200).json({ received: true });

  const payment = (sessionAttributes.payments || []).find((item) => item.attributes?.status === "paid");
  if (!payment) return response.status(200).json({ received: true });

  let orderId = metadata.orderId;
  if (!orderId && session.id) {
    const match = await db.collection("orders").where("checkoutSessionId", "==", session.id).limit(1).get();
    orderId = match.docs[0]?.id;
  }
  if (!orderId) return response.status(200).json({ received: true, warning: "Unknown booking" });

  const orderSnapshot = await db.collection("orders").doc(orderId).get();
  if (!orderSnapshot.exists) return response.status(200).json({ received: true, warning: "Unknown booking" });
  const order = orderSnapshot.data();
  if (payment.attributes.amount !== order.totalCentavos || payment.attributes.currency !== "PHP") {
    console.error("PayMongo amount mismatch", orderId, payment.attributes.amount, order.totalCentavos);
    return response.status(200).json({ received: true, warning: "Amount mismatch" });
  }

  await fulfillOrder(orderId);
  await db.collection("orders").doc(orderId).update({
    paymentId: payment.id,
    paymentSource: payment.attributes.source?.type || null,
    checkoutSessionId: session.id,
  });
  return response.status(200).json({ received: true });
});

export const checkInTicket = onCall(runtime, async (request) => {
  const profile = await requireActiveUser(request.auth);
  if (!["organizer", "admin"].includes(profile.role)) throw new HttpsError("permission-denied", "Organizer access required.");
  const code = String(request.data?.code || "").trim().toUpperCase();
  if (!code) throw new HttpsError("invalid-argument", "Enter a ticket code.");

  const result = await db.runTransaction(async (transaction) => {
    const ticketSnapshot = await transaction.get(db.collection("tickets").where("code", "==", code).limit(1));
    const ticket = ticketSnapshot.docs[0];
    if (!ticket) throw new HttpsError("not-found", "Ticket not found.");
    const ticketData = ticket.data();
    const eventSnapshot = await transaction.get(db.collection("events").doc(ticketData.eventId));
    if (!eventSnapshot.exists) throw new HttpsError("not-found", "Event not found.");
    const event = eventSnapshot.data();
    if (profile.role !== "admin" && event.organizerId !== profile.id) {
      throw new HttpsError("permission-denied", "You can only check in guests at your own events.");
    }
    if (ticketData.status === "checked_in") throw new HttpsError("failed-precondition", "This ticket has already been checked in.");
    if (ticketData.status !== "valid") throw new HttpsError("failed-precondition", "This ticket is not valid.");
    transaction.update(ticket.ref, {
      status: "checked_in",
      checkedInAt: FieldValue.serverTimestamp(),
      checkedInBy: profile.id,
    });
    return { ticket: { id: ticket.id, ...ticketData }, eventTitle: event.title };
  });

  return {
    ticket: result.ticket,
    eventTitle: result.eventTitle,
    attendeeName: result.ticket.attendeeName,
  };
});

export const cancelOrder = onCall(runtime, async (request) => {
  const profile = await requireActiveUser(request.auth);
  const orderId = String(request.data?.orderId || "");
  const orderSnapshot = await db.collection("orders").doc(orderId).get();
  if (!orderSnapshot.exists || orderSnapshot.data().attendeeId !== profile.id) {
    throw new HttpsError("permission-denied", "Booking not found.");
  }
  if (orderSnapshot.data().status !== "pending") throw new HttpsError("failed-precondition", "Only pending reservations can be cancelled.");
  await releaseOrder(orderId);
  return { cancelled: true };
});

export const completeDemoOrder = onCall(runtime, async (request) => {
  if (!isEmulator) throw new HttpsError("permission-denied", "Demo checkout is emulator-only.");
  const profile = await requireActiveUser(request.auth);
  const orderId = String(request.data?.orderId || "");
  const orderSnapshot = await db.collection("orders").doc(orderId).get();
  if (!orderSnapshot.exists || orderSnapshot.data().attendeeId !== profile.id) {
    throw new HttpsError("permission-denied", "Booking not found.");
  }
  const result = await fulfillOrder(orderId);
  return { status: result.status };
});

export const releaseExpiredReservations = onSchedule({ schedule: "every 30 minutes", ...runtime }, async () => {
  const expired = await db.collection("orders")
    .where("status", "==", "pending")
    .where("expiresAt", "<=", Timestamp.now())
    .limit(400)
    .get();
  for (const snapshot of expired.docs) {
    await releaseOrder(snapshot.id);
  }
  return null;
});
