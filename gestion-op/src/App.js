import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import LoginPage from './components/LoginPage';

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
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>TEST - Application fonctionne</h1>
      <p>Connecte en tant que : {user.email}</p>
      <button onClick={() => auth.signOut()} style={{ padding: '10px 20px', marginTop: 20, cursor: 'pointer' }}>
        Deconnexion
      </button>
    </div>
  );
}
