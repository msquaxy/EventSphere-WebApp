export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (typeof value === "object" && "seconds" in value) return new Date(value.seconds * 1000);
  return new Date(value);
}

export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "Date to be announced";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMoney(centavos = 0) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  }).format(centavos / 100);
}

export function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const messages = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/user-not-found": "The email or password is incorrect.",
    "auth/weak-password": "Choose a password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Cannot connect to Firebase. Check your internet connection.",
    "storage/unauthorized": "You do not have permission to upload this image.",
    "storage/retry-limit-exceeded": "The upload took too long. Please try again.",
  };
  return messages[error?.code] || error?.message?.replace(/^Firebase:\s*/i, "") || fallback;
}

export function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371;
  const latitudeDistance = toRadians(b.lat - a.lat);
  const longitudeDistance = toRadians(b.lng - a.lng);
  const value = Math.sin(latitudeDistance / 2) ** 2
    + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(longitudeDistance / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function classNames(...values) {
  return values.filter(Boolean).join(" ");
}
