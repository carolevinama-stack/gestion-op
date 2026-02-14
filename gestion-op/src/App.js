import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
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
import PageAdmin from './pages/PageAdmin';
import PageEnConstruction from './pages/PageEnConstruction';

// ==================== FORCE CHANGE PASSWORD ====================
function ForceChangePassword({ onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async () => {
    if (newPassword.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    
    setSaving(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      await onDone();
    } catch (error) {
      console.error('Erreur changement MDP:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Session expirée. Veuillez vous déconnecter et vous reconnecter, puis réessayer.');
      } else {
        setError('Erreur: ' + error.message);
      }
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a3528 0%, #0f4c3a 100%)' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 80, height: 80, background: '#fff3e0', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px' }}>🔐</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f4c3a', margin: 0 }}>Changement de mot de passe</h1>
          <p style={{ color: '#6c757d', fontSize: 13, marginTop: 8 }}>Pour votre sécurité, veuillez choisir un nouveau mot de passe</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Nouveau mot de passe</label>
          <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
            placeholder="Minimum 6 caractères" style={styles.input} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Confirmer le mot de passe</label>
          <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            placeholder="Retapez le mot de passe" style={styles.input} />
        </div>

        {error && (
          <div style={{ padding: 12, background: '#ffebee', borderRadius: 8, color: '#c62828', fontSize: 13, marginBottom: 18 }}>{error}</div>
        )}

        <button onClick={handleChange} disabled={saving}
          style={{ ...styles.button, width: '100%', padding: 14, fontSize: 16, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement...' : '✅ Valider le nouveau mot de passe'}
        </button>
      </div>
    </div>
  );
}

// ==================== OFFLINE BANNER ====================
function OfflineBanner() {
  const { isOnline } = useAppContext();
  if (isOnline) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: '#f57f17', color: 'white', textAlign: 'center',
      padding: '8px 16px', fontSize: 13, fontWeight: 600
    }}>
      ⚠️ Pas de connexion internet — Mode consultation uniquement. La saisie est désactivée.
    </div>
  );
}

// ==================== MAIN LAYOUT ====================
function AppLayout() {
  const { currentPage, loading, userProfile, profileLoading, canAccessPage, isOnline } = useAppContext();

  if (loading || profileLoading) {
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

  // Compte désactivé
  if (userProfile?.actif === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 40, width: 420, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🚫</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#c62828' }}>Compte désactivé</h2>
          <p style={{ color: '#6c757d', marginTop: 12 }}>Votre compte a été désactivé par l'administrateur. Contactez votre responsable.</p>
        </div>
      </div>
    );
  }

  // Vérifier accès à la page courante
  const pageToShow = canAccessPage(currentPage) ? currentPage : 'dashboard';

  return (
    <div style={styles.container}>
      <OfflineBanner />
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
      <main style={{ ...styles.main, marginTop: !isOnline ? 36 : 0 }}>
        {pageToShow === 'dashboard' && <PageDashboard />}
        {pageToShow === 'parametres' && <PageParametres />}
        {pageToShow === 'beneficiaires' && <PageBeneficiaires />}
        {pageToShow === 'budget' && <PageBudget />}
        {pageToShow === 'historique' && <PageHistoriqueBudget />}
        {pageToShow === 'ops' && <PageListeOP />}
        {pageToShow === 'nouvelOp' && <PageNouvelOp />}
        {pageToShow === 'consulterOp' && <PageConsulterOp />}
        {pageToShow === 'bordereaux' && <PageBordereaux />}
        {pageToShow === 'admin' && <PageAdmin />}
        {pageToShow === 'suivi' && <PageEnConstruction title="Suivi Circuit" icon="🔄" />}
      </main>
    </div>
  );
}

// ==================== APP (AUTH WRAPPER) ====================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempUserProfile, setTempUserProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Vérifier si l'utilisateur doit changer son mot de passe
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { getFirestore } = await import('firebase/firestore');
          const db = getFirestore();
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileDoc.exists() && profileDoc.data().mustChangePassword) {
            setMustChangePassword(true);
            setTempUserProfile(profileDoc.data());
          } else {
            setMustChangePassword(false);
          }
        } catch (e) {
          console.error('Erreur vérification profil:', e);
        }
      }
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
      console.error('Erreur réinitialisation:', error);
      return { success: false, error: error.code === 'auth/user-not-found' ? 'Aucun compte avec cet email' : 'Erreur. Veuillez réessayer.' };
    }
  };

  const handlePasswordChanged = async () => {
    // Mettre à jour le flag dans Firestore
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { getFirestore } = await import('firebase/firestore');
      const db = getFirestore();
      await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false });
      setMustChangePassword(false);
    } catch (e) {
      console.error('Erreur mise à jour profil:', e);
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
    return <LoginPage onLogin={handleLogin} onForgotPassword={handleForgotPassword} error={authError} />;
  }

  // Must change password
  if (mustChangePassword) {
    return <ForceChangePassword onDone={handlePasswordChanged} />;
  }

  // Logged in - wrap in AppProvider
  return (
    <AppProvider user={user}>
      <AppLayout />
    </AppProvider>
  );
}
