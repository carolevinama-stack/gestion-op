import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const AppContext = createContext(null);

export function AppProvider({ user, children }) {
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
    // Auth
    user, handleLogout,
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
