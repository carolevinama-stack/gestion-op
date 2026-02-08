import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

import { AppProvider, useAppContext } from './context/AppContext';
import { styles } from './utils/styles';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';

// Pages
import PageDashboard from './pages/PageDashboard';
import PageParametres from './pages/PageParametres';
import PageBeneficiaires from './pages/PageBeneficiaires';
import PageBudget from './pages/PageBudget';
import PageHistoriqueBudget from './pages/PageHistoriqueBudget';
import PageNouvelOp from './pages/PageNouvelOp';
import PageConsulterOp from './pages/PageConsulterOp';
import PageBordereaux from './pages/PageBordereaux';
import PageListeOP from './pages/PageListeOP';
import PageEnConstruction from './pages/PageEnConstruction';

// ==================== DIAGNOSTIC ====================
// Vérification des imports
const IMPORTS_CHECK = {
  PageDashboard: typeof PageDashboard,
  PageParametres: typeof PageParametres,
  PageBeneficiaires: typeof PageBeneficiaires,
  PageBudget: typeof PageBudget,
  PageHistoriqueBudget: typeof PageHistoriqueBudget,
  PageNouvelOp: typeof PageNouvelOp,
  PageConsulterOp: typeof PageConsulterOp,
  PageBordereaux: typeof PageBordereaux,
  PageListeOP: typeof PageListeOP,
  PageEnConstruction: typeof PageEnConstruction,
  Sidebar: typeof Sidebar,
  LoginPage: typeof LoginPage,
};

console.log('=== DIAGNOSTIC IMPORTS ===');
Object.entries(IMPORTS_CHECK).forEach(([name, type]) => {
  if (type === 'undefined') {
    console.error('UNDEFINED IMPORT:', name);
  } else {
    console.log('OK:', name, '=', type);
  }
});

// ==================== ERROR BOUNDARY ====================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, maxWidth: 800, margin: '40px auto', background: '#ffebee', borderRadius: 12 }}>
          <h2 style={{ color: '#c62828' }}>ERREUR dans : {this.props.name || 'inconnu'}</h2>
          <pre style={{ background: '#fff', padding: 16, borderRadius: 8, fontSize: 13, color: '#c62828', whiteSpace: 'pre-wrap', overflow: 'auto' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          {this.state.errorInfo && (
            <pre style={{ background: '#fff', padding: 16, borderRadius: 8, fontSize: 11, color: '#666', marginTop: 8, whiteSpace: 'pre-wrap', overflow: 'auto' }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== INNER APP ====================
function AppContent() {
  const { currentPage, loading } = useAppContext();

  if (loading) {
    return (
      <div style={styles.container}>
        <ErrorBoundary name="Sidebar-loading">
          <Sidebar />
        </ErrorBoundary>
        <main style={styles.main}>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>⏳</div>
            <p>Chargement des donnees...</p>
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
      <ErrorBoundary name="Sidebar">
        <Sidebar />
      </ErrorBoundary>
      <main style={styles.main}>
        <ErrorBoundary name={currentPage}>
          {currentPage === 'dashboard' && <PageDashboard />}
          {currentPage === 'parametres' && <PageParametres />}
          {currentPage === 'beneficiaires' && <PageBeneficiaires />}
          {currentPage === 'budget' && <PageBudget />}
          {currentPage === 'historique' && <PageHistoriqueBudget />}
          {currentPage === 'ops' && <PageListeOP />}
          {currentPage === 'nouvelOp' && <PageNouvelOp />}
          {currentPage === 'consulterOp' && <PageConsulterOp />}
          {currentPage === 'bordereaux' && <PageBordereaux />}
          {currentPage === 'suivi' && <PageEnConstruction title="Suivi Circuit" icon="🔄" />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

// ==================== MAIN APP ====================
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
      console.error('Erreur:', error);
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

  if (!user) {
    return <LoginPage onLogin={handleLogin} error={authError} />;
  }

  return (
    <ErrorBoundary name="AppProvider">
      <AppProvider user={user}>
        <ErrorBoundary name="AppContent">
          <AppContent />
        </ErrorBoundary>
      </AppProvider>
    </ErrorBoundary>
  );
}
