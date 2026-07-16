const firebaseConfig = {
  apiKey: "AIzaSyAjPJFT1abNvZf7GWUYk3rAVQHTSAC-mSw",
  authDomain: "samosamanvt.com",
  projectId: "samosaman-6895e",
  storageBucket: "samosaman-6895e.firebasestorage.app",
  messagingSenderId: "315563373437",
  appId: "1:315563373437:web:57b7d97e5d48c5578d9214",
  measurementId: "G-PB6QFY8Z8D"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}
