// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKajnty6kaDBAHldn-BGu-qja5Jo9R0ks",
  authDomain: "report-867c2.firebaseapp.com",
  databaseURL: "https://report-867c2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "report-867c2",
  storageBucket: "report-867c2.firebasestorage.app",
  messagingSenderId: "911588040639",
  appId: "1:911588040639:web:60b5380acd25ba85c8cb0a",
  measurementId: "G-SFM9W6K1NT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);
export { app };
export default app;