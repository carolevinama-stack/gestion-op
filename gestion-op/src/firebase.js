import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA-n4uJlbrTKPuSUhbdxf6GGGtfNLr7JxE",
  authDomain: "gestion-op.firebaseapp.com",
  projectId: "gestion-op",
  storageBucket: "gestion-op.firebasestorage.app",
  messagingSenderId: "747591673844",
  appId: "1:747591673844:web:370c38e3783a7703aa3ba1"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore
const db = getFirestore(app);

// Activer la persistance hors ligne
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Persistance impossible: plusieurs onglets ouverts');
  } else if (err.code === 'unimplemented') {
    console.log('Persistance non supportée par ce navigateur');
  }
});

// Initialiser Auth
const auth = getAuth(app);

export { db, auth };
