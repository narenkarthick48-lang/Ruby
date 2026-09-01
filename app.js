/* =========================================================
   ZUZII — APP.JS
   Firebase Authentication + Firestore Chat
   ========================================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   1. FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBv30wRnc9CJAo0mFQF_7nAXuytZyurfkk",
  authDomain: "ruba-34782.firebaseapp.com",
  projectId: "ruba-34782",
  storageBucket: "ruba-34782.firebasestorage.app",
  messagingSenderId: "916875849283",
  appId: "1:916875849283:web:79bd7170ade790527eeef6",
  measurementId: "G-YY47Z8PCXQ"
};


/* =========================================================
   2. INITIALIZE FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================================
   3. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentChatUser = null;
let currentChatId = null;

let unsubscribeMessages = null;
let unsubscribeChats = null;

let typingTimeout = null;


/* =========================================================
   4. DOM HELPER
   ========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   5. UI HELPERS
   ========================================================= */

function toast(message) {

  const box = $("toast");
  const text = $("toastMessage");

  if (!box || !text) return;

 
