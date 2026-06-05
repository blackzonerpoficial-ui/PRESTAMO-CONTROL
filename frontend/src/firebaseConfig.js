// src/firebaseConfig.js
// Firebase configuration for Prestamo Control app
// Replace the placeholder values only if you want to change them.
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCFpIQEw_s0C4iAAYRCTidQ3pi0f4mEiU4",
  authDomain: "prestamos-control-ec9d5.firebaseapp.com",
  projectId: "prestamos-control-ec9d5",
  storageBucket: "prestamos-control-ec9d5.firebasestorage.app",
  messagingSenderId: "208790704387",
  appId: "1:208790704387:web:7c84d6e9ab2fe40a3fd936",
  measurementId: "G-PZ4T2XQK90"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Analytics (optional)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics could not be initialized:", e);
}

// Authentication instance
const auth = getAuth(app);

export { app, analytics, firebaseConfig, auth };
