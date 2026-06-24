import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgN_GOhhl_O9poq6olgI9BbH3YbvhizKM",
  authDomain: "fmk-elviaheredia-2c0d3.firebaseapp.com",
  projectId: "fmk-elviaheredia-2c0d3",
  storageBucket: "fmk-elviaheredia-2c0d3.firebasestorage.app",
  messagingSenderId: "304112930620",
  appId: "1:304112930620:web:6bffba96376687304e1839"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
