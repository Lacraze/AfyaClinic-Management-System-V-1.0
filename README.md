# AfyaClinic Management System

A comprehensive, production-ready clinic management system built with React, TypeScript, and Firebase.

## Features

- **Role-Based Access Control**: Secure login for Admin, Doctors, Nurses, Receptionists, Pharmacists, and Accountants.
- **Patient Management**: Registration, search, and detailed clinical history.
- **Clinical Workflow**: Appointment scheduling, triage/vitals recording, and doctor encounter notes.
- **Pharmacy & Inventory**: Drug catalog, stock tracking, and automated prescription dispensing.
- **Billing & Payments**: Invoice generation and payment tracking (Cash, M-Pesa, Card, Insurance).
- **Staff & HR**: Staff profiles and attendance logging.
- **Utilities**: Tracking of monthly bills like electricity, water, and rent.
- **Analytics**: Dashboards and reports for revenue and patient volume.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Authentication & Firestore)
- **Icons**: Lucide React
- **Animations**: Motion

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Firebase project

### Configuration

1.  Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Authentication** (Email/Password) and **Cloud Firestore**.
3.  Copy your Firebase configuration and save it as `firebase-applet-config.json` in the root directory:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_STORAGE_BUCKET",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

### Local Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Deployment to Netlify

1.  Push the code to a GitHub repository.
2.  Connect the repository to Netlify.
3.  Set the following build settings:
    - **Build command**: `npm run build`
    - **Publish directory**: `dist`
4.  **SPA Support**: The app includes a `public/_redirects` file which is essential for Netlify to handle client-side routing correctly. This ensures that refreshing a page like `/patients` or `/signup` doesn't result in a 404 error.
5.  **Environment Variables**: Add your Firebase configuration as environment variables in the Netlify dashboard if you prefer not to use the `firebase-applet-config.json` file.

## Security

The system uses Firestore Security Rules to enforce role-based access. The first admin is bootstrapped using the email `klacraze@gmail.com`. Once logged in, this user can manage other staff members and their roles.

## License

Apache-2.0
