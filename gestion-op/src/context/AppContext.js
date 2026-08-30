import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, getDocs, getDoc, setDoc, query, orderBy, onSnapshot, where, or
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// Statuts "non clos" : un OP dans un de ces statuts est encore quelque part dans un
// circuit de validation et doit rester chargé en permanence, quel que soit l'exercice.
// Liste positive (plutôt qu'une exclusion "not-in") car Firestore interdit de combiner
// not-in avec or() dans une même requête — ce qui a fait échouer une première tentative.
const STATUTS_NON_CLOS = ['EN_COURS', 'TRANSMIS_CF', 'VISE_CF', 'DIFFERE_CF', 'REJETE_CF', 'TRANSMIS_AC', 'DIFFERE_AC', 'REJETE_AC', 'PAYE_PARTIEL', 'PAYE', 'ANNULE'];

const AppContext = createContext(null);

// ==================== PERMISSIONS PAR RÔLE ====================
const ROLE_PERMISSIONS = {
  ADMIN: {
    pages: ['dashboard', 'nouvelOp', 'consulterOp', 'ops', 'bordereaux', 'circuitCF', 'circuitAC', 'archives', 'suivi', 'budget', 'beneficiaires', 'parametres', 'admin', 'historique', 'journal'],
    canCreate: true, canEdit: true, canDelete: true, canVisa: true, canPay: true, canArchive: true, canManageUsers: true
  },
  OPERATEUR: {
    pages: ['dashboard', 'nouvelOp', 'consulterOp', 'ops', 'bordereaux', 'circuitCF', 'circuitAC', 'archives', 'suivi', 'budget', 'beneficiaires', 'historique'],
    canCreate: true, canEdit: true, canDelete: true, canVisa: true, canPay: true, canArchive: true, canManageUsers: false
  },
  CONSULTATION: {
    pages: ['dashboard', 'consulterOp', 'ops', 'suivi', 'historique'],
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
  const setCurrentPage = useCallback((page) => {
    setCurrentPageState(page);
    localStorage.setItem('gestion-op-currentPage', page);
  }, []);
  const setHistoriqueParams = useCallback((params) => {
    setHistoriqueParamsState(params);
    localStorage.setItem('gestion-op-historiqueParams', JSON.stringify(params));
  }, []);
  const setActiveBudgetSource = useCallback((sourceId) => {
    setActiveBudgetSourceState(sourceId);
    if (sourceId) {
      localStorage.setItem('gestion-op-activeBudgetSource', sourceId);
    } else {
      localStorage.removeItem('gestion-op-activeBudgetSource');
    }
  }, []);

  // Data state
  const [projet, setProjet] = useState(null);
  const [sources, setSources] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [lignesBudgetaires, setLignesBudgetaires] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [budgets, setBudgets] = useState([]);
  // `ops` combine deux sources : opsLive (chargement temps réel, exercice actif +
  // tout ce qui est encore "en cours" ailleurs) et opsHistorique (exercices clos
  // chargés à la demande via chargerExerciceOps, voir plus bas).
  const [opsLive, setOpsLive] = useState([]);
  const [opsHistorique, setOpsHistorique] = useState([]);
  const exercicesChargeesRef = useRef(new Set());
  const setOps = setOpsLive; // les mises à jour optimistes ciblent toujours des OP "vivants"
  const ops = useMemo(() => {
    if (opsHistorique.length === 0) return opsLive;
    const ids = new Set(opsLive.map(o => o.id));
    const extra = opsHistorique.filter(o => !ids.has(o.id));
    return extra.length ? [...opsLive, ...extra] : opsLive;
  }, [opsLive, opsHistorique]);

  const chargerExerciceOps = useCallback(async (exerciceId) => {
    if (!exerciceId || exercicesChargeesRef.current.has(exerciceId)) return;
    exercicesChargeesRef.current.add(exerciceId);
    try {
      const snap = await getDocs(query(collection(db, 'ops'), where('exerciceId', '==', exerciceId)));
      setOpsHistorique(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
    } catch (e) {
      exercicesChargeesRef.current.delete(exerciceId);
      console.error('Erreur chargement OP historique:', e);
    }
  }, []);
  // Même principe que pour `ops` : les bordereaux se limitent à l'exercice actif,
  // le reste se charge à la demande via chargerExerciceBordereaux. Contrairement aux
  // OP, un bordereau n'a pas de statut "clos" à part entière (juste EN_COURS/ENVOYE),
  // donc il n'y a pas besoin de branche "encore en cours" ici.
  const [bordereauxLive, setBordereauxLive] = useState([]);
  const [bordereauxHistorique, setBordereauxHistorique] = useState([]);
  const exercicesChargeesBTRef = useRef(new Set());
  const setBordereaux = setBordereauxLive;
  const bordereaux = useMemo(() => {
    if (bordereauxHistorique.length === 0) return bordereauxLive;
    const ids = new Set(bordereauxLive.map(b => b.id));
    const extra = bordereauxHistorique.filter(b => !ids.has(b.id));
    return extra.length ? [...bordereauxLive, ...extra] : bordereauxLive;
  }, [bordereauxLive, bordereauxHistorique]);

  const chargerExerciceBordereaux = useCallback(async (exerciceId) => {
    if (!exerciceId || exercicesChargeesBTRef.current.has(exerciceId)) return;
    exercicesChargeesBTRef.current.add(exerciceId);
    try {
      const snap = await getDocs(query(collection(db, 'bordereaux'), where('exerciceId', '==', exerciceId)));
      setBordereauxHistorique(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
    } catch (e) {
      exercicesChargeesBTRef.current.delete(exerciceId);
      console.error('Erreur chargement bordereaux historique:', e);
    }
  }, []);
  
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
          // Aucun profil pour cet utilisateur authentifié : accès minimal par défaut.
          // Seul un ADMIN peut élever ce rôle depuis la page Administration.
          const newProfile = {
            uid: user.uid,
            email: user.email,
            nom: user.email.split('@')[0],
            role: 'CONSULTATION',
            actif: true,
            mustChangePassword: false,
            createdAt: new Date().toISOString(),
            createdBy: 'system'
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setUserProfile(newProfile);
          window.alert("Votre compte n'a pas encore de rôle attribué. Vous avez un accès en consultation seule — contactez un administrateur pour obtenir les droits nécessaires.");
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

  // Permissions calculées (avec rétrocompatibilité anciens rôles)
  const mapRole = (r) => ['SAISIE', 'CF', 'AC'].includes(r) ? 'OPERATEUR' : r;
  const userRole = mapRole(userProfile?.role) || 'CONSULTATION';
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.CONSULTATION;
  const canAccessPage = useCallback((page) => permissions.pages.includes(page), [permissions]);

  // ==================== LOAD DATA ====================
  useEffect(() => {
    if (!user) return;

    // Références pour désinscrire les écouteurs temps réel
    let unsubOps = null;
    let unsubBordereaux = null;

    const loadData = async () => {
      setLoading(true);
      console.log("AppContext: Début chargement des données");
      try {
        // --- CHARGEMENT UNIQUE (PARAMÈTRES) ---
        // Les 6 lectures sont indépendantes : on les lance en parallèle (Promise.all)
        // plutôt qu'en attendant chacune séquentiellement.
        const [projetDoc, sourcesSnap, exercicesSnap, lignesSnap, benSnap, budgetsSnap] = await Promise.all([
          getDoc(doc(db, 'parametres', 'projet')),
          getDocs(collection(db, 'sources')),
          getDocs(query(collection(db, 'exercices'), orderBy('annee', 'desc'))),
          getDocs(collection(db, 'lignesBudgetaires')),
          getDocs(query(collection(db, 'beneficiaires'), orderBy('nom'))),
          getDocs(collection(db, 'budgets'))
        ]);

        if (projetDoc.exists()) setProjet(projetDoc.data());
        setSources(sourcesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setExercices(exercicesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLignesBudgetaires(lignesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setBeneficiaires(benSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setBudgets(budgetsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // --- CHARGEMENT TEMPS RÉEL (onSnapshot) ---
        console.log("AppContext: Accrochage des écouteurs temps réel");

        // Écouteur OPs — se limite à l'exercice actif + tout ce qui est encore "en
        // cours" (non clos) dans n'importe quel exercice + les OP importés historiques,
        // pour éviter de charger indéfiniment tous les OP archivés des années passées.
        // Le reste (exercices clos consultés via "afficher exercice antérieur") est
        // chargé à la demande par chargerExerciceOps.
        const activeExerciceId = exercicesSnap.docs.find(d => d.data().actif)?.id;
        const opsQuery = activeExerciceId
          ? query(collection(db, 'ops'), or(
              where('exerciceId', '==', activeExerciceId),
              where('statut', 'in', STATUTS_NON_CLOS),
              where('importAnterieur', '==', true)
            ))
          : query(collection(db, 'ops'), where('statut', 'in', STATUTS_NON_CLOS));
        unsubOps = onSnapshot(opsQuery, (snapshot) => {
          setOpsLive(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          console.error('Erreur écoute temps réel OPs:', error);
          window.alert("Impossible de recevoir les mises à jour des ordres de paiement en temps réel (session expirée ou permissions insuffisantes). Veuillez recharger la page.");
        });

        // Écouteur Bordereaux — se limite à l'exercice actif (même logique que les OP),
        // le reste est chargé à la demande par chargerExerciceBordereaux. Le tri se fait
        // côté client (et non via orderBy) pour éviter d'exiger un index composite.
        const btQuery = activeExerciceId
          ? query(collection(db, 'bordereaux'), where('exerciceId', '==', activeExerciceId))
          : query(collection(db, 'bordereaux'));
        unsubBordereaux = onSnapshot(btQuery, (snapshot) => {
          console.log(`AppContext: Mise à jour reçue pour Bordereaux (${snapshot.size})`);
          setBordereauxLive(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        }, (error) => {
          console.error('Erreur écoute temps réel Bordereaux:', error);
          window.alert("Impossible de recevoir les mises à jour des bordereaux en temps réel (session expirée ou permissions insuffisantes). Veuillez recharger la page.");
        });

        } catch (error) {
        console.error('Erreur chargement données:', error);
      }
      // --- FIN DE LA FONCTION ASYNCHRONE ---
      // Nous coupons le chargement ICI, une fois que getDocs est fini ET onSnapshot accroché
      console.log("AppContext: Fin du chargement initial");
      setLoading(false);
    };

    loadData();
    
    return () => {
      // Désinscription des écouteurs pour éviter les fuites de mémoire
      if (unsubOps) unsubOps();
      if (unsubBordereaux) unsubBordereaux();
    };
  }, [user]); // Ne redémarre que si l'utilisateur change

  // Computed
  const exerciceActif = exercices.find(e => e.actif);

  // Logout
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('gestion-op-currentPage');
      localStorage.removeItem('gestion-op-historiqueParams');
      localStorage.removeItem('gestion-op-activeBudgetSource');
      setCurrentPageState('dashboard');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  }, []);

  const value = useMemo(() => ({
    // Data
    projet, setProjet,
    sources, setSources,
    exercices, setExercices,
    lignesBudgetaires, setLignesBudgetaires,
    beneficiaires, setBeneficiaires,
    budgets, setBudgets,
    ops, setOps,
    chargerExerciceOps,
    chargerExerciceBordereaux,
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
  }), [
    projet, setProjet,
    sources, setSources,
    exercices, setExercices,
    lignesBudgetaires, setLignesBudgetaires,
    beneficiaires, setBeneficiaires,
    budgets, setBudgets,
    ops, setOps,
    chargerExerciceOps,
    chargerExerciceBordereaux,
    bordereaux, setBordereaux,
    currentPage, setCurrentPage,
    historiqueParams, setHistoriqueParams,
    activeBudgetSource, setActiveBudgetSource,
    consultOpId, setConsultOpId,
    consultOpData, setConsultOpData,
    user, handleLogout,
    userProfile, setUserProfile,
    userRole, permissions, canAccessPage,
    profileLoading,
    isOnline,
    exerciceActif,
    loading,
  ]);

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
