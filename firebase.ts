
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

/**
 * Firebase Configuration for Jewish Workshops CMS
 * These credentials connect the app to the Firestore database, Auth system, and Cloud Storage.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAHCf3xxaA4RtrL6B_eaFHxPsLEhR5i6R8",
  authDomain: "chabad-workshops-cms.firebaseapp.com",
  projectId: "chabad-workshops-cms",
  storageBucket: "chabad-workshops-cms.firebasestorage.app",
  messagingSenderId: "797323812356",
  appId: "1:797323812356:web:f12677921aa497aa605f51"
};

// Initialize Firebase app instance
const app = initializeApp(firebaseConfig);

// Export service instances
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
