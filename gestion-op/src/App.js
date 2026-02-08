import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

import { AppProvider, useAppContext } from './context/AppContext';
import { styles } from './utils/styles';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';

// Pages - chargement conditionnel pour diagnostic
import PageDashboard from './pages/PageDashboard';
import PageParametres from './pages/PageParametres';
import PageBeneficiaires from './pages/PageBeneficiaires';
import PageBudget from './pages/PageBudget';import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

import { AppProvider, useAppContext } from './context/AppContext';
import { styles } from './utils/styles';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';

// Pages - chargement conditionnel pour diagnostic
import PageDashboard from './pages/PageDashboard';
import PageParametres from './pages/PageParametres';
import PageBeneficiaires from './pages/PageBeneficiaires';
import PageBudget from './pages/PageBudget';
import PageHistoriqueBudget from './pages/PageHistoriqueBudget';
import PageEnConstruction from './pages/PageEnConstruction';

// === PAGES MODIFIEES - COMMENTEES POUR TEST ===
// import PageNouvelOp from './pages/PageNouvelOp';
// import PageConsulterOp from './pages/PageConsulterOp';
// import PageListeOP from './pages/PageListeOP';
// import PageBordereaux from './pages/PageBordereaux';

function AppContent() {
  const { currentPage, setCurrentPage, loading } = useAppContext();

  // Forcer dashboard au chargement pour éviter les pages cassées
  useEffect(() => {
    const pagesValides = ['dashboard', 'parametres', 'beneficiaires', 'budget', 'historique'];
    if (!pagesValides.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <main style={styles.main}>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>⏳</div>
            <p>Chargement...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      <Sidebar />
      <main style={styles.main}>
        {currentPage === 'dashboard' && <PageDashboard />}
        {currentPage === 'parametres' && <PageParametres />}
        {currentPage === 'beneficiaires' && <PageBeneficiaires />}
        {currentPage === 'budget' && <PageBudget />}
        {currentPage === 'historique' && <PageHistoriqueBudget />}
        {/* PAGES DESACTIVEES POUR TEST */}
        {currentPage === 'ops' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Liste OP - en maintenance</h2></div>}
        {currentPage === 'nouvelOp' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Nouvel OP - en maintenance</h2></div>}
        {currentPage === 'consulterOp' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Consulter OP - en maintenance</h2></div>}
        {currentPage === 'bordereaux' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Bordereaux - en maintenance</h2></div>}
        {currentPage === 'suivi' && <PageEnConstruction title="Suivi Circuit" icon="🔄" />}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      setAuthError('');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/invalid-credential') setAuthError('Email ou mot de passe incorrect');
      else if (error.code === 'auth/too-many-requests') setAuthError('Trop de tentatives.');
      else setAuthError('Erreur de connexion.');
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f4c3a' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>🌳</div>
          <div>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} error={authError} />;

  return (
    <AppProvider user={user}>
      <AppContent />
    </AppProvider>
  );
}

import PageHistoriqueBudget from './pages/PageHistoriqueBudget';
import PageEnConstruction from './pages/PageEnConstruction';

// === PAGES MODIFIEES - COMMENTEES POUR TEST ===
// import PageNouvelOp from './pages/PageNouvelOp';
// import PageConsulterOp from './pages/PageConsulterOp';
// import PageListeOP from './pages/PageListeOP';
// import PageBordereaux from './pages/PageBordereaux';

function AppContent() {
  const { currentPage, setCurrentPage, loading } = useAppContext();

  // Forcer dashboard au chargement pour éviter les pages cassées
  useEffect(() => {
    const pagesValides = ['dashboard', 'parametres', 'beneficiaires', 'budget', 'historique'];
    if (!pagesValides.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <main style={styles.main}>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>⏳</div>
            <p>Chargement...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      <Sidebar />
      <main style={styles.main}>
        {currentPage === 'dashboard' && <PageDashboard />}
        {currentPage === 'parametres' && <PageParametres />}
        {currentPage === 'beneficiaires' && <PageBeneficiaires />}
        {currentPage === 'budget' && <PageBudget />}
        {currentPage === 'historique' && <PageHistoriqueBudget />}
        {/* PAGES DESACTIVEES POUR TEST */}
        {currentPage === 'ops' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Liste OP - en maintenance</h2></div>}
        {currentPage === 'nouvelOp' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Nouvel OP - en maintenance</h2></div>}
        {currentPage === 'consulterOp' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Consulter OP - en maintenance</h2></div>}
        {currentPage === 'bordereaux' && <div style={{ padding: 40, textAlign: 'center' }}><h2>Page Bordereaux - en maintenance</h2></div>}
        {currentPage === 'suivi' && <PageEnConstruction title="Suivi Circuit" icon="🔄" />}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      setAuthError('');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/invalid-credential') setAuthError('Email ou mot de passe incorrect');
      else if (error.code === 'auth/too-many-requests') setAuthError('Trop de tentatives.');
      else setAuthError('Erreur de connexion.');
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f4c3a' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>🌳</div>
          <div>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} error={authError} />;

  return (
    <AppProvider user={user}>
      <AppContent />
    </AppProvider>
  );
}
