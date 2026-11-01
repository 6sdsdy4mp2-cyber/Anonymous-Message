// Firebase Web SDK 設定。請從 Firebase Console 的「專案設定 > 一般 > 您的應用程式」複製。
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

export const ADMIN_EMAIL = "jasonlao851@gmail.com";

const firebaseConfig = {
  apiKey: "請替換成你的_API_KEY",
  authDomain: "請替換成你的專案ID.firebaseapp.com",
  databaseURL: "https://請替換成你的專案ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "請替換成你的專案ID",
  storageBucket: "請替換成你的專案ID.firebasestorage.app",
  messagingSenderId: "請替換成你的_SENDER_ID",
  appId: "請替換成你的_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
