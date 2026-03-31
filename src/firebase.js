import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAnQr47C_G7wHP3lB-Ixx87N_hySQJtsyk",
  authDomain: "flotecfield.firebaseapp.com",
  projectId: "flotecfield",
  storageBucket: "flotecfield.firebasestorage.app",
  messagingSenderId: "736652675196",
  appId: "1:736652675196:web:2f3fab3756e290515a61f9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
