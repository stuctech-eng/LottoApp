import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDGz1nAbH5fxYY5halcrd0Dsu3PaM2j9bU",
  authDomain: "lottoclub.firebaseapp.com",
  projectId: "lottoclub",
  storageBucket: "lottoclub.firebasestorage.app",
  messagingSenderId: "455488693325",
  appId: "1:455488693325:web:25798f2fc9901ec3c4a804"
};

// Voorkom dubbele initialisatie tijdens hot-reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functionsInstance = getFunctions(app);
export default app;
