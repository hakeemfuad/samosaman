if (!window.APP_CONFIG) {
  document.write('<script src="js/app-config.js"><\/script>');
}

const firebaseConfig = window.APP_CONFIG?.firebase;

if (!firebaseConfig) {
  throw new Error(
    'Missing Firebase config. Create public/js/app-config.js from public/js/app-config.example.js.'
  );
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

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
