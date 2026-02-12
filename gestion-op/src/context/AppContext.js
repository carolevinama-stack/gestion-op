import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const AppContext = createContext(null);

// ==================== PERMISSIONS PAR RÔLE ====================
const ROLE_PERMISSIONS = {
  ADMIN: {
    pages: ['dashboard', 'nouvelOp', 'consulterOp', 'ops', 'bordereaux', 'suivi', 'budget', 'beneficiaires', 'parametres', 'admin', 'historique'],
    canCreate: true, canEdit: true, canDelete: true, canVisa: true, canPay: true, canArchive: true, canManageUsers: true
  },
  SAISIE: {
    pages: ['dashboard', 'nouvelOp', 'consulterOp', 'ops', 'bordereaux', 'budget', 'beneficiaires', 'historique'],
    canCreate: true, canEdit: true, canDelete: true, canVisa: false, canPay: false, canArchive: false, canManageUsers: false
  },
  CF: {
    pages: ['dashboard', 'consulterOp', 'ops', 'bordereaux', 'budget', 'historique'],
    canCreate: false, canEdit: false, canDelete: false, canVisa: true, canPay: false, canArchive: false, canManageUsers: false
  },
  AC: {
    pages: ['dashboard', 'consulterOp', 'ops', 'bordereaux', 'budget', 'historique'],
    canCreate: false, canEdit: false, canDelete: false, canVisa: false, canPay: true, canArchive: true, canManageUsers: false
  },
  CONSULTATION: {
    pages: ['dashboard', 'consulterOp', 'ops', 'bordereaux', 'budget', 'historique'],
    canCreate: false, canEdit: false, canDelete: false, canVisa: false, canPay: false, canArchive: false, canManageUsers: false
  }
};

export function AppProvider({ user, children }) {
  // User profile (role, nom...)
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  // Navigation - avec persistance localStorage
  const [currentPage, setCurrentPageState] = useState(() => {
    const saved = localStorage.getItem('gestion-op-currentPage');
    return saved || 'dashboard';
  });
  const [historiqueParams, setHistoriqueParamsState] = useState(() => {
    const saved = localStorage.getItem('gestion-op-historiqueParams');
    return saved ? JSON.parse(saved) : { sourceId: null, exerciceId: null };
  });
  const [activeBudgetSource, setActiveBudgetSourceState] = useState(() => {
    const saved = localStorage.getItem('gestion-op-activeBudgetSource');
    return saved || null;
  });
  const [consultOpId, setConsultOpId] = useState(null);
  const [consultOpData, setConsultOpData] = useState(null);

  // Wrappers pour sauvegarder dans localStorage
  const setCurrentPage = (page) => {
    setCurrentPageState(page);
    localStorage.setItem('gestion-op-currentPage', page);
  };
  const setHistoriqueParams = (params) => {
    setHistoriqueParamsState(params);
    localStorage.setItem('gestion-op-historiqueParams', JSON.stringify(params));
  };
  const setActiveBudgetSource = (sourceId) => {
    setActiveBudgetSourceState(sourceId);
    if (sourceId) {
      localStorage.setItem('gestion-op-activeBudgetSource', sourceId);
    } else {
      localStorage.removeItem('gestion-op-activeBudgetSource');
    }
  };

  // Data state
  const [projet, setProjet] = useState(null);
  const [sources, setSources] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [lignesBudgetaires, setLignesBudgetaires] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [ops, setOps] = useState([]);
  const [bordereaux, setBordereaux] = useState([]);
  
  // Loading
  const [loading, setLoading] = useState(true);

  // Connectivité
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==================== LOAD USER PROFILE ====================
  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    
    const loadProfile = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        } else {
          // Premier utilisateur (admin bootstrap) - créer un profil ADMIN automatiquement
          const newProfile = {
            uid: user.uid,
            email: user.email,
            nom: user.email.split('@')[0],
            role: 'ADMIN',
            actif: true,
            mustChangePassword: false,
            createdAt: new Date().toISOString(),
            createdBy: 'system'
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setUserProfile(newProfile);
        }
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        // Profil par défaut en cas d'erreur réseau (mode consultation)
        setUserProfile({ uid: user.uid, email: user.email, nom: user.email, role: 'CONSULTATION', actif: true });
      }
      setProfileLoading(false);
    };
    
    loadProfile();
  }, [user]);

  // Permissions calculées
  const userRole = userProfile?.role || 'CONSULTATION';
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.CONSULTATION;
  const canAccessPage = (page) => permissions.pages.includes(page);

  // ==================== LOAD DATA ====================
  useEffect(() => {
    if (!user) return;

    let unsubOps = null;
    let unsubBordereaux = null;

    const loadData = async () => {
      setLoading(true);
      try {
        const projetDoc = await getDoc(doc(db, 'parametres', 'projet'));
        if (projetDoc.exists()) setProjet(projetDoc.data());

        const sourcesSnap = await getDocs(collection(db, 'sources'));
        setSources(sourcesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const exercicesSnap = await getDocs(query(collection(db, 'exercices'), orderBy('annee', 'desc')));
        setExercices(exercicesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const lignesSnap = await getDocs(collection(db, 'lignesBudgetaires'));
        setLignesBudgetaires(lignesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const benSnap = await getDocs(query(collection(db, 'beneficiaires'), orderBy('nom')));
        setBeneficiaires(benSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const budgetsSnap = await getDocs(collection(db, 'budgets'));
        setBudgets(budgetsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const opsQuery = query(collection(db, 'ops'), orderBy('numero', 'desc'));
        unsubOps = onSnapshot(opsQuery, (snapshot) => {
          setOps(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const btQuery = query(collection(db, 'bordereaux'), orderBy('createdAt', 'desc'));
        unsubBordereaux = onSnapshot(btQuery, (snapshot) => {
          setBordereaux(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      } catch (error) {
        console.error('Erreur chargement données:', error);
      }
      setLoading(false);
    };

    loadData();
    
    return () => {
      if (unsubOps) unsubOps();
      if (unsubBordereaux) unsubBordereaux();
    };
  }, [user]);

  // Computed
  const exerciceActif = exercices.find(e => e.actif);

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('gestion-op-currentPage');
      localStorage.removeItem('gestion-op-historiqueParams');
      localStorage.removeItem('gestion-op-activeBudgetSource');
      setCurrentPageState('dashboard');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const value = {
    // Data
    projet, setProjet,
    sources, setSources,
    exercices, setExercices,
    lignesBudgetaires, setLignesBudgetaires,
    beneficiaires, setBeneficiaires,
    budgets, setBudgets,
    ops, setOps,
    bordereaux, setBordereaux,
    // Navigation
    currentPage, setCurrentPage,
    historiqueParams, setHistoriqueParams,
    activeBudgetSource, setActiveBudgetSource,
    consultOpId, setConsultOpId,
    consultOpData, setConsultOpData,
    // Auth & Profil
    user, handleLogout,
    userProfile, setUserProfile,
    userRole, permissions, canAccessPage,
    profileLoading,
    // Connectivité
    isOnline,
    // Computed
    exerciceActif,
    // Loading
    loading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
