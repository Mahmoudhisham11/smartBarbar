// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore} from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqMxeFdns0hikFfyCoUfgxf4zqgBS75U0",
  authDomain: "smartbarbar-b28f2.firebaseapp.com",
  projectId: "smartbarbar-b28f2",
  storageBucket: "smartbarbar-b28f2.firebasestorage.app",
  messagingSenderId: "269036618921",
  appId: "1:269036618921:web:6b0088e1dc00d14d6115b8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app)