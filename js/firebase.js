// Firebase Web SDK 設定
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

export const ADMIN_EMAIL = "jasonlao851@gmail.com";

const firebaseConfig = {
  apiKey: "AIzaSyAlyEEWrZJB1Ke1swoEhK5wWKermIdKAzU",
  authDomain: "ig-anonymous-message-box.firebaseapp.com",
  databaseURL: "https://ig-anonymous-message-box-default-rtdb.firebaseio.com",
  projectId: "ig-anonymous-message-box",
  storageBucket: "ig-anonymous-message-box.firebasestorage.app",
  messagingSenderId: "839550094578",
  appId: "1:839550094578:web:4e0d89c7e955b8c999d46b",
  measurementId: "G-Y401XZT38M"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
