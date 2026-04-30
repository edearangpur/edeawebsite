// Firebase Configuration and Initialization
// File: assets/js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
//import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA85utYXmWE4vvwS0eYHU4dPAiZPUE4zFQ",
  authDomain: "edea-rangpur.firebaseapp.com",
  projectId: "edea-rangpur",
  storageBucket: "edea-rangpur.firebasestorage.app",
  messagingSenderId: "173421061926",
  appId: "1:173421061926:web:acbb99bfaa25d2180103e7",
  measurementId: "G-P0518VHKS9"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase App initialized successfully!");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Generate unique Member ID
export function generateMemberID() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `EDEA${year}${random}`;
}

// Check if user is logged in
export function checkAuthState(callback) {
  auth.onAuthStateChanged(callback);
}

console.log("Firebase services ready!");