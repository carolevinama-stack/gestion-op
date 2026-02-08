// ==================== APP.JS - POINT D'ENTRÉE ====================
import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Sidebar, MainLayout } from './components/Layout';
import { LoadingOverlay, Input, Button, Card } from './components/UI';

// Import des pages
import PageDashboard from './pages/Dashboard';
// import PageBudget from './pages/Budget';
// import PageBeneficiaires from './pages/Beneficiaires';
// import PageOperations from './pages/Operations';
// import PageBordereaux from './pages/Bordereaux';
// import PageParametres from './pages/Parametres';

// ==================== PAGE EN CONSTRUCTION ====================
const PageEnConstruction = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-400">
    <div className="text-6xl mb-4">{icon || '🚧'}</div>
    <h2 className="text-xl font-bold text-stone-600">{title}</h2>
    <p className="text-sm mt-2">Cette page est en cours de développement</p>
  </div>
);

// ==================== PAGE LOGIN ====================
const LoginPage = () => {
  const { login, projet } = useApp();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(password)) {
      setError('');
    } else {
      setError('Mot de passe incorrect');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌳</div>
          <h1 className="text-2xl font-bold text-stone-800">
            {projet?.sigle || 'Connexion'}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {projet?.nomProjet || 'Gestion des Ordres de Paiement'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            label="Mot de passe"
            placeholder="Entrez le mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={error}
            icon="🔒"
          />
          
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full mt-4"
          >
            Se connecter
          </Button>
        </form>
      </Card>
    </div>
  );
};

// ==================== APP CONTENT ====================
const AppContent = () => {
  const { 
    loading, 
    isAuthenticated, 
    currentPage, 
    setCurrentPage,
    projet,
    exerciceActif,
    logout,
  } = useApp();

  // Afficher le loading
  if (loading) {
    return <LoadingOverlay message="Chargement de l'application..." />;
  }

  // Afficher le login si non authentifié
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Rendu de la page active
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <PageDashboard />;
      case 'nouvelOp':
        return <PageEnConstruction title="Nouvel OP" icon="➕" />;
      case 'ops':
        return <PageEnConstruction title="Liste des OP" icon="📋" />;
      case 'bordereaux':
        return <PageEnConstruction title="Bordereaux" icon="📨" />;
      case 'suivi':
        return <PageEnConstruction title="Suivi Circuit" icon="🔄" />;
      case 'beneficiaires':
        return <PageEnConstruction title="Bénéficiaires" icon="👥" />;
      case 'budget':
        return <PageEnConstruction title="Budget" icon="💰" />;
      case 'historique':
        return <PageEnConstruction title="Historique Budget" icon="📜" />;
      case 'parametres':
        return <PageEnConstruction title="Paramètres" icon="⚙️" />;
      default:
        return <PageDashboard />;
    }
  };

  return (
    <MainLayout
      sidebar={
        <Sidebar
          projet={projet}
          exerciceActif={exerciceActif}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onLogout={logout}
        />
      }
    >
      {renderPage()}
    </MainLayout>
  );
};

// ==================== APP PRINCIPAL ====================
const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
