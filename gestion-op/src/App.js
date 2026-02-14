import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { AppProvider, useAppContext } from './context/AppContext';
import { styles } from './utils/styles';

// Pages
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import PageDashboard from './pages/PageDashboard';
import PageParametres from './pages/PageParametres';
import PageBeneficiaires from './pages/PageBeneficiaires';
import PageBudget from './pages/PageBudget';
import PageHistoriqueBudget from './pages/PageHistoriqueBudget';
import PageNouvelOp from './pages/PageNouvelOp';
import PageConsulterOp from './pages/PageConsulterOp';
import PageBordereaux from './pages/PageBordereaux';
import PageListeOP from './pages/PageListeOP';
import PageRapport from './pages/PageRapport';
import PageEnConstruction from './pages/PageEnConstruction';
import PageAdmin from './pages/PageAdmin';

// ==================== MAIN LAYOUT ====================
function AppLayout() {
  const { currentPage, loading } = useAppContext();

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <main style={styles.main}>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>⏳</div>
            <p>Chargement des données...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Style global pour cacher les spinners des inputs numériques */}
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <Sidebar />
      <main style={styles.main}>
        {currentPage === 'dashboard' && <PageDashboard />}
        {currentPage === 'parametres' && <PageParametres />}
        {currentPage === 'beneficiaires' && <PageBeneficiaires />}
        {currentPage === 'budget' && <PageBudget />}
        {currentPage === 'historique' && <PageHistoriqueBudget />}
        {currentPage === 'ops' && <PageListeOP />}
        {currentPage === 'nouvelOp' && <PageNouvelOp />}
        {currentPage === 'consulterOp' && <PageConsulterOp />}
        {currentPage === 'bordereaux' && <PageBordereaux />}
        {currentPage === 'suivi' && <PageRapport />}
        {currentPage === 'admin' && <PageAdmin />}
      </main>
    </div>
  );
}

// ==================== APP (AUTH WRAPPER) ====================
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
      console.error('Erreur de connexion:', error);
      if (error.code === 'auth/invalid-credential') {
        setAuthError('Email ou mot de passe incorrect');
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError('Trop de tentatives. Veuillez réessayer plus tard.');
      } else {
        setAuthError('Erreur de connexion. Veuillez réessayer.');
      }
    }
  };

  // Auth loading
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

  // Not logged in
  if (!user) {
    return <LoginPage onLogin={handleLogin} error={authError} />;
  }

  // Logged in - wrap in AppProvider
  return (
    <AppProvider user={user}>
      <AppLayout />
    </AppProvider>
  );
}
