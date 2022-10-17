import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC2OsKWAmI8pMh9_Ly7eu6KH8TDn-3DGkY",
  authDomain: "vue3-webrtc.firebaseapp.com",
  projectId: "vue3-webrtc",
  storageBucket: "vue3-webrtc.appspot.com",
  messagingSenderId: "879622077137",
  appId: "1:879622077137:web:6bb5a6d289d1c9eb4663f0"
};

const app = firebase.initializeApp(firebaseConfig);

export const firestore = app.firestore();