// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCcaCjSplEBNjxbzZCsfCjf0gcPKWXiElc",
  authDomain: "qr-attendance-system-e185a.firebaseapp.com",
  projectId: "qr-attendance-system-e185a",
  storageBucket: "qr-attendance-system-e185a.firebasestorage.app",
  messagingSenderId: "1035825378247",
  appId: "1:1035825378247:web:b7c8762be03273dd47dfe2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
