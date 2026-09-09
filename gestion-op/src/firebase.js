import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// ==================== MÉMOIRE LOCALE ====================
// La mémoire locale évite de relire toute la base à chaque ouverture de page :
// les écouteurs temps réel repartent de ce qui est déjà stocké dans le
// navigateur et ne demandent au serveur que ce qui a changé depuis.
//
// Elle était activée par enableIndexedDbPersistence, qui ne fonctionne que sur
// UN SEUL onglet : dès qu'une deuxième page de l'application était ouverte, la
// mémoire se désactivait pour tout le monde et chaque rechargement relisait
// l'intégralité des OP. C'est ce qui a fait dépasser le quota gratuit de
// 50 000 lectures par jour le 9 septembre 2026, bloquant les saisies.
//
// persistentMultipleTabManager partage la même mémoire entre tous les onglets :
// plus de désactivation, et une seule copie des données pour tous.
//
// Le cache doit être déclaré à l'initialisation : il ne peut plus être activé
// après un getFirestore(), d'où initializeFirestore ici.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Initialiser Auth
const auth = getAuth(app);

export { db, auth };
