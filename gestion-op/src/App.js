import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { AppProvider, useAppContext } from './context/AppContext';
import { styles } from './utils/styles';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import PageDashboard from './pages/PageDashboard';

function AppContent() {
  const { currentPage, setCurrentPage, loading } = useAppContext();

  useEffect(() => {
    if (currentPage !== 'dashboard') setCurrentPage('dashboard');
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
      <Sidebar />
      <main style={styles.main}>
        <PageDashboard />
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
