# EventSphere Mobile

React Native (Expo) app for the EventSphere web app. It uses the **same Firebase project** as the
website (Authentication, Cloud Firestore and the Cloud Functions), so:

- existing web accounts log in with the same email and password,
- events, bookings, tickets and saved events are shared with the website in real time,
- booking, cancelling and QR check-in go through the same Cloud Functions.

## Features

- **Everyone:** browse and search events, filter by category, city, date or distance; event details; save events;
  log in, register, forgot password.
- **Attendees:** book tickets (free events and PayMongo checkout), ticket wallet with QR passes, booking history,
  cancel pending reservations, edit profile.
- **Organizers (and admins):** studio with revenue and sales, create/edit/publish events, QR-scan check-in
  (camera or manual code) with guest list.
- Not included: the admin console (members/events/bookings management) and the map view, which stay on the website.

## Setup

1. `npm install`
2. `cp .env.example .env` and fill in the Firebase **web app** settings (Firebase Console -> Project settings ->
   Your apps). They are the same values as `VITE_FIREBASE_*` in the website's `frontend/.env.local`.
3. `npx expo start`, then scan the QR code with **Expo Go** (Android/iOS) or press `a` / `i` for an emulator.

Restart Expo after changing `.env` (`npx expo start -c`).

## Important: backend setting for bookings

The `createCheckoutSession` function builds its return URL from `APP_ORIGIN`, or, if that isn't set, from the
request's `Origin` header, which mobile apps don't send. Make sure `APP_ORIGIN` (your https website URL) is set
for the deployed functions, as the website README already asks for paid checkout. Otherwise booking from the app
fails with "Set APP_ORIGIN to your secure website URL." Browsing, login and everything else are unaffected.

Paid checkout opens PayMongo in an in-app browser. The booking is confirmed by the existing PayMongo webhook and the
app shows the confirmed QR tickets automatically when it arrives.

## Local emulator mode (optional)

Run the website's emulators and seed (`npm run emulators`, `npm run seed:emulator`), then set
`EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` and `EXPO_PUBLIC_EMULATOR_HOST` to your computer's LAN IP
(`10.0.2.2` on the Android emulator). Demo accounts from the website README work here too.

## Building installable apps

```
npm install -g eas-cli
eas build --platform android   # or ios
```

## Scripts

`npm run typecheck`, `npm run bundle` (verifies the Android bundle builds).
