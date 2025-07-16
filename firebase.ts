// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFQC086kCeV2H0o5wZE0JuaM8-uT1qFgs",
  authDomain: "mahjonglahlahlah.firebaseapp.com",
  projectId: "mahjonglahlahlah",
  storageBucket: "mahjonglahlahlah.firebasestorage.app",
  messagingSenderId: "643699311612",
  appId: "1:643699311612:web:f37767d78fea4502752879",
  measurementId: "G-WTM2HEDZWT"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(
    // If you're using AsyncStorage (most likely in Expo)
    require("@react-native-async-storage/async-storage").default
  )
});

// Initialize Firestore
const db = getFirestore(app);

// Export initialized services (no storage needed)
export { app, auth, db };