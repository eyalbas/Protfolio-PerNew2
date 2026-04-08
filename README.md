# Portfolio Dashboard with Cloud Firestore + Netlify Proxy

## What this version adds
- Firebase Email/Password sign-in
- Cloud Firestore holdings sync across devices
- Netlify Function proxy for EODHD quotes
- TASE agorot conversion and USD/ILS auto-fetch

## Firebase setup
1. Create a Firebase project.
2. Enable **Authentication** → **Email/Password**.
3. Create **Firestore Database**.
4. In Firebase project settings, copy your **Web App config**.
5. Open `index.html` and replace these placeholders:
   - `PASTE_FIREBASE_API_KEY`
   - `PASTE_PROJECT.firebaseapp.com`
   - `PASTE_PROJECT_ID`
   - `PASTE_PROJECT.appspot.com`
   - `PASTE_SENDER_ID`
   - `PASTE_APP_ID`
6. In Firestore Rules, paste the content from `firestore.rules` and publish.

## Deploy to Netlify
1. Upload all files to a GitHub repo while preserving structure.
2. Import the repo into Netlify.
3. Netlify should detect `netlify.toml`.
4. Deploy.

## Use
1. Open the site.
2. Sign up or sign in.
3. Paste your EODHD API key.
4. Add holdings.
5. Use the same login on another device to see the same holdings.


## Your Firebase config
This package already includes your Firebase web config in index.html. You still need to enable Email/Password in Firebase Authentication and publish the Firestore rules before sign-in and sync will work.


## Fix included
This version fixes quote refresh when the same symbol exists in multiple brokers. The refresh step now updates all matching holdings instead of only the first match.


## UI change
This version removes the Load demo button and demo-data insertion logic from the interface.


## Header text change
This version replaces the technical Firebase subtitle with a simpler portfolio subtitle in the page header.


## Broker color fix
This version adds deterministic broker colors based on broker name so brokers such as IBKR and Blink render with stable distinct accent colors.


## Twelve Data test version
This version swaps the Netlify quote function from EODHD to Twelve Data for initial portfolio refresh testing, including a USD/ILS fallback that inverts ILS/USD when needed.
