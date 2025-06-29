// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFQC086kCeV2H0o5wZE0JuaM8-uT1qFgs",
  authDomain: "mahjonglahlahlah.firebaseapp.com",
  projectId: "mahjonglahlahlah",
  storageBucket: "mahjonglahlahlah.firebasestorage.app",
  messagingSenderId: "643699311612",
  appId: "1:643699311612:web:f37767d78fea4502752879",
  measurementId: "G-WTM2HEDZWT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// For compatibility with existing code
export const FIREBASE_AUTH = auth;

export default app;