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
import PageLignesBudgetaires from './pages/PageLignesBudgetaires';
import PageNouvelOp from './pages/PageNouvelOp';
import PageConsulterOp from './pages/PageConsulterOp';
import PageCircuitCF from './pages/PageCircuitCF';
import PageCircuitAC from './pages/PageCircuitAC';
import PageArchives from './pages/PageArchives';
import PageListeOP from './pages/PageListeOP';
import PageRapport from './pages/PageRapport';
import PageAdmin from './pages/PageAdmin';

// ==================== COMPOSANT DE CHARGEMENT UNIQUE ====================
// On crée un composant réutilisable pour garantir que le design est strictement le même
const LoaderPIF = ({ label }) => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100vh', 
    width: '100vw', 
    background: '#F7F5F2',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999
  }}>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ 
          width: 10, 
          height: 10, 
          borderRadius: '50%', 
          background: '#2E9940', 
          opacity: 0.3, 
          animation: `pifPulse 1.2s ease infinite ${i * 0.2}s` 
        }} />
      ))}
    </div>
    <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginTop: 18, fontWeight: 600, textTransform: 'uppercase' }}>
      {label}
    </div>
    <style>{`@keyframes pifPulse { 0%,100% { opacity:.3; transform:scale(1); } 50% { opacity:1; transform:scale(1.4); } }`}</style>
  </div>
);

function AppLayout() {
  const { currentPage, loading } = useAppContext();

  // Second chargement (données) : strictement identique au premier
  if (loading) return <LoaderPIF label="Chargement des données..." />;

  return (
    <div style={{ ...styles.container, minHeight: '100vh', width: '100vw', margin: 0, padding: 0 }}>
      <style>{`
        body { margin: 0; padding: 0; overflow-x: hidden; }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      <Sidebar />
      <main style={{ ...styles.main, flex: 1 }}>
        {currentPage === 'dashboard' && <PageDashboard />}
        {currentPage === 'parametres' && <PageParametres />}
        {currentPage === 'beneficiaires' && <PageBeneficiaires />}
        {currentPage === 'budget' && <PageBudget />}
        {currentPage === 'historique' && <PageHistoriqueBudget />}
        {currentPage === 'lignes' && <PageLignesBudgetaires />}
        {currentPage === 'ops' && <PageListeOP />}
        {currentPage === 'nouvelOp' && <PageNouvelOp />}
        {currentPage === 'consulterOp' && <PageConsulterOp />}
        {currentPage === 'circuitCF' && <PageCircuitCF />}
        {currentPage === 'circuitAC' && <PageCircuitAC />}
        {currentPage === 'archives' && <PageArchives />}
        {currentPage === 'suivi' && <PageRapport />}
        {currentPage === 'admin' && <PageAdmin />}
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
      setAuthError('Email ou mot de passe incorrect');
    }
  };

  // Premier chargement (authentification)
  if (authLoading) return <LoaderPIF label="Connexion au système..." />;

  if (!user) return <LoginPage onLogin={handleLogin} error={authError} />;

  return (
    <AppProvider user={user}>
      <AppLayout />
    </AppProvider>
  );
}
