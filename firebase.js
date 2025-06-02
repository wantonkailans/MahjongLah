import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDabtH7TdXn5VZEw78YhWG3a9jwzpI5-Q8",
  authDomain: "mahjonglah-3578b.firebaseapp.com",
  projectId: "mahjonglah-3578b",
  storageBucket: "mahjonglah-3578b.appspot.com",
  messagingSenderId: "1088969242730",
  appId: "1:1088969242730:web:55063706d641b8ed27b213",
  measurementId: "G-333ECQVTLM"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIRESTORE_DB = getFirestore(FIREBASE_APP);

