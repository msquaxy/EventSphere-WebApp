<<<<<<< HEAD
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
=======
# EventSphere

EventSphere is a community events web application for discovering local events, booking tickets, hosting events, and managing check-ins. It includes role-based access for attendees, organizers, and administrators.

## Features

- Email and password registration using Firebase Authentication
- Login, logout, password reset, and persistent Firebase sessions
- Attendee, organizer, and admin roles stored in Firestore
- Protected routes and server-side authorization with Firestore rules and Cloud Functions
- Attendee ticket wallet and booking history
- Organizer event creation, editing, sales overview, and QR-code check-in
- Admin dashboard for managing members, events, and bookings
- PayMongo checkout integration for paid events
- Local Firebase Emulator setup with seeded demonstration data

## Technology Stack

- Frontend: React 18, Vite 5, React Router 6
- Authentication and database: Firebase Authentication and Cloud Firestore
- Backend: Firebase Cloud Functions with the Firebase Admin SDK
- Hosting: Firebase Hosting
- Payments: PayMongo Hosted Checkout
- Maps: Mapbox
- Tickets: QR code generation and ZXing barcode scanning

## Project Structure

```text
EventSphere/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   └── firebase/
│   ├── .env.example
│   └── package.json
├── functions/
│   ├── index.js
│   └── package.json
├── scripts/
│   └── seed.mjs
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── .firebaserc
└── package.json
```

## Prerequisites

- Node.js 22 or newer
- npm
- A Firebase project for live Firebase mode
- Firebase CLI, installed by the root `npm install`
- A PayMongo account only if testing live paid checkout

## Installation

Run these commands from the project root:

```powershell
npm.cmd install
npm.cmd --prefix frontend install
npm.cmd --prefix functions install
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown above. You can also use Command Prompt instead of PowerShell.

## Option A: Run with the Local Firebase Emulator

This option does not require a live Firebase project and is the easiest way to demonstrate the application.

### 1. Configure the frontend

Create `frontend/.env.local` from the example file:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

For emulator mode, use these values:

```env
VITE_FIREBASE_PROJECT_ID=demo-eventsphere
VITE_USE_FIREBASE_EMULATOR=true
```

The Firebase configuration file supplies demo values for the remaining Firebase settings when they are omitted.

### 2. Start the emulators

Run this in the first terminal:

```powershell
npm.cmd run emulators -- --project demo-eventsphere
```

Wait until the Authentication, Firestore, and Functions emulators are ready.

### 3. Seed demonstration data

Run this in a second terminal:

```powershell
npm.cmd run seed:emulator
```

This creates demonstration events, user profiles, and the following accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@eventsphere.demo` | `EventSphere123!` |
| Organizer | `organizer@eventsphere.demo` | `EventSphere123!` |

You can also register a new attendee through the website.

### 4. Start the website

Run this in a third terminal:

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:5173
```

Emulator dashboards are available at:

- Firebase Emulator UI: `http://127.0.0.1:4000`
- Authentication: `http://127.0.0.1:4000/auth`
- Firestore: `http://127.0.0.1:4000/firestore`

Emulator accounts and data are local only. They do not appear in a real Firebase project.

## Option B: Run with a Real Firebase Project

### 1. Create and configure Firebase

1. Create a project in the Firebase Console.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a Cloud Firestore database.
4. Register a Web App and copy its Firebase configuration.

### 2. Configure the frontend

Copy the example environment file if you have not already done so:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

Update `frontend/.env.local` with your Web App settings:

```env
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-web-app-id
VITE_MAPBOX_TOKEN=your-public-mapbox-token
VITE_USE_FIREBASE_EMULATOR=false
VITE_REQUIRE_EMAIL_VERIFICATION=false
```

Restart Vite after changing environment variables.

Do not commit `frontend/.env.local`. It is already excluded by `.gitignore`.

### 3. Select the Firebase project

Update the project IDs in `.firebaserc`, then run:

```powershell
.\node_modules\.bin\firebase.cmd login
.\node_modules\.bin\firebase.cmd use your-project-id
```

### 4. Deploy Firestore rules and indexes

```powershell
npm.cmd run deploy:rules
```

This step is required. Without the deployed rules, Firestore profile reads can fail with `Missing or insufficient permissions`, causing login to redirect back to the login page.

### 5. Create an administrator

Admin access cannot be selected during public registration.

1. Open **Firebase Console → Authentication → Users**.
2. Create or select the administrator account.
3. Copy the account's User UID.
4. Open **Firestore Database → users**.
5. Create or edit the document whose document ID is that UID.
6. Set at least these fields:

| Field | Type | Value |
|---|---|---|
| `fullName` | String | Administrator's full name |
| `email` | String | Administrator's email |
| `role` | String | `admin` |
| `status` | String | `active` |
| `city` | String | `Manila` |
| `phone` | String | Empty string |
| `createdAt` | Timestamp | Current date |
| `updatedAt` | Timestamp | Current date |

Sign out and sign in again after changing the role. The admin console is available at `/admin`.

### 6. Start the website

```powershell
npm.cmd run dev
```

### 7. Deploy Cloud Functions

Cloud Functions are required for checkout, booking cancellation, check-in, and reservation cleanup:

```powershell
npm.cmd run deploy:functions
```

Firebase Cloud Functions deployment may require the project's Blaze billing plan.

For live paid checkout, configure the following server-side values:

- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `APP_ORIGIN`

### 8. Build and deploy hosting

```powershell
npm.cmd run build
.\node_modules\.bin\firebase.cmd deploy --only hosting
```

## Available Scripts

Run these commands from the project root:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production frontend build |
| `npm run emulators` | Start Auth, Firestore, and Functions emulators |
| `npm run seed:emulator` | Seed emulator events and demonstration accounts |
| `npm run seed` | Seed a real Firebase project using Admin SDK credentials |
| `npm run deploy:rules` | Deploy Firestore rules and indexes |
| `npm run deploy:functions` | Deploy Cloud Functions |

On Windows PowerShell, replace `npm` with `npm.cmd` when necessary.

## Authentication and Authorization

- Firebase Authentication manages credentials and securely hashes passwords.
- Firestore stores public profile information in `users/{uid}`.
- A user is considered authenticated by the application only when both the Firebase Auth account and Firestore profile exist.
- `ProtectedRoute` restricts frontend pages by authentication, account status, and role.
- Firestore rules and Cloud Functions independently enforce backend permissions.
- Public registration allows only `attendee` and `organizer` roles.
- Suspended accounts cannot access protected pages or call protected functions.

## Troubleshooting

### Login redirects back to `/login`

Check the browser console for a Firestore permissions error. Then:

1. Deploy the Firestore rules with `npm run deploy:rules`.
2. Confirm that `users/{firebase-auth-uid}` exists.
3. Confirm that the profile has the correct `email`, `role`, and `status: "active"`.
4. Sign out and sign in again.

### Firebase is not configured

Confirm that `frontend/.env.local` exists and contains the required Firebase values. Restart Vite after editing it.

### Registered user is missing from Firebase Authentication

If `VITE_USE_FIREBASE_EMULATOR=true`, the account exists only in the local Auth Emulator. Use real Firebase mode to create an account in the live Firebase project.

### Emulator port is already in use

Stop any old Firebase Emulator or Vite processes, or change the emulator ports in `firebase.json`.

### Password reset email is not received

Confirm that the email exists in Firebase Authentication and that Password Reset is enabled through Firebase Authentication.

## Security Notes

- Never commit `frontend/.env.local`, `functions/.env`, service-account files, passwords, API secrets, or private keys.
- Firebase Web configuration is intended for browser use, but Firestore rules must still be deployed and reviewed.
- Use strong, unique passwords for real administrator and organizer accounts.
- Demonstration credentials are for the local emulator only.
>>>>>>> 361a340ab6677dcc25996924bcab7b8dae6008b4
