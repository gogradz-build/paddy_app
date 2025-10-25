import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTHDOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASURMENT_ID,
};

// Validate configuration
if (!firebaseConfig.apiKey) {
  throw new Error('Firebase API key is missing. Check your .env file.');
}

const app = initializeApp(firebaseConfig);

// Initialize Auth - persistence is handled automatically in React Native
const auth = getAuth(app);

// Initialize Firestore
const firestore = getFirestore(app);
const db = firestore; // Alias for convenience

console.log('Firebase initialized successfully');

export { app, auth, db, firestore };
