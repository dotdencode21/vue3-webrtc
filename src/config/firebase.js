import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const firebaseConfig = {
  // firebase config
};

const app = firebase.initializeApp(firebaseConfig);

export const firestore = app.firestore();