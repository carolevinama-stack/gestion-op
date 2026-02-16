import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
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
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E7D32', opacity: 0.3, animation: `pifPulse 1.2s ease infinite ${i * 0.2}s` }} />)}
            </div>
            <p style={{ fontSize: 13, color: '#8A7D6B', marginTop: 16 }}>Chargement des données...</p>
            <style>{`@keyframes pifPulse { 0%,100% { opacity:.3; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }`}</style>
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

  const handleForgotPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/user-not-found') return { success: false, error: 'Aucun compte associé à cet e-mail.' };
      if (error.code === 'auth/invalid-email') return { success: false, error: 'Adresse e-mail invalide.' };
      return { success: false, error: 'Erreur. Veuillez réessayer.' };
    }
  };

  // Auth loading
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F4F1' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E7D32', opacity: 0.3, animation: `pifPulse 1.2s ease infinite ${i * 0.2}s` }} />)}
          </div>
          <div style={{ fontSize: 11, color: '#8A7D6B', letterSpacing: 2, marginTop: 16 }}>Chargement</div>
          <style>{`@keyframes pifPulse { 0%,100% { opacity:.3; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }`}</style>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginPage onLogin={handleLogin} onForgotPassword={handleForgotPassword} error={authError} />;
  }

  // Logged in - wrap in AppProvider
  return (
    <AppProvider user={user}>
      <AppLayout />
    </AppProvider>
  );
}
