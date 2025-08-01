// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth'; // Keep imports for potential later use
import { getFirestore } from 'firebase/firestore';

// Global variables provided by the Canvas environment for Firebase configuration
// These will be automatically populated by the Canvas runtime.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = {
  apiKey: "AIzaSyDK3DhVSjy2cAPoU97hu04VApgn7yq_6Ss",
  authDomain: "studyflow-navigator.firebaseapp.com",
  projectId: "studyflow-navigator",
  storageBucket: "studyflow-navigator.firebasestorage.app",
  messagingSenderId: "578680822948",
  appId: "1:578680822948:web:a5eb4adc22f7a7a982da31",
  measurementId: "G-GSFWH38KRT"
};
// initialAuthToken is still available but not used for automatic sign-in here
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Get Firebase services instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// The initializeAuth function now only sets up the Firebase instances.
// It no longer performs automatic anonymous or custom token sign-in.
// The App.jsx component will handle showing the AuthModal if no user is logged in.
export const initializeAuth = () => {
  console.log("Firebase services initialized.");
  // No automatic sign-in here. App.jsx's onAuthStateChanged will handle user state.
};