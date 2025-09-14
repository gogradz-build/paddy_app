import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "abcd",
  authDomain: "smartpaddy-.firebaseapp.com",
  projectId: "smartpaddy-2fe6f",
  storageBucket: "-.firebasestorage.app",
  messagingSenderId: "",
  appId: "1:108498833519:web:",
  measurementId: "G-"
};


const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const firestore = getFirestore(app);

console.log('Firebase initialized successfully');

export { app, auth, firestore };

