import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDZY3CYX2-euGMJXHCzA4JA_4Ik_64GP4M",
  authDomain: "kurakani-90a8d.firebaseapp.com",
  projectId: "kurakani-90a8d",
  storageBucket: "kurakani-90a8d.firebasestorage.app",
  messagingSenderId: "898273082956",
  appId: "1:898273082956:web:1752ed05111dc8d3093ee9",
  measurementId: "G-SMXKDV4RD0"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const getFirebaseMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
    return null;
  } catch (error) {
    console.error("Firebase Messaging not supported", error);
    return null;
  }
};

export { app };
