import "dotenv/config";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID || "demo-eventsphere";
const useEmulator = process.argv.includes("--emulator");
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
}
const emulator = useEmulator || Boolean(process.env.FIRESTORE_EMULATOR_HOST);
initializeApp({ ...(emulator ? {} : { credential: applicationDefault() }), projectId });
const db = getFirestore();
const auth = getAuth();

async function ensureAccount(email, password, profile) {
  let account;
  try { account = await auth.getUserByEmail(email); }
  catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    if (!emulator && !password) throw new Error(`Set a seed password for ${email}.`);
    account = await auth.createUser({ email, password: password || "EventSphere123!", displayName: profile.fullName, emailVerified: true });
  }
  await db.collection("users").doc(account.uid).set({
    ...profile,
    email,
    status: "active",
    city: "Manila",
    phone: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return account.uid;
}

const organizerEmail = process.env.SEED_ORGANIZER_EMAIL || "organizer@eventsphere.demo";
const organizerId = await ensureAccount(organizerEmail, process.env.SEED_ORGANIZER_PASSWORD, {
  fullName: "Maya Santos",
  role: "organizer",
});

const adminEmail = process.env.SEED_ADMIN_EMAIL || (emulator ? "admin@eventsphere.demo" : "");
if (adminEmail) {
  await ensureAccount(adminEmail, process.env.SEED_ADMIN_PASSWORD, { fullName: "EventSphere Admin", role: "admin" });
}

function eventDate(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

const events = [
  {
    id: "manila-after-dark",
    title: "Manila After Dark: Night Market",
    category: "Markets",
    summary: "An evening of independent finds, local flavors, and good company under the city lights.",
    description: "Discover a curated night market featuring local makers, small-batch food, live DJs, and plenty of room to meet your neighbors.\n\nCome hungry, bring a tote bag, and stay for the sunset set. Entry includes access to all market stalls and the acoustic live session. Food and purchases are priced separately by vendors.",
    venueName: "The Laneway Creative Space",
    address: "Chino Roces Avenue, Makati",
    city: "Makati",
    lat: 14.5547,
    lng: 121.0254,
    startAt: eventDate(3, 17),
    endAt: eventDate(3, 22),
    capacity: 180,
    priceCentavos: 25000,
    soldCount: 96,
    reservedCount: 0,
    coverImage: "/images/community.jpg",
    status: "published",
  },
  {
    id: "clay-and-cabernet",
    title: "Clay & Cabernet: Pottery Night",
    category: "Arts",
    summary: "Shape a little something, sip something lovely, and meet creative people in the city.",
    description: "A relaxed beginner pottery workshop for curious hands. Our local ceramic artist will guide you through hand-building a small planter or bowl.\n\nAll materials, tools, firing, and a welcome glass of wine or sparkling juice are included. Wear clothes that can get a little messy. Finished pieces can be collected two weeks later.",
    venueName: "Kiln Studio",
    address: "Magiting Street, Quezon City",
    city: "Quezon City",
    lat: 14.6428,
    lng: 121.0565,
    startAt: eventDate(6, 18),
    endAt: eventDate(6, 21),
    capacity: 24,
    priceCentavos: 85000,
    soldCount: 19,
    reservedCount: 0,
    coverImage: "/images/pottery-workshop-v2.jpg",
    status: "published",
  },
  {
    id: "indie-on-the-river",
    title: "Indie on the River",
    category: "Music",
    summary: "Three homegrown bands, one riverside stage, and a soundtrack worth showing up for.",
    description: "An intimate evening of original music from Manila's independent scene. Catch Luntian, The Side Streets, and Mina & the Moons in a beautiful open-air riverside venue.\n\nGates open at 6 PM. Bring a picnic blanket, meet the artists after their sets, and discover your new favorite band.",
    venueName: "Riverbanks Amphitheater",
    address: "Circumferential Road, Pasig",
    city: "Pasig",
    lat: 14.5964,
    lng: 121.0812,
    startAt: eventDate(10, 17),
    endAt: eventDate(10, 22),
    capacity: 300,
    priceCentavos: 45000,
    soldCount: 214,
    reservedCount: 0,
    coverImage: "/images/live-music.jpg",
    status: "published",
  },
  {
    id: "sunday-social-market",
    title: "The Sunday Social Market",
    category: "Food",
    summary: "Slow Sunday energy with Filipino comfort food, fresh coffee, and handmade local goods.",
    description: "Spend your Sunday outdoors with a community of food lovers and independent makers. Expect a thoughtful lineup of Filipino comfort food, specialty coffee, fresh bakes, ceramics, plants, and vintage finds.\n\nEntry is free, with food and goods available to purchase directly from vendors. Well-behaved dogs are welcome.",
    venueName: "Poblacion Courtyard",
    address: "Fermin Street, Makati",
    city: "Makati",
    lat: 14.5587,
    lng: 121.0136,
    startAt: eventDate(2, 10),
    endAt: eventDate(2, 17),
    capacity: 250,
    priceCentavos: 0,
    soldCount: 112,
    reservedCount: 0,
    coverImage: "/images/food-market.jpg",
    status: "published",
  },
  {
    id: "build-with-ai",
    title: "Build with AI: Weekend Workshop",
    category: "Tech",
    summary: "A friendly, hands-on workshop for turning a good idea into a working AI-powered prototype.",
    description: "No advanced coding background needed. In one focused weekend, you will learn how to use modern AI tools, design a useful prototype, and pitch your idea to a room of supportive makers.\n\nBring a laptop and charger. Lunch, snacks, mentorship, and a certificate of completion are included.",
    venueName: "Northbox Innovation Lab",
    address: "28th Street, Taguig",
    city: "Taguig",
    lat: 14.5556,
    lng: 121.0244,
    startAt: eventDate(13, 9),
    endAt: eventDate(14, 17),
    capacity: 60,
    priceCentavos: 120000,
    soldCount: 38,
    reservedCount: 0,
    coverImage: "/images/tech-workshop.jpg",
    status: "published",
  },
  {
    id: "run-for-good",
    title: "Run for Good: Community 5K",
    category: "Wellness",
    summary: "A feel-good morning run that turns every kilometer into support for a local cause.",
    description: "Lace up for a relaxed 5K through the historic streets of Intramuros. Walkers, joggers, and first-time runners are all welcome.\n\nYour entry supports a neighborhood food program. The route includes water stations, a warm-up led by a local running crew, and a post-run breakfast social.",
    venueName: "Baluarte de San Diego",
    address: "Aduana Street, Manila",
    city: "Manila",
    lat: 14.5952,
    lng: 120.9754,
    startAt: eventDate(20, 6),
    endAt: eventDate(20, 10),
    capacity: 150,
    priceCentavos: 35000,
    soldCount: 73,
    reservedCount: 0,
    coverImage: "/images/night-market.jpg",
    status: "published",
  },
];

const batch = db.batch();
for (const event of events) {
  batch.set(db.collection("events").doc(event.id), {
    ...event,
    organizerId,
    organizerName: "Maya Santos",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
await batch.commit();

console.log(`Seeded ${events.length} events in ${projectId}.`);
console.log(`Organizer: ${organizerEmail}${emulator ? " / EventSphere123!" : ""}`);
if (adminEmail) console.log(`Admin: ${adminEmail}${emulator ? " / EventSphere123!" : ""}`);
