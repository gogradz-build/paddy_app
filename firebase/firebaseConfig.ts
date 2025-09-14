import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBTYoku44YFi3htOMhxeSbuDmhd5ieZNc4",
  authDomain: "smartpaddy-2fe6f.firebaseapp.com",
  projectId: "smartpaddy-2fe6f",
  storageBucket: "smartpaddy-2fe6f.firebasestorage.app",
  messagingSenderId: "108498833519",
  appId: "1:108498833519:web:5dc593bec4108b9c6dbd9a",
  measurementId: "G-JC8RTSFQBE"
};


const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const firestore = getFirestore(app);

console.log('Firebase initialized successfully');

export { app, auth, firestore };

