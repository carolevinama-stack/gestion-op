import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { AppProvider, useAppContext } from './context/AppContext';
import { styles } from './utils/styles';

// Chargés d'emblée : nécessaires dès le premier affichage.
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import PageDashboard from './pages/PageDashboard';

// Chargées à la demande, au premier passage sur la page. Évite d'imposer à chacun
// le téléchargement de pages qu'il n'ouvrira peut-être jamais (Administration,
// Journal, Paramètres…). Le Tableau de bord reste chargé d'emblée : c'est la page
// d'accueil, la retarder ferait patienter tout le monde à chaque connexion.
const PageParametres = lazy(() => import('./pages/PageParametres'));
const PageBeneficiaires = lazy(() => import('./pages/PageBeneficiaires'));
const PageBudget = lazy(() => import('./pages/PageBudget'));
const PageHistoriqueBudget = lazy(() => import('./pages/PageHistoriqueBudget'));
const PageLignesBudgetaires = lazy(() => import('./pages/PageLignesBudgetaires'));
const PageNouvelOp = lazy(() => import('./pages/PageNouvelOp'));
const PageConsulterOp = lazy(() => import('./pages/PageConsulterOp'));
const PageCircuitCF = lazy(() => import('./pages/PageCircuitCF'));
const PageCircuitAC = lazy(() => import('./pages/PageCircuitAC'));
const PageArchives = lazy(() => import('./pages/PageArchives'));
const PageListeOP = lazy(() => import('./pages/PageListeOP'));
const PageRapport = lazy(() => import('./pages/PageRapport'));
const PageAdmin = lazy(() => import('./pages/PageAdmin'));
const PageJournal = lazy(() => import('./pages/PageJournal'));

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

// Attente lors du premier passage sur une page chargée à la demande. Volontairement
// discret et cantonné à la zone de contenu : le menu reste visible et utilisable,
// contrairement au chargeur plein écran des démarrages.
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 9, height: 9, borderRadius: '50%', background: '#2E9940',
          opacity: 0.3, animation: `pifPulse 1.2s ease infinite ${i * 0.2}s`
        }} />
      ))}
    </div>
  </div>
);

// ==================== ERROR BOUNDARY ====================
// Capture les erreurs React et affiche un message de récupération au lieu d'un écran blanc.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erreur applicative capturée :', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: '#F7F5F2',
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#C43E3E', marginBottom: 12 }}>
            Une erreur inattendue s'est produite
          </div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 24, maxWidth: 420 }}>
            L'application a rencontré un problème. Vous pouvez essayer de recharger la page pour continuer.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '12px 28px', background: '#2E9940', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Écran de refus d'accès : compte désactivé, compte sans profil, ou profil illisible.
// L'authentification Firebase peut être valide sans pour autant donner droit à
// l'application — c'est ici que la distinction est faite pour l'utilisateur.
const AccesRefuse = ({ titre, message, onLogout }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100vh', width: '100vw', background: '#F7F5F2', padding: 24, textAlign: 'center'
  }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: '#C43E3E', marginBottom: 12 }}>{titre}</div>
    <div style={{ fontSize: 14, color: '#666', marginBottom: 24, maxWidth: 420, lineHeight: 1.5 }}>{message}</div>
    <button
      onClick={onLogout}
      style={{ padding: '12px 28px', background: '#2E9940', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
    >
      Se déconnecter
    </button>
  </div>
);

function AppLayout() {
  const { currentPage, loading, userProfile, profileLoading, accesRefuse, handleLogout } = useAppContext();

  if (profileLoading) return <LoaderPIF label="Vérification du compte..." />;

  if (accesRefuse === 'AUCUN_PROFIL') {
    return (
      <AccesRefuse
        titre="Compte non autorisé"
        message="Ce compte de connexion existe, mais aucun accès à l'application ne lui a été attribué. Un administrateur doit créer votre profil depuis la page Administration."
        onLogout={handleLogout}
      />
    );
  }

  if (accesRefuse === 'ERREUR') {
    return (
      <AccesRefuse
        titre="Profil inaccessible"
        message="Impossible de lire votre profil utilisateur. Vérifiez votre connexion Internet et réessayez ; si le problème persiste, contactez un administrateur."
        onLogout={handleLogout}
      />
    );
  }

  if (userProfile?.actif === false) {
    return (
      <AccesRefuse
        titre="Compte désactivé"
        message="Votre accès à l'application a été désactivé par un administrateur. Contactez-le si vous pensez qu'il s'agit d'une erreur."
        onLogout={handleLogout}
      />
    );
  }

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
        <Suspense fallback={<PageLoader />}>
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
        {currentPage === 'journal' && <PageJournal />}
        </Suspense>
      </main>
    </div>
  );
}

function AppRoot() {
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

  const handleForgotPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Impossible d'envoyer l'email de réinitialisation. Vérifiez l'adresse saisie." };
    }
  };

  // Premier chargement (authentification)
  if (authLoading) return <LoaderPIF label="Connexion au système..." />;

  if (!user) return <LoginPage onLogin={handleLogin} onForgotPassword={handleForgotPassword} error={authError} />;

  return (
    <AppProvider user={user}>
      <AppLayout />
    </AppProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoot />
    </ErrorBoundary>
  );
}
