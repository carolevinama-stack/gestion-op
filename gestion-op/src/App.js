import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// ==================== COMPOSANT AUTOCOMPLETE ====================
const Autocomplete = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Rechercher...', 
  isDisabled = false,
  isClearable = true,
  noOptionsMessage = 'Aucun résultat',
  accentColor = '#0f4c3a'
}) => {
  // Styles personnalisés pour react-select
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 8,
      border: state.isFocused ? `2px solid ${accentColor}` : '2px solid #e9ecef',
      boxShadow: 'none',
      '&:hover': { borderColor: accentColor },
      background: isDisabled ? '#f8f9fa' : 'white',
      cursor: isDisabled ? 'not-allowed' : 'pointer'
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 12px'
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0
    }),
    placeholder: (base) => ({
      ...base,
      color: '#adb5bd'
    }),
    singleValue: (base) => ({
      ...base,
      color: '#333'
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999,
      overflow: 'hidden'
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: 250
    }),
    option: (base, state) => ({
      ...base,
      padding: '10px 14px',
      cursor: 'pointer',
      backgroundColor: state.isSelected ? accentColor : state.isFocused ? `${accentColor}15` : 'white',
      color: state.isSelected ? 'white' : '#333',
      '&:active': { backgroundColor: `${accentColor}30` }
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: '#6c757d',
      padding: '16px'
    }),
    clearIndicator: (base) => ({
      ...base,
      cursor: 'pointer',
      color: '#adb5bd',
      '&:hover': { color: '#dc3545' }
    }),
    dropdownIndicator: (base) => ({
      ...base,
      cursor: 'pointer',
      color: '#adb5bd',
      '&:hover': { color: accentColor }
    })
  };

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={true}
      noOptionsMessage={() => noOptionsMessage}
      styles={customStyles}
      filterOption={(option, inputValue) => {
        // Recherche intelligente sur label et toutes les propriétés de data
        if (!inputValue) return true;
        const search = inputValue.toLowerCase();
        const label = (option.label || '').toLowerCase();
        const searchFields = option.data?.searchFields || [];
        
        if (label.includes(search)) return true;
        return searchFields.some(field => field?.toLowerCase().includes(search));
      }}
    />
  );
};

// ==================== COMPOSANT MOT DE PASSE ADMIN ====================
const PasswordModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Action protégée",
  description = "",
  warningMessage = "",
  confirmText = "Confirmer",
  confirmColor = "#0f4c3a",
  adminPassword,
  impactDetails = null
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (password !== adminPassword) {
      setError('Mot de passe incorrect');
      return;
    }
    setPassword('');
    setError('');
    onConfirm();
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
    }}>
      <div style={{
        background: 'white', borderRadius: 14, width: '90%', maxWidth: 500,
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
          <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            🔐 {title}
          </h2>
        </div>
        <div style={{ padding: 24 }}>
          {description && (
            <p style={{ marginTop: 0, marginBottom: 16, color: '#333' }}>{description}</p>
          )}
          
          {impactDetails && (
            <div style={{ 
              background: '#fff3e0', padding: 16, borderRadius: 8, marginBottom: 20,
              border: '1px solid #ffe0b2'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#e65100', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ Impact sur les engagements
              </div>
              <div style={{ fontSize: 13, color: '#333' }}>{impactDetails}</div>
            </div>
          )}

          {warningMessage && (
            <div style={{ 
              background: '#ffebee', padding: 16, borderRadius: 8, marginBottom: 20,
              border: '1px solid #ffcdd2'
            }}>
              <div style={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ {warningMessage}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#333' }}>
              Mot de passe administrateur *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                style={{
                  width: '100%', padding: '12px 45px 12px 14px', border: error ? '2px solid #c62828' : '2px solid #e9ecef',
                  borderRadius: 8, fontSize: 14, boxSizing: 'border-box'
                }}
                placeholder="Entrez le mot de passe"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {error && (
              <div style={{ color: '#c62828', fontSize: 12, marginTop: 6 }}>❌ {error}</div>
            )}
          </div>
        </div>
        <div style={{ 
          padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa',
          display: 'flex', justifyContent: 'flex-end', gap: 12 
        }}>
          <button onClick={handleClose} style={{
            padding: '12px 24px', background: '#e9ecef', color: '#333',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14
          }}>
            Annuler
          </button>
          <button onClick={handleConfirm} style={{
            padding: '12px 24px', background: confirmColor, color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600
          }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: { display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  sidebar: { width: 260, background: 'linear-gradient(180deg, #0a3528 0%, #0f4c3a 100%)', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed' },
  main: { marginLeft: 260, flex: 1, padding: 26 },
  card: { background: 'white', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  input: { width: '100%', padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' },
  button: { padding: '12px 24px', background: '#0f4c3a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  buttonSecondary: { padding: '12px 24px', background: '#e9ecef', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, background: '#f8f9fa', borderBottom: '2px solid #e9ecef' },
  td: { padding: '14px 16px', borderBottom: '1px solid #f1f3f4' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modalContent: { background: 'white', borderRadius: 14, width: '90%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' },
  tabs: { display: 'flex', gap: 0, borderBottom: '2px solid #e9ecef', marginBottom: 24 },
  tab: { padding: '12px 24px', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2, fontSize: 14, fontWeight: 500, color: '#6c757d' },
  tabActive: { padding: '12px 24px', cursor: 'pointer', borderBottom: '2px solid #0f4c3a', marginBottom: -2, fontSize: 14, fontWeight: 600, color: '#0f4c3a' },
  sourceTabs: { display: 'flex', gap: 8, marginBottom: 20 },
  sourceTab: { padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: '2px solid #e9ecef', background: 'white' },
  sourceTabActive: { padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: '2px solid', color: 'white' },
};

// ==================== UTILITAIRES ====================
const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('fr-FR');
};

// Export CSV (compatible Excel)
const exportToCSV = (data, filename) => {
  // Ajouter BOM pour UTF-8 (Excel)
  const BOM = '\uFEFF';
  const csvContent = BOM + data;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ==================== PAGE DE CONNEXION ====================
const LoginPage = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a3528 0%, #0f4c3a 100%)' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 80, height: 80, background: '#f0b429', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px' }}>🌳</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f4c3a', margin: 0 }}>Gestion des OP</h1>
          <p style={{ color: '#6c757d', fontSize: 14, marginTop: 8 }}>Connectez-vous pour continuer</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              style={styles.input}
              required
            />
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          {error && (
            <div style={{ padding: 12, background: '#ffebee', borderRadius: 8, color: '#c62828', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ ...styles.button, width: '100%', padding: 14, fontSize: 16, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== APPLICATION PRINCIPALE ====================
export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  
  // Navigation - avec persistance localStorage
  const [currentPage, setCurrentPageState] = useState(() => {
    const saved = localStorage.getItem('gestion-op-currentPage');
    return saved || 'dashboard';
  });
  const [historiqueParams, setHistoriqueParamsState] = useState(() => {
    const saved = localStorage.getItem('gestion-op-historiqueParams');
    return saved ? JSON.parse(saved) : { sourceId: null, exerciceId: null };
  });
  const [activeBudgetSource, setActiveBudgetSourceState] = useState(() => {
    const saved = localStorage.getItem('gestion-op-activeBudgetSource');
    return saved || null;
  });

  // Wrappers pour sauvegarder dans localStorage
  const setCurrentPage = (page) => {
    setCurrentPageState(page);
    localStorage.setItem('gestion-op-currentPage', page);
  };
  const setHistoriqueParams = (params) => {
    setHistoriqueParamsState(params);
    localStorage.setItem('gestion-op-historiqueParams', JSON.stringify(params));
  };
  const setActiveBudgetSource = (sourceId) => {
    setActiveBudgetSourceState(sourceId);
    if (sourceId) {
      localStorage.setItem('gestion-op-activeBudgetSource', sourceId);
    } else {
      localStorage.removeItem('gestion-op-activeBudgetSource');
    }
  };
  
  // Data state
  const [projet, setProjet] = useState(null);
  const [sources, setSources] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [lignesBudgetaires, setLignesBudgetaires] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [ops, setOps] = useState([]);
  
  // Loading
  const [loading, setLoading] = useState(true);

  // ==================== AUTH ====================
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Nettoyer le localStorage de navigation
      localStorage.removeItem('gestion-op-currentPage');
      localStorage.removeItem('gestion-op-historiqueParams');
      localStorage.removeItem('gestion-op-activeBudgetSource');
      setCurrentPageState('dashboard');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  // ==================== LOAD DATA ====================
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Charger les paramètres du projet
        const projetDoc = await getDoc(doc(db, 'parametres', 'projet'));
        if (projetDoc.exists()) {
          setProjet(projetDoc.data());
        }

        // Charger les sources de financement
        const sourcesSnap = await getDocs(collection(db, 'sources'));
        const sourcesData = sourcesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSources(sourcesData);

        // Charger les exercices
        const exercicesSnap = await getDocs(query(collection(db, 'exercices'), orderBy('annee', 'desc')));
        const exercicesData = exercicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setExercices(exercicesData);

        // Charger les lignes budgétaires
        const lignesSnap = await getDocs(collection(db, 'lignesBudgetaires'));
        setLignesBudgetaires(lignesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Charger les bénéficiaires
        const benSnap = await getDocs(query(collection(db, 'beneficiaires'), orderBy('nom')));
        setBeneficiaires(benSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Charger les budgets
        const budgetsSnap = await getDocs(collection(db, 'budgets'));
        setBudgets(budgetsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Charger les OPs
        const opsSnap = await getDocs(query(collection(db, 'ops'), orderBy('numero', 'desc')));
        setOps(opsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error('Erreur chargement données:', error);
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Obtenir l'exercice actif
  const exerciceActif = exercices.find(e => e.actif);

  // ==================== RENDER ====================
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

  // ==================== SIDEBAR ====================
  const Sidebar = () => (
    <div style={styles.sidebar}>
      <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#f0b429', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌳</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{projet?.sigle || 'GESTION OP'}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Ordres de Paiement</div>
          </div>
        </div>
      </div>
      
      <nav style={{ flex: 1, padding: '14px 0', overflowY: 'auto' }}>
        <NavItem id="dashboard" icon="📊" label="Tableau de bord" />
        
        <div style={{ padding: '16px 18px 6px', fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>OPÉRATIONS</div>
        <NavItem id="ops" icon="📋" label="Liste des OP" />
        <NavItem id="nouvelOp" icon="➕" label="Nouvel OP" />
        <NavItem id="suivi" icon="🔄" label="Suivi Circuit" />
        
        <div style={{ padding: '16px 18px 6px', fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>GESTION</div>
        <NavItem id="budget" icon="💰" label="Budget" />
        <NavItem id="beneficiaires" icon="👥" label="Bénéficiaires" />
        
        <div style={{ padding: '16px 18px 6px', fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>CONFIGURATION</div>
        <NavItem id="parametres" icon="⚙️" label="Paramètres" />
      </nav>
      
      {/* Exercice actif */}
      {exerciceActif && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>EXERCICE ACTIF</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f0b429' }}>{exerciceActif.annee}</div>
        </div>
      )}
      
      {/* User */}
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{user.email}</div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );

  const NavItem = ({ id, icon, label }) => (
    <div 
      onClick={() => setCurrentPage(id)} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        padding: '12px 18px', 
        cursor: 'pointer', 
        borderLeft: currentPage === id ? '3px solid #f0b429' : '3px solid transparent', 
        background: currentPage === id ? 'rgba(255,255,255,0.15)' : 'transparent',
        transition: 'all 0.2s'
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 14 }}>{label}</span>
    </div>
  );

  // ==================== COMPOSANT ONGLETS SOURCES ====================
  const SourceTabs = ({ activeSource, onChangeSource }) => (
    <div style={styles.sourceTabs}>
      {sources.map(source => (
        <div
          key={source.id}
          onClick={() => onChangeSource(source.id)}
          style={activeSource === source.id 
            ? { ...styles.sourceTabActive, background: source.couleur || '#0f4c3a', borderColor: source.couleur || '#0f4c3a' }
            : styles.sourceTab
          }
        >
          {source.sigle || source.nom}
        </div>
      ))}
      {sources.length === 0 && (
        <div style={{ color: '#6c757d', fontSize: 14 }}>
          Aucune source configurée. <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Ajouter une source</span>
        </div>
      )}
    </div>
  );

  // ==================== COMPOSANT MODAL MOT DE PASSE ====================
  const PasswordModal = ({ show, isOpen, onClose, onConfirm, title, description, warning, warningMessage, confirmText, confirmColor }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    // Support both 'show' and 'isOpen' props
    const isVisible = show || isOpen;
    const warningText = warning || warningMessage;
    const buttonText = confirmText || '🔓 Confirmer';
    const buttonColor = confirmColor || '#f57f17';

    if (!isVisible) return null;

    const handleConfirm = () => {
      if (!projet?.adminPassword) {
        // Pas de mot de passe configuré, on laisse passer
        onConfirm();
        setPassword('');
        return;
      }
      
      if (password === projet.adminPassword) {
        onConfirm();
        setPassword('');
        setError('');
      } else {
        setError('Mot de passe incorrect');
      }
    };

    const handleClose = () => {
      setPassword('');
      setError('');
      onClose();
    };

    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#fff8e1' }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#f57f17' }}>🔐 {title || 'Action protégée'}</h2>
          </div>
          <div style={{ padding: 24 }}>
            {description && (
              <p style={{ marginBottom: 16, color: '#333' }}>{description}</p>
            )}
            
            {warningText && (
              <div style={{ background: '#ffebee', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <strong style={{ color: '#c62828' }}>⚠️ Attention :</strong>
                <span style={{ color: '#c62828', marginLeft: 4 }}>{warningText}</span>
              </div>
            )}
            
            {!projet?.adminPassword ? (
              <div style={{ background: '#fff3e0', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <strong style={{ color: '#e65100' }}>ℹ️</strong>
                <span style={{ color: '#e65100', marginLeft: 4 }}>
                  Aucun mot de passe administrateur configuré. 
                  <span 
                    onClick={() => { handleClose(); setCurrentPage('parametres'); }}
                    style={{ textDecoration: 'underline', cursor: 'pointer', marginLeft: 4 }}
                  >
                    Configurer maintenant
                  </span>
                </span>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mot de passe administrateur *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPwd ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
                    style={{ ...styles.input, paddingRight: 45, borderColor: error ? '#c62828' : undefined }} 
                    placeholder="Entrez le mot de passe"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                  >
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
                {error && <span style={{ color: '#c62828', fontSize: 12 }}>❌ {error}</span>}
              </div>
            )}
          </div>
          <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={handleClose} style={styles.buttonSecondary}>Annuler</button>
            <button onClick={handleConfirm} style={{ ...styles.button, background: buttonColor }}>
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== PAGE DASHBOARD ====================
  const PageDashboard = () => {
    const [showDetailSource, setShowDetailSource] = useState(null);
    
    // Calculer les totaux globaux
    const exerciceActifId = exerciceActif?.id;
    const budgetsActifs = budgets.filter(b => b.exerciceId === exerciceActifId);
    const opsActifs = ops.filter(op => op.exerciceId === exerciceActifId && ['DIRECT', 'DEFINITIF'].includes(op.type) && op.statut !== 'REJETE');
    
    const totalDotation = budgetsActifs.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0);
    const totalEngagement = opsActifs.reduce((sum, op) => sum + (op.montant || 0), 0);
    const totalDisponible = totalDotation - totalEngagement;
    
    const opsProvisoires = ops.filter(op => op.exerciceId === exerciceActifId && op.type === 'PROVISOIRE' && op.statut !== 'REGULARISE');
    const opsEnCours = ops.filter(op => op.exerciceId === exerciceActifId && ['TRANSMIS_CF', 'TRANSMIS_AC', 'DIFFERE'].includes(op.statut));

    // Détail par source
    const getSourceStats = (sourceId) => {
      const sourceBudgets = budgetsActifs.filter(b => b.sourceId === sourceId);
      const sourceOps = opsActifs.filter(op => op.sourceId === sourceId);
      const dotation = sourceBudgets.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0);
      const engagement = sourceOps.reduce((sum, op) => sum + (op.montant || 0), 0);
      return { dotation, engagement, disponible: dotation - engagement, nbOps: sourceOps.length };
    };

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📊 Tableau de bord</h1>
          <p style={{ color: '#6c757d' }}>
            Exercice {exerciceActif?.annee || 'Non défini'} - Vue d'ensemble
          </p>
        </div>

        {/* Stats globales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: '💰', label: 'Dotation totale', value: formatMontant(totalDotation), color: '#0f4c3a' },
            { icon: '📝', label: 'Engagements', value: formatMontant(totalEngagement), color: '#f0b429' },
            { icon: '✅', label: 'Disponible', value: formatMontant(totalDisponible), color: '#06d6a0' },
            { icon: '📋', label: 'Total OP', value: opsActifs.length, color: '#1565c0' },
          ].map((s, i) => (
            <div key={i} style={styles.card}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Détail par source */}
        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📊 Situation par source de financement</h3>
          {sources.length === 0 ? (
            <p style={{ color: '#6c757d' }}>Aucune source configurée</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>SOURCE</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>DOTATION</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>ENGAGEMENTS</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>DISPONIBLE</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>NB OP</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(source => {
                  const stats = getSourceStats(source.id);
                  return (
                    <tr key={source.id}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: source.couleur || '#0f4c3a' }}></div>
                          <strong>{source.nom}</strong>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(stats.dotation)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#f0b429' }}>{formatMontant(stats.engagement)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: stats.disponible >= 0 ? '#06d6a0' : '#dc3545', fontWeight: 600 }}>{formatMontant(stats.disponible)}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ ...styles.badge, background: '#e3f2fd', color: '#1565c0' }}>{stats.nbOps}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Alertes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={styles.card}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>⏳ OP Provisoires en attente ({opsProvisoires.length})</h3>
            {opsProvisoires.length === 0 ? (
              <p style={{ color: '#6c757d', fontSize: 14 }}>Aucun OP provisoire en attente</p>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {opsProvisoires.slice(0, 5).map(op => (
                  <div key={op.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between' }}>
                    <span>N°{op.numero} - {beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'Inconnu'}</span>
                    <span style={{ fontFamily: 'monospace', color: '#f0b429' }}>{formatMontant(op.montant)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🔄 OP en circuit ({opsEnCours.length})</h3>
            {opsEnCours.length === 0 ? (
              <p style={{ color: '#6c757d', fontSize: 14 }}>Aucun OP en cours de traitement</p>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {opsEnCours.slice(0, 5).map(op => {
                  const statutLabels = { 'TRANSMIS_CF': 'Chez CF', 'TRANSMIS_AC': 'Chez AC', 'DIFFERE': 'Différé' };
                  return (
                    <div key={op.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>N°{op.numero}</span>
                      <span style={{ ...styles.badge, background: op.statut === 'DIFFERE' ? '#fff3e0' : '#e3f2fd', color: op.statut === 'DIFFERE' ? '#e65100' : '#1565c0' }}>
                        {statutLabels[op.statut] || op.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==================== PAGE PARAMÈTRES UNIFIÉE ====================
  const PageParametres = () => {
    const [activeTab, setActiveTab] = useState('projet');

    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>⚙️ Paramètres</h1>
        
        {/* Onglets */}
        <div style={styles.tabs}>
          {[
            { id: 'projet', label: '🏛️ Projet' },
            { id: 'sources', label: '🏦 Sources' },
            { id: 'exercices', label: '📅 Exercices' },
            { id: 'lignes', label: '📝 Lignes budgétaires' },
          ].map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? styles.tabActive : styles.tab}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'projet' && <TabProjet />}
        {activeTab === 'sources' && <TabSources />}
        {activeTab === 'exercices' && <TabExercices />}
        {activeTab === 'lignes' && <TabLignes />}
      </div>
    );
  };

  // Tab Projet
  const TabProjet = () => {
    const [form, setForm] = useState(projet || {
      pays: 'République de Côte d\'Ivoire',
      devise: 'Union – Discipline – Travail',
      ministere: '',
      nomProjet: '',
      sigle: '',
      codeImputation: '',
      nbCaracteresLigne: 4,
      coordonnateur: '',
      titreCoordonnateur: '',
      nbExemplairesCF: 4,
      nbExemplairesAC: 2,
      adminPassword: ''
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
      if (projet) {
        setForm(projet);
        setConfirmPassword(projet.adminPassword || '');
      }
    }, [projet]);

    const handleSave = async () => {
      // Vérifier la correspondance des mots de passe si un nouveau est défini
      if (form.adminPassword && form.adminPassword !== confirmPassword) {
        alert('❌ Les mots de passe ne correspondent pas');
        return;
      }
      
      setSaving(true);
      try {
        await setDoc(doc(db, 'parametres', 'projet'), form);
        setProjet(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (error) {
        console.error('Erreur sauvegarde:', error);
        alert('Erreur lors de la sauvegarde');
      }
      setSaving(false);
    };

    return (
      <div>
        <div style={styles.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>Informations générales</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Pays</label>
              <input value={form.pays || ''} onChange={e => setForm({...form, pays: e.target.value})} style={styles.input} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Devise nationale</label>
              <input value={form.devise || ''} onChange={e => setForm({...form, devise: e.target.value})} style={styles.input} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Ministère de tutelle</label>
              <input value={form.ministere || ''} onChange={e => setForm({...form, ministere: e.target.value})} style={styles.input} placeholder="Ex: Ministère des Eaux et Forêts" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nom complet du projet</label>
              <input value={form.nomProjet || ''} onChange={e => setForm({...form, nomProjet: e.target.value})} style={styles.input} placeholder="Ex: Projet d'Investissement Forestier 2" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Sigle du projet</label>
              <input value={form.sigle || ''} onChange={e => setForm({...form, sigle: e.target.value})} style={styles.input} placeholder="Ex: PIF2" />
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>Configuration technique</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Code imputation budgétaire (préfixe)</label>
              <input value={form.codeImputation || ''} onChange={e => setForm({...form, codeImputation: e.target.value})} style={styles.input} placeholder="Ex: 345 90042200006 90 11409374" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nb caractères ligne</label>
              <select value={form.nbCaracteresLigne || 4} onChange={e => setForm({...form, nbCaracteresLigne: parseInt(e.target.value)})} style={styles.input}>
                <option value={4}>4 caractères</option>
                <option value={6}>6 caractères</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>Responsable / Signataire</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nom du Coordonnateur/trice</label>
              <input value={form.coordonnateur || ''} onChange={e => setForm({...form, coordonnateur: e.target.value})} style={styles.input} placeholder="Ex: ABE-KOFFI Thérèse" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Titre officiel</label>
              <input value={form.titreCoordonnateur || ''} onChange={e => setForm({...form, titreCoordonnateur: e.target.value})} style={styles.input} placeholder="Ex: LA COORDONNATRICE DU PIF 2" />
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>Configuration impressions</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nombre d'exemplaires pour le CF</label>
              <input type="number" value={form.nbExemplairesCF || 4} onChange={e => setForm({...form, nbExemplairesCF: parseInt(e.target.value)})} style={styles.input} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nombre d'exemplaires pour l'AC</label>
              <input type="number" value={form.nbExemplairesAC || 2} onChange={e => setForm({...form, nbExemplairesAC: parseInt(e.target.value)})} style={styles.input} />
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, background: '#fff8e1', border: '2px solid #f9a825' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f9a825', color: '#f57f17' }}>
            🔐 Sécurité administrative
          </h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mot de passe administrateur *</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={form.adminPassword || ''} 
                onChange={e => setForm({...form, adminPassword: e.target.value})} 
                style={{ ...styles.input, paddingRight: 45 }} 
                placeholder="Définir un mot de passe sécurisé" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Confirmer le mot de passe *</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              style={styles.input} 
              placeholder="Confirmer le mot de passe" 
            />
            {form.adminPassword && confirmPassword && form.adminPassword !== confirmPassword && (
              <span style={{ color: '#c62828', fontSize: 12 }}>❌ Les mots de passe ne correspondent pas</span>
            )}
            {form.adminPassword && confirmPassword && form.adminPassword === confirmPassword && (
              <span style={{ color: '#2e7d32', fontSize: 12 }}>✅ Mots de passe identiques</span>
            )}
          </div>
          
          <div style={{ background: 'white', padding: 12, borderRadius: 8, fontSize: 13, color: '#555' }}>
            <strong style={{ color: '#f57f17' }}>ℹ️ Ce mot de passe protège les actions sensibles :</strong>
            <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
              <li>Modifier / Supprimer / Rejeter un OP</li>
              <li>Révision budgétaire</li>
              <li>Modification des paramètres (sources, exercices)</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={handleSave} disabled={saving} style={{ ...styles.button, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enregistrement...' : '✓ Enregistrer'}
          </button>
          {saved && <span style={{ color: '#06d6a0', fontWeight: 500 }}>✓ Sauvegardé !</span>}
        </div>
      </div>
    );
  };

  // Tab Sources
  const TabSources = () => {
    const [showModal, setShowModal] = useState(false);
    const [editSource, setEditSource] = useState(null);
    const [form, setForm] = useState({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#0f4c3a' });

    const openNew = () => {
      setForm({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#0f4c3a' });
      setEditSource(null);
      setShowModal(true);
    };

    const openEdit = (source) => {
      setForm(source);
      setEditSource(source);
      setShowModal(true);
    };

    const handleSave = async () => {
      if (!form.nom || !form.sigle) {
        alert('Le nom et le sigle sont obligatoires');
        return;
      }
      try {
        if (editSource) {
          await updateDoc(doc(db, 'sources', editSource.id), form);
          setSources(sources.map(s => s.id === editSource.id ? { ...s, ...form } : s));
        } else {
          const docRef = await addDoc(collection(db, 'sources'), form);
          setSources([...sources, { id: docRef.id, ...form }]);
        }
        setShowModal(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sauvegarde');
      }
    };

    const handleDelete = async (source) => {
      if (!window.confirm(`Supprimer la source "${source.nom}" ?`)) return;
      try {
        await deleteDoc(doc(db, 'sources', source.id));
        setSources(sources.filter(s => s.id !== source.id));
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression');
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ color: '#6c757d', margin: 0 }}>{sources.length} source(s) configurée(s)</p>
          <button onClick={openNew} style={styles.button}>➕ Nouvelle source</button>
        </div>

        <div style={styles.card}>
          {sources.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', padding: 40 }}>Aucune source de financement</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>NOM</th>
                  <th style={styles.th}>SIGLE</th>
                  <th style={styles.th}>COMPTE À DÉBITER</th>
                  <th style={styles.th}>COULEUR</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(source => (
                  <tr key={source.id}>
                    <td style={styles.td}><strong>{source.nom}</strong></td>
                    <td style={styles.td}>{source.sigle}</td>
                    <td style={styles.td}><span style={{ ...styles.badge, background: source.compteDebiter === 'BAILLEUR' ? '#e8f5e9' : '#e3f2fd', color: source.compteDebiter === 'BAILLEUR' ? '#2e7d32' : '#1565c0' }}>{source.compteDebiter}</span></td>
                    <td style={styles.td}><div style={{ width: 30, height: 30, borderRadius: 6, background: source.couleur }}></div></td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => openEdit(source)} style={{ ...styles.buttonSecondary, padding: '6px 12px', marginRight: 8 }}>✏️</button>
                      <button onClick={() => handleDelete(source)} style={{ ...styles.buttonSecondary, padding: '6px 12px', background: '#ffebee', color: '#c62828' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{editSource ? '✏️ Modifier la source' : '➕ Nouvelle source'}</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nom complet *</label>
                  <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} style={styles.input} placeholder="Ex: Association Internationale de Développement" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Sigle *</label>
                    <input value={form.sigle} onChange={e => setForm({...form, sigle: e.target.value})} style={styles.input} placeholder="Ex: IDA" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Compte à débiter</label>
                    <select value={form.compteDebiter} onChange={e => setForm({...form, compteDebiter: e.target.value})} style={styles.input}>
                      <option value="BAILLEUR">BAILLEUR</option>
                      <option value="TRESOR">TRESOR</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Description (pour les documents)</label>
                  <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} style={{ ...styles.input, minHeight: 80, resize: 'vertical' }} placeholder="Ex: Financement Groupe Banque Mondiale : Projet N° TF0B8829-CI" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Couleur</label>
                  <input type="color" value={form.couleur} onChange={e => setForm({...form, couleur: e.target.value})} style={{ width: 60, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setShowModal(false)} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleSave} style={styles.button}>✓ Enregistrer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tab Exercices
  const TabExercices = () => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ annee: new Date().getFullYear(), actif: true });

    const handleSave = async () => {
      try {
        // Si actif, désactiver les autres
        if (form.actif) {
          for (const ex of exercices.filter(e => e.actif)) {
            await updateDoc(doc(db, 'exercices', ex.id), { actif: false });
          }
        }
        const docRef = await addDoc(collection(db, 'exercices'), form);
        const newExercices = exercices.map(e => form.actif ? { ...e, actif: false } : e);
        setExercices([{ id: docRef.id, ...form }, ...newExercices].sort((a, b) => b.annee - a.annee));
        setShowModal(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sauvegarde');
      }
    };

    const setActif = async (exercice) => {
      try {
        for (const ex of exercices) {
          await updateDoc(doc(db, 'exercices', ex.id), { actif: ex.id === exercice.id });
        }
        setExercices(exercices.map(e => ({ ...e, actif: e.id === exercice.id })));
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ color: '#6c757d', margin: 0 }}>{exercices.length} exercice(s)</p>
          <button onClick={() => { setForm({ annee: new Date().getFullYear() + 1, actif: false }); setShowModal(true); }} style={styles.button}>➕ Nouvel exercice</button>
        </div>

        <div style={styles.card}>
          {exercices.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', padding: 40 }}>Aucun exercice</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ANNÉE</th>
                  <th style={styles.th}>STATUT</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {exercices.map(ex => (
                  <tr key={ex.id}>
                    <td style={styles.td}><strong style={{ fontSize: 18 }}>{ex.annee}</strong></td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: ex.actif ? '#e8f5e9' : '#f5f5f5', color: ex.actif ? '#2e7d32' : '#6c757d' }}>
                        {ex.actif ? '✅ Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {!ex.actif && (
                        <button onClick={() => setActif(ex)} style={{ ...styles.buttonSecondary, padding: '6px 12px' }}>Définir comme actif</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 400 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>➕ Nouvel exercice</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Année</label>
                  <input type="number" value={form.annee} onChange={e => setForm({...form, annee: parseInt(e.target.value)})} style={styles.input} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.actif} onChange={e => setForm({...form, actif: e.target.checked})} />
                  <span>Définir comme exercice actif</span>
                </label>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setShowModal(false)} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleSave} style={styles.button}>✓ Créer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tab Lignes budgétaires (Bibliothèque de référence)
  const TabLignes = () => {
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [form, setForm] = useState({ code: '', libelle: '' });
    const [importData, setImportData] = useState([]);
    const [importing, setImporting] = useState(false);

    const handleSave = async () => {
      if (!form.code || !form.libelle) {
        alert('Veuillez remplir tous les champs');
        return;
      }
      // Vérifier si le code existe déjà
      if (lignesBudgetaires.find(l => l.code === form.code)) {
        alert('Ce code existe déjà dans la bibliothèque');
        return;
      }
      try {
        const docRef = await addDoc(collection(db, 'lignesBudgetaires'), form);
        setLignesBudgetaires([...lignesBudgetaires, { id: docRef.id, ...form }].sort((a, b) => a.code.localeCompare(b.code)));
        setForm({ code: '', libelle: '' });
        setShowModal(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sauvegarde');
      }
    };

    const handleDelete = async (ligne) => {
      // Vérifier si la ligne est utilisée dans un budget
      const isUsed = budgets.some(b => b.lignes?.some(l => l.code === ligne.code));
      if (isUsed) {
        alert(`Impossible de supprimer cette ligne.\n\nElle est utilisée dans un ou plusieurs budgets.`);
        return;
      }
      if (!window.confirm(`Supprimer la ligne "${ligne.code} - ${ligne.libelle}" de la bibliothèque ?`)) return;
      try {
        await deleteDoc(doc(db, 'lignesBudgetaires', ligne.id));
        setLignesBudgetaires(lignesBudgetaires.filter(l => l.id !== ligne.id));
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    // Parser le fichier CSV/Excel
    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const parsed = [];
        
        // Détecter le séparateur (virgule ou point-virgule)
        const separator = lines[0].includes(';') ? ';' : ',';
        
        // Ignorer la première ligne si c'est un en-tête
        const startIndex = lines[0].toLowerCase().includes('code') || lines[0].toLowerCase().includes('ligne') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const cols = lines[i].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 2 && cols[0] && cols[1]) {
            // Vérifier si le code n'existe pas déjà
            if (!lignesBudgetaires.find(l => l.code === cols[0]) && !parsed.find(p => p.code === cols[0])) {
              parsed.push({ code: cols[0], libelle: cols[1] });
            }
          }
        }
        
        setImportData(parsed);
      };
      reader.readAsText(file);
    };

    const handleImport = async () => {
      if (importData.length === 0) {
        alert('Aucune ligne à importer');
        return;
      }
      
      setImporting(true);
      try {
        const newLignes = [];
        for (const ligne of importData) {
          const docRef = await addDoc(collection(db, 'lignesBudgetaires'), ligne);
          newLignes.push({ id: docRef.id, ...ligne });
        }
        setLignesBudgetaires([...lignesBudgetaires, ...newLignes].sort((a, b) => a.code.localeCompare(b.code)));
        setShowImportModal(false);
        setImportData([]);
        alert(`${newLignes.length} ligne(s) importée(s) avec succès !`);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'importation');
      }
      setImporting(false);
    };

    return (
      <div>
        <div style={{ ...styles.card, background: '#e8f5e9', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📚</span>
            <div>
              <strong style={{ color: '#2e7d32' }}>Bibliothèque de référence</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                Ces lignes servent de référence pour créer vos budgets. Importez votre nomenclature une fois, puis réutilisez-la.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ color: '#6c757d', margin: 0 }}>{lignesBudgetaires.length} ligne(s) dans la bibliothèque</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowImportModal(true)} style={{ ...styles.buttonSecondary, background: '#e3f2fd', color: '#1565c0' }}>
              📥 Importer CSV/Excel
            </button>
            <button onClick={() => setShowModal(true)} style={styles.button}>➕ Nouvelle ligne</button>
          </div>
        </div>

        <div style={styles.card}>
          {lignesBudgetaires.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 50, marginBottom: 16 }}>📋</div>
              <p style={{ color: '#6c757d', marginBottom: 16 }}>Aucune ligne budgétaire dans la bibliothèque</p>
              <p style={{ color: '#adb5bd', fontSize: 13 }}>Importez un fichier CSV ou ajoutez des lignes manuellement</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>CODE</th>
                  <th style={styles.th}>LIBELLÉ</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {lignesBudgetaires.map(ligne => {
                  const isUsed = budgets.some(b => b.lignes?.some(l => l.code === ligne.code));
                  return (
                    <tr key={ligne.id}>
                      <td style={styles.td}>
                        <code style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 12px', borderRadius: 6, fontWeight: 600 }}>{ligne.code}</code>
                      </td>
                      <td style={styles.td}>{ligne.libelle}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {isUsed ? (
                          <span style={{ ...styles.badge, background: '#f5f5f5', color: '#9e9e9e' }}>Utilisée</span>
                        ) : (
                          <button onClick={() => handleDelete(ligne)} style={{ ...styles.buttonSecondary, padding: '6px 12px', background: '#ffebee', color: '#c62828' }}>🗑️</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Nouvelle ligne */}
        {showModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 500 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>➕ Nouvelle ligne budgétaire</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Code *</label>
                    <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} style={styles.input} placeholder="Ex: 6221" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Libellé *</label>
                    <input value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})} style={styles.input} placeholder="Ex: Personnel temporaire" />
                  </div>
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setShowModal(false)} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleSave} style={styles.button}>✓ Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Import */}
        {showImportModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 700 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#1565c0', color: 'white' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>📥 Importer la nomenclature</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <strong style={{ color: '#1565c0' }}>Format attendu :</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>
                    Fichier CSV avec 2 colonnes : <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>Code</code> et <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>Libellé</code>
                    <br />Séparateur : virgule (,) ou point-virgule (;)
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#777' }}>
                    Exemple : <code>6221;Personnel temporaire</code>
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Sélectionner un fichier CSV</label>
                  <input 
                    type="file" 
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    style={{ padding: 10, border: '2px dashed #e9ecef', borderRadius: 8, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {importData.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <strong style={{ color: '#2e7d32' }}>✓ {importData.length} ligne(s) prête(s) à importer</strong>
                    </div>
                    <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8 }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, position: 'sticky', top: 0 }}>CODE</th>
                            <th style={{ ...styles.th, position: 'sticky', top: 0 }}>LIBELLÉ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importData.map((ligne, i) => (
                            <tr key={i}>
                              <td style={styles.td}><code style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{ligne.code}</code></td>
                              <td style={{ ...styles.td, fontSize: 13 }}>{ligne.libelle}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowImportModal(false); setImportData([]); }} style={styles.buttonSecondary}>Annuler</button>
                <button 
                  onClick={handleImport} 
                  disabled={importing || importData.length === 0}
                  style={{ 
                    ...styles.button, 
                    background: '#1565c0',
                    opacity: importing || importData.length === 0 ? 0.6 : 1 
                  }}
                >
                  {importing ? 'Importation...' : `✓ Importer ${importData.length} ligne(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== PAGE BÉNÉFICIAIRES ====================
  const PageBeneficiaires = () => {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editBen, setEditBen] = useState(null);
    const [form, setForm] = useState({ nom: '', ncc: '', ribs: [] });
    const [newRib, setNewRib] = useState({ banque: '', numero: '' });
    const [importData, setImportData] = useState([]);
    const [importing, setImporting] = useState(false);

    const filtered = beneficiaires.filter(b => 
      b.nom?.toLowerCase().includes(search.toLowerCase()) ||
      b.ncc?.toLowerCase().includes(search.toLowerCase())
    );

    // Fonction utilitaire pour obtenir les RIB (rétrocompatibilité avec ancien format)
    const getRibs = (ben) => {
      if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
      if (ben.rib) return [{ banque: '', numero: ben.rib }];
      return [];
    };

    const openNew = () => {
      setForm({ nom: '', ncc: '', ribs: [] });
      setNewRib({ banque: '', numero: '' });
      setEditBen(null);
      setShowModal(true);
    };

    const openEdit = (ben) => {
      setForm({ 
        nom: ben.nom, 
        ncc: ben.ncc || '', 
        ribs: getRibs(ben)
      });
      setNewRib({ banque: '', numero: '' });
      setEditBen(ben);
      setShowModal(true);
    };

    // Ajouter un RIB
    const addRib = () => {
      if (!newRib.numero.trim()) {
        alert('Veuillez saisir le numéro RIB');
        return;
      }
      setForm({ ...form, ribs: [...form.ribs, { banque: newRib.banque.trim(), numero: newRib.numero.trim() }] });
      setNewRib({ banque: '', numero: '' });
    };

    // Supprimer un RIB
    const removeRib = (index) => {
      setForm({ ...form, ribs: form.ribs.filter((_, i) => i !== index) });
    };

    // Import CSV/Excel
    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Détecter le séparateur (virgule, point-virgule, ou tabulation)
        const firstLine = lines[0] || '';
        let separator = ';';
        if (firstLine.includes('\t')) separator = '\t';
        else if (firstLine.split(',').length > firstLine.split(';').length) separator = ',';

        const parsed = [];
        lines.forEach((line, index) => {
          const cols = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
          
          // Ignorer l'en-tête si présent
          if (index === 0) {
            const firstCol = cols[0]?.toLowerCase();
            if (firstCol === 'nom' || firstCol === 'name' || firstCol === 'beneficiaire' || firstCol === 'raison sociale') {
              return;
            }
          }

          if (cols[0]) {
            const nom = cols[0].toUpperCase();
            // Vérifier si le nom existe déjà
            const exists = beneficiaires.find(b => b.nom === nom);
            if (!exists) {
              // Convertir ancien format rib en nouveau format ribs
              const ribs = cols[2] ? [{ banque: '', numero: cols[2] }] : [];
              parsed.push({
                nom: nom,
                ncc: cols[1] || '',
                ribs: ribs
              });
            }
          }
        });

        setImportData(parsed);
      };
      reader.readAsText(file);
    };

    const handleImport = async () => {
      if (importData.length === 0) return;
      
      setImporting(true);
      try {
        const newBeneficiaires = [];
        for (const ben of importData) {
          const docRef = await addDoc(collection(db, 'beneficiaires'), ben);
          newBeneficiaires.push({ id: docRef.id, ...ben });
        }
        setBeneficiaires([...beneficiaires, ...newBeneficiaires].sort((a, b) => a.nom.localeCompare(b.nom)));
        setShowImportModal(false);
        setImportData([]);
        alert(`${newBeneficiaires.length} bénéficiaire(s) importé(s) avec succès`);
      } catch (error) {
        console.error('Erreur import:', error);
        alert('Erreur lors de l\'import');
      }
      setImporting(false);
    };

    const handleSave = async () => {
      if (!form.nom) {
        alert('Le nom est obligatoire');
        return;
      }
      try {
        const dataToSave = {
          nom: form.nom.toUpperCase(),
          ncc: form.ncc || '',
          ribs: form.ribs || []
        };
        
        if (editBen) {
          await updateDoc(doc(db, 'beneficiaires', editBen.id), dataToSave);
          setBeneficiaires(beneficiaires.map(b => b.id === editBen.id ? { ...b, ...dataToSave } : b));
        } else {
          const docRef = await addDoc(collection(db, 'beneficiaires'), dataToSave);
          setBeneficiaires([...beneficiaires, { id: docRef.id, ...dataToSave }].sort((a, b) => a.nom.localeCompare(b.nom)));
        }
        setShowModal(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sauvegarde');
      }
    };

    const handleDelete = async (ben) => {
      if (!window.confirm(`Supprimer "${ben.nom}" ?`)) return;
      try {
        await deleteDoc(doc(db, 'beneficiaires', ben.id));
        setBeneficiaires(beneficiaires.filter(b => b.id !== ben.id));
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>👥 Bénéficiaires</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowImportModal(true)} style={{ ...styles.buttonSecondary, background: '#e3f2fd', color: '#1565c0' }}>
              📥 Importer CSV
            </button>
            <button onClick={openNew} style={styles.button}>➕ Nouveau</button>
          </div>
        </div>

        <div style={{ ...styles.card, padding: 16, marginBottom: 20 }}>
          <input 
            type="text" 
            placeholder="🔍 Rechercher par nom ou NCC..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ ...styles.input, marginBottom: 0 }}
          />
        </div>

        <div style={styles.card}>
          <div style={{ marginBottom: 16, color: '#6c757d', fontSize: 14 }}>{filtered.length} bénéficiaire(s)</div>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', padding: 40 }}>Aucun bénéficiaire trouvé</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>NOM</th>
                  <th style={styles.th}>NCC</th>
                  <th style={styles.th}>RIB(s)</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ben => {
                  const ribs = getRibs(ben);
                  return (
                    <tr key={ben.id}>
                      <td style={styles.td}><strong>{ben.nom}</strong></td>
                      <td style={styles.td}>{ben.ncc || <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>-</span>}</td>
                      <td style={styles.td}>
                        {ribs.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {ribs.map((rib, i) => (
                              <div key={i} style={{ fontSize: 11 }}>
                                {rib.banque && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 6px', borderRadius: 4, marginRight: 6, fontWeight: 600 }}>{rib.banque}</span>}
                                <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{rib.numero}</code>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>-</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => openEdit(ben)} style={{ ...styles.buttonSecondary, padding: '6px 12px', marginRight: 8 }}>✏️</button>
                        <button onClick={() => handleDelete(ben)} style={{ ...styles.buttonSecondary, padding: '6px 12px', background: '#ffebee', color: '#c62828' }}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 600 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{editBen ? '✏️ Modifier' : '➕ Nouveau bénéficiaire'}</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nom / Raison sociale *</label>
                  <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} style={styles.input} placeholder="Ex: SOGEA SATOM" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>NCC (Compte Contribuable)</label>
                  <input value={form.ncc || ''} onChange={e => setForm({...form, ncc: e.target.value})} style={styles.input} placeholder="Ex: 1904588 U" />
                </div>
                
                {/* Section RIB */}
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Références bancaires (RIB)</label>
                  
                  {/* Liste des RIB existants */}
                  {form.ribs && form.ribs.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      {form.ribs.map((rib, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: 'white', padding: 10, borderRadius: 6, border: '1px solid #e9ecef' }}>
                          {rib.banque && (
                            <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                              {rib.banque}
                            </span>
                          )}
                          <code style={{ flex: 1, fontSize: 12, color: '#333' }}>{rib.numero}</code>
                          <button 
                            type="button"
                            onClick={() => removeRib(index)} 
                            style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Formulaire ajout nouveau RIB */}
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Banque</label>
                      <input 
                        value={newRib.banque} 
                        onChange={e => setNewRib({...newRib, banque: e.target.value})} 
                        style={{ ...styles.input, marginBottom: 0, padding: '8px 10px' }} 
                        placeholder="SGBCI" 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Numéro RIB</label>
                      <input 
                        value={newRib.numero} 
                        onChange={e => setNewRib({...newRib, numero: e.target.value})} 
                        style={{ ...styles.input, marginBottom: 0, padding: '8px 10px', fontFamily: 'monospace' }} 
                        placeholder="CI005 01012 012345678901 25" 
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={addRib} 
                      style={{ ...styles.button, padding: '8px 16px' }}
                    >
                      ➕
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setShowModal(false)} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleSave} style={styles.button}>✓ Enregistrer</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Import Bénéficiaires */}
        {showImportModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 700 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#1565c0', color: 'white' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>📥 Importer des bénéficiaires</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <strong style={{ color: '#1565c0' }}>📋 Format attendu (CSV/Excel)</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>
                    3 colonnes : <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>Nom ; NCC ; RIB</code><br/>
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Séparateur accepté : virgule, point-virgule ou tabulation. Les doublons seront ignorés.</span>
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Fichier à importer</label>
                  <input 
                    type="file" 
                    accept=".csv,.txt,.xls,.xlsx"
                    onChange={handleFileUpload}
                    style={{ width: '100%', padding: 12, border: '2px dashed #1565c0', borderRadius: 8, cursor: 'pointer' }}
                  />
                </div>

                {importData.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <strong style={{ color: '#2e7d32' }}>✓ {importData.length} bénéficiaire(s) à importer</strong>
                    </div>
                    <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8 }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, fontSize: 11 }}>NOM</th>
                            <th style={{ ...styles.th, fontSize: 11 }}>NCC</th>
                            <th style={{ ...styles.th, fontSize: 11 }}>RIB</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importData.slice(0, 50).map((ben, i) => (
                            <tr key={i}>
                              <td style={{ ...styles.td, fontSize: 12 }}>{ben.nom}</td>
                              <td style={{ ...styles.td, fontSize: 12 }}>{ben.ncc || '-'}</td>
                              <td style={{ ...styles.td, fontSize: 12, fontFamily: 'monospace' }}>
                                {ben.ribs && ben.ribs.length > 0 ? ben.ribs[0].numero : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importData.length > 50 && (
                        <div style={{ padding: 12, textAlign: 'center', color: '#6c757d', fontSize: 12 }}>
                          ... et {importData.length - 50} autre(s)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowImportModal(false); setImportData([]); }} style={styles.buttonSecondary}>Annuler</button>
                <button 
                  onClick={handleImport} 
                  disabled={importing || importData.length === 0}
                  style={{ 
                    ...styles.button, 
                    background: '#1565c0',
                    opacity: importing || importData.length === 0 ? 0.6 : 1 
                  }}
                >
                  {importing ? 'Import en cours...' : `✓ Importer ${importData.length} bénéficiaire(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== PAGE BUDGET ====================
  const PageBudget = () => {
    // Utiliser la source globale ou la première source par défaut
    const activeSource = activeBudgetSource || sources[0]?.id || null;
    const setActiveSource = (sourceId) => setActiveBudgetSource(sourceId);
    
    const [showAnterieur, setShowAnterieur] = useState(false);
    const [selectedExercice, setSelectedExercice] = useState(exerciceActif?.id || null);
    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [selectedLigne, setSelectedLigne] = useState('');
    const [budgetLignes, setBudgetLignes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [password, setPassword] = useState('');
    const [motifRevision, setMotifRevision] = useState('');
    const [selectedVersion, setSelectedVersion] = useState(null);

    const PASSWORD_CORRECTION = 'admin';

    // Obtenir le budget actuel pour la source et l'exercice sélectionnés
    const currentExerciceId = showAnterieur ? selectedExercice : exerciceActif?.id;
    const currentExerciceObj = exercices.find(e => e.id === currentExerciceId);
    const currentSourceObj = sources.find(s => s.id === activeSource);

    // Obtenir tous les budgets pour cette source/exercice (toutes versions)
    const allBudgetsForSourceExercice = budgets
      .filter(b => b.sourceId === activeSource && b.exerciceId === currentExerciceId)
      .sort((a, b) => (b.version || 1) - (a.version || 1));

    // Budget actif = dernière version
    const currentBudget = selectedVersion 
      ? allBudgetsForSourceExercice.find(b => b.id === selectedVersion)
      : allBudgetsForSourceExercice[0];
    
    const latestVersion = allBudgetsForSourceExercice[0];
    const isLatestVersion = !selectedVersion || selectedVersion === latestVersion?.id;

    // Calculer les engagements par ligne (depuis les OP)
    const getEngagementLigne = (ligneCode) => {
      return ops
        .filter(op => 
          op.sourceId === activeSource && 
          op.exerciceId === currentExerciceId &&
          op.ligneBudgetaire === ligneCode &&
          ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
          op.statut !== 'REJETE' &&
          op.statut !== 'ANNULE'
        )
        .reduce((sum, op) => sum + (op.montant || 0), 0);
    };

    // Ouvrir modal création (budget initial)
    const openCreateModal = () => {
      setBudgetLignes([]);
      setSelectedLigne('');
      setShowModal(true);
    };

    // Ouvrir modal correction (avec mot de passe)
    const openCorrectionModal = () => {
      setPassword('');
      setShowPasswordModal(true);
    };

    // Vérifier mot de passe et ouvrir édition
    const verifyPasswordAndEdit = () => {
      if (password === PASSWORD_CORRECTION) {
        setShowPasswordModal(false);
        setBudgetLignes(currentBudget.lignes.map(l => ({ ...l })));
        setSelectedLigne('');
        setShowModal(true);
      } else {
        alert('Mot de passe incorrect');
      }
    };

    // Ouvrir modal nouvelle révision
    const openRevisionModal = () => {
      setMotifRevision('');
      setShowRevisionModal(true);
    };

    // Créer une nouvelle révision
    const createRevision = async () => {
      if (!motifRevision.trim()) {
        alert('Veuillez indiquer le motif de la révision');
        return;
      }

      setSaving(true);
      try {
        const newVersion = (latestVersion?.version || 1) + 1;
        const revisionData = {
          sourceId: activeSource,
          exerciceId: currentExerciceId,
          version: newVersion,
          lignes: latestVersion.lignes.map(l => ({ ...l })),
          motifRevision: motifRevision.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'budgets'), revisionData);
        setBudgets([...budgets, { id: docRef.id, ...revisionData }]);
        setShowRevisionModal(false);
        
        // Ouvrir l'édition de la nouvelle version
        setBudgetLignes(revisionData.lignes);
        setSelectedLigne('');
        setSelectedVersion(docRef.id);
        setShowModal(true);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création de la révision');
      }
      setSaving(false);
    };

    // Ajouter une ligne au budget (depuis le select)
    const addLigne = () => {
      if (!selectedLigne) return;
      const ligne = lignesBudgetaires.find(l => l.code === selectedLigne);
      if (!ligne) return;
      if (budgetLignes.find(l => l.code === ligne.code)) {
        alert('Cette ligne existe déjà dans le budget');
        return;
      }
      setBudgetLignes([...budgetLignes, { code: ligne.code, libelle: ligne.libelle, dotation: 0 }]);
      setSelectedLigne('');
    };

    // Supprimer une ligne du budget
    const removeLigne = (code) => {
      const engagement = getEngagementLigne(code);
      if (engagement > 0) {
        alert(`Impossible de supprimer cette ligne.\n\nElle a des engagements de ${formatMontant(engagement)} FCFA.\n\nVous devez d'abord supprimer ou modifier les OP imputés sur cette ligne.`);
        return;
      }
      setBudgetLignes(budgetLignes.filter(l => l.code !== code));
    };

    // Modifier la dotation d'une ligne
    const updateDotation = (code, dotation) => {
      const engagement = getEngagementLigne(code);
      const newDotation = parseInt(dotation) || 0;
      
      if (newDotation < engagement) {
        alert(`⚠️ Attention\n\nLa dotation (${formatMontant(newDotation)}) est inférieure aux engagements (${formatMontant(engagement)}).\n\nCela créera un disponible négatif.`);
      }
      
      setBudgetLignes(budgetLignes.map(l => 
        l.code === code ? { ...l, dotation: newDotation } : l
      ));
    };

    // Sauvegarder le budget
    const handleSave = async () => {
      if (budgetLignes.length === 0) {
        alert('Veuillez ajouter au moins une ligne budgétaire');
        return;
      }

      setSaving(true);
      try {
        const budgetData = {
          sourceId: activeSource,
          exerciceId: currentExerciceId,
          lignes: budgetLignes,
          updatedAt: new Date().toISOString()
        };

        if (currentBudget && isLatestVersion) {
          // Mise à jour (correction)
          await updateDoc(doc(db, 'budgets', currentBudget.id), budgetData);
          setBudgets(budgets.map(b => b.id === currentBudget.id ? { ...b, ...budgetData } : b));
        } else if (!currentBudget) {
          // Création budget initial
          budgetData.version = 1;
          budgetData.createdAt = new Date().toISOString();
          const docRef = await addDoc(collection(db, 'budgets'), budgetData);
          setBudgets([...budgets, { id: docRef.id, ...budgetData }]);
        }

        setShowModal(false);
        setSelectedVersion(null);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sauvegarde');
      }
      setSaving(false);
    };

    // Calculer les totaux
    const getTotaux = (budget) => {
      if (!budget || !budget.lignes) return { dotation: 0, engagement: 0, disponible: 0 };
      
      let totalDotation = 0;
      let totalEngagement = 0;

      budget.lignes.forEach(ligne => {
        totalDotation += ligne.dotation || 0;
        totalEngagement += getEngagementLigne(ligne.code);
      });

      return {
        dotation: totalDotation,
        engagement: totalEngagement,
        disponible: totalDotation - totalEngagement
      };
    };

    const totaux = getTotaux(currentBudget);

    // Lignes disponibles (de la bibliothèque, non encore dans le budget)
    const lignesDisponibles = lignesBudgetaires.filter(l => 
      !budgetLignes.find(bl => bl.code === l.code)
    );

    // Label de version
    const getVersionLabel = (budget) => {
      if (!budget) return '';
      const v = budget.version || 1;
      if (v === 1) return 'Budget Initial (v1)';
      return `Révision ${v - 1} (v${v})`;
    };

    // Export du suivi budgétaire
    const exportSuiviBudgetaire = () => {
      if (!currentBudget || !currentBudget.lignes) return;

      const now = new Date().toLocaleDateString('fr-FR');
      let csv = `SUIVI BUDGETAIRE - ${currentSourceObj?.nom || ''}\n`;
      csv += `Exercice: ${currentExerciceObj?.annee || ''}\n`;
      csv += `Version: ${getVersionLabel(currentBudget)}\n`;
      csv += `Date d'export: ${now}\n\n`;
      
      csv += `Code;Libellé;Dotation;Engagements;Disponible;Taux (%)\n`;
      
      currentBudget.lignes.forEach(ligne => {
        const engagement = getEngagementLigne(ligne.code);
        const disponible = (ligne.dotation || 0) - engagement;
        const taux = ligne.dotation > 0 ? ((engagement / ligne.dotation) * 100).toFixed(1) : '0';
        csv += `${ligne.code};${ligne.libelle};${ligne.dotation || 0};${engagement};${disponible};${taux}\n`;
      });
      
      csv += `\nTOTAL;;${totaux.dotation};${totaux.engagement};${totaux.disponible};${totaux.dotation > 0 ? ((totaux.engagement / totaux.dotation) * 100).toFixed(1) : '0'}\n`;

      const filename = `Suivi_Budget_${currentSourceObj?.sigle || 'Source'}_${currentExerciceObj?.annee || ''}_v${currentBudget.version || 1}.csv`;
      exportToCSV(csv, filename);
    };

    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>💰 Budget</h1>
        
        {/* Onglets Sources */}
        <div style={styles.sourceTabs}>
          {sources.length === 0 ? (
            <div style={{ color: '#6c757d', fontSize: 14 }}>
              Aucune source configurée. <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Configurer les sources</span>
            </div>
          ) : (
            sources.map(source => (
              <div
                key={source.id}
                onClick={() => { setActiveSource(source.id); setSelectedVersion(null); }}
                style={activeSource === source.id 
                  ? { ...styles.sourceTabActive, background: source.couleur || '#0f4c3a', borderColor: source.couleur || '#0f4c3a' }
                  : styles.sourceTab
                }
              >
                {source.sigle || source.nom}
              </div>
            ))
          )}
        </div>

        {sources.length > 0 && activeSource && (
          <>
            {/* Sélection exercice + Version */}
            <div style={{ ...styles.card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 13, color: '#6c757d' }}>Exercice : </span>
                    <strong style={{ fontSize: 18, color: '#0f4c3a' }}>{currentExerciceObj?.annee || 'Non défini'}</strong>
                    {!showAnterieur && exerciceActif && <span style={{ ...styles.badge, background: '#e8f5e9', color: '#2e7d32', marginLeft: 8 }}>Actif</span>}
                  </div>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input 
                      type="checkbox" 
                      checked={showAnterieur} 
                      onChange={(e) => {
                        setShowAnterieur(e.target.checked);
                        if (!e.target.checked) setSelectedExercice(exerciceActif?.id);
                        setSelectedVersion(null);
                      }}
                    />
                    Consulter exercices antérieurs
                  </label>

                  {showAnterieur && (
                    <select 
                      value={selectedExercice || ''} 
                      onChange={(e) => { setSelectedExercice(e.target.value); setSelectedVersion(null); }}
                      style={{ padding: '8px 12px', borderRadius: 6, border: '2px solid #e9ecef', fontSize: 14 }}
                    >
                      {exercices.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Boutons actions */}
                {!showAnterieur && exerciceActif && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!currentBudget ? (
                      <button onClick={openCreateModal} style={styles.button}>
                        ➕ Créer le budget initial
                      </button>
                    ) : (
                      <>
                        <button onClick={openCorrectionModal} style={{ ...styles.buttonSecondary, background: '#fff3e0', color: '#e65100' }}>
                          🔐 Correction
                        </button>
                        <button onClick={openRevisionModal} style={styles.button}>
                          📝 Nouvelle révision
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Affichage version actuelle */}
              {currentBudget && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ ...styles.badge, background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', fontSize: 13 }}>
                      {getVersionLabel(currentBudget)}
                    </span>
                    {!isLatestVersion && (
                      <span style={{ ...styles.badge, background: '#ffebee', color: '#c62828' }}>🔒 Version archivée</span>
                    )}
                    {currentBudget.motifRevision && (
                      <span style={{ fontSize: 13, color: '#6c757d', fontStyle: 'italic' }}>
                        "{currentBudget.motifRevision}"
                      </span>
                    )}
                  </div>
                  
                  {allBudgetsForSourceExercice.length > 1 && (
                    <button onClick={() => {
                      setHistoriqueParams({ sourceId: activeSource, exerciceId: currentExerciceId });
                      setCurrentPage('historique');
                    }} style={{ ...styles.buttonSecondary, padding: '6px 12px', fontSize: 12 }}>
                      📜 Historique ({allBudgetsForSourceExercice.length} versions)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={styles.card}>
                <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>💰 Dotation totale</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: currentSourceObj?.couleur || '#0f4c3a', fontFamily: 'monospace' }}>
                  {formatMontant(totaux.dotation)}
                </div>
              </div>
              <div style={styles.card}>
                <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>📝 Engagements</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f0b429', fontFamily: 'monospace' }}>
                  {formatMontant(totaux.engagement)}
                </div>
              </div>
              <div style={styles.card}>
                <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>✅ Disponible</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: totaux.disponible >= 0 ? '#06d6a0' : '#dc3545', fontFamily: 'monospace' }}>
                  {formatMontant(totaux.disponible)}
                </div>
              </div>
            </div>

            {/* Tableau du budget */}
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Lignes budgétaires - {currentSourceObj?.nom} ({currentExerciceObj?.annee})
                </h3>
                {currentBudget && currentBudget.lignes && currentBudget.lignes.length > 0 && (
                  <button onClick={exportSuiviBudgetaire} style={{ ...styles.buttonSecondary, padding: '8px 16px', fontSize: 12, background: '#e3f2fd', color: '#1565c0' }}>
                    📥 Exporter Excel
                  </button>
                )}
              </div>

              {!currentBudget || !currentBudget.lignes || currentBudget.lignes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                  <div style={{ fontSize: 50, marginBottom: 16 }}>📊</div>
                  <p>Aucun budget défini pour cette source et cet exercice</p>
                  {lignesBudgetaires.length === 0 && (
                    <p style={{ fontSize: 13, color: '#adb5bd', marginTop: 8 }}>
                      ⚠️ Vous devez d'abord importer vos lignes budgétaires dans les <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span>
                    </p>
                  )}
                  {!showAnterieur && exerciceActif && lignesBudgetaires.length > 0 && (
                    <button onClick={openCreateModal} style={{ ...styles.button, marginTop: 16 }}>
                      ➕ Créer le budget initial
                    </button>
                  )}
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>CODE</th>
                      <th style={styles.th}>LIBELLÉ</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>DOTATION</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>ENGAGEMENTS</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>DISPONIBLE</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>TAUX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBudget.lignes.map(ligne => {
                      const engagement = getEngagementLigne(ligne.code);
                      const disponible = (ligne.dotation || 0) - engagement;
                      const taux = ligne.dotation > 0 ? ((engagement / ligne.dotation) * 100).toFixed(1) : 0;
                      
                      return (
                        <tr key={ligne.code}>
                          <td style={styles.td}>
                            <code style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                              {ligne.code}
                            </code>
                          </td>
                          <td style={styles.td}>{ligne.libelle}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                            {formatMontant(ligne.dotation)}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#f0b429' }}>
                            {formatMontant(engagement)}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: disponible >= 0 ? '#06d6a0' : '#dc3545' }}>
                            {formatMontant(disponible)}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <div style={{ 
                              background: taux >= 100 ? '#ffebee' : taux >= 80 ? '#fff3e0' : '#e8f5e9',
                              color: taux >= 100 ? '#c62828' : taux >= 80 ? '#e65100' : '#2e7d32',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              display: 'inline-block'
                            }}>
                              {taux}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f9fa', fontWeight: 600 }}>
                      <td colSpan={2} style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatMontant(totaux.dotation)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#f0b429', fontWeight: 700 }}>
                        {formatMontant(totaux.engagement)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: totaux.disponible >= 0 ? '#06d6a0' : '#dc3545', fontWeight: 700 }}>
                        {formatMontant(totaux.disponible)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ 
                          background: '#e3f2fd',
                          color: '#1565c0',
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          {totaux.dotation > 0 ? ((totaux.engagement / totaux.dotation) * 100).toFixed(1) : 0}%
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </>
        )}

        {/* Modal Création/Modification Budget */}
        {showModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 800 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: currentSourceObj?.couleur || '#0f4c3a', color: 'white' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  {currentBudget ? `✏️ Modifier - ${getVersionLabel(currentBudget)}` : '➕ Créer le budget initial'} - {currentSourceObj?.nom} ({currentExerciceObj?.annee})
                </h2>
              </div>
              
              <div style={{ padding: 24 }}>
                {/* Ajouter une ligne via Autocomplete */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    ➕ Ajouter une ligne depuis la bibliothèque
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Autocomplete
                        options={lignesDisponibles.map(ligne => ({
                          value: ligne.code,
                          label: `${ligne.code} - ${ligne.libelle}`,
                          searchFields: [ligne.code, ligne.libelle]
                        }))}
                        value={selectedLigne ? 
                          lignesDisponibles.filter(x => x.code === selectedLigne).map(l => ({
                            value: l.code,
                            label: `${l.code} - ${l.libelle}`
                          }))[0] || null
                        : null}
                        onChange={(option) => setSelectedLigne(option?.value || '')}
                        placeholder="🔍 Rechercher par code ou libellé..."
                        noOptionsMessage="Aucune ligne disponible"
                        accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                      />
                    </div>
                    <button 
                      onClick={addLigne} 
                      disabled={!selectedLigne}
                      style={{ 
                        ...styles.button, 
                        opacity: selectedLigne ? 1 : 0.5,
                        cursor: selectedLigne ? 'pointer' : 'not-allowed'
                      }}
                    >
                      ➕ Ajouter
                    </button>
                  </div>
                  {lignesBudgetaires.length === 0 && (
                    <p style={{ fontSize: 12, color: '#c62828', marginTop: 8 }}>
                      ⚠️ Aucune ligne dans la bibliothèque. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setShowModal(false); setCurrentPage('parametres'); }}>Importer des lignes</span>
                    </p>
                  )}
                </div>

                {/* Lignes du budget */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Lignes du budget ({budgetLignes.length})
                  </label>
                  
                  {budgetLignes.length === 0 ? (
                    <div style={{ padding: 24, background: '#f8f9fa', borderRadius: 8, textAlign: 'center', color: '#6c757d' }}>
                      Aucune ligne ajoutée. Sélectionnez une ligne dans la liste ci-dessus.
                    </div>
                  ) : (
                    <div style={{ background: '#f8f9fa', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, width: 100 }}>CODE</th>
                            <th style={styles.th}>LIBELLÉ</th>
                            <th style={{ ...styles.th, width: 180 }}>DOTATION (FCFA)</th>
                            <th style={{ ...styles.th, width: 120, textAlign: 'right' }}>ENGAGÉ</th>
                            <th style={{ ...styles.th, width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetLignes.map(ligne => {
                            const engagement = getEngagementLigne(ligne.code);
                            return (
                              <tr key={ligne.code}>
                                <td style={styles.td}>
                                  <code style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>
                                    {ligne.code}
                                  </code>
                                </td>
                                <td style={{ ...styles.td, fontSize: 13 }}>{ligne.libelle}</td>
                                <td style={styles.td}>
                                  <input
                                    type="number"
                                    value={ligne.dotation || ''}
                                    onChange={(e) => updateDotation(ligne.code, e.target.value)}
                                    placeholder="0"
                                    style={{ 
                                      width: '100%', 
                                      padding: '8px 10px', 
                                      border: '2px solid #e9ecef', 
                                      borderRadius: 6, 
                                      fontFamily: 'monospace',
                                      textAlign: 'right',
                                      fontSize: 14,
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </td>
                                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: engagement > 0 ? '#f0b429' : '#adb5bd', fontSize: 13 }}>
                                  {formatMontant(engagement)}
                                </td>
                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                  <button
                                    onClick={() => removeLigne(ligne.code)}
                                    title={engagement > 0 ? 'Impossible de supprimer (engagements existants)' : 'Supprimer'}
                                    style={{ 
                                      padding: '4px 8px', 
                                      background: engagement > 0 ? '#f5f5f5' : '#ffebee', 
                                      color: engagement > 0 ? '#bdbdbd' : '#c62828', 
                                      border: 'none', 
                                      borderRadius: 4, 
                                      cursor: engagement > 0 ? 'not-allowed' : 'pointer',
                                      fontSize: 14
                                    }}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#e9ecef' }}>
                            <td colSpan={2} style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                            <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, textAlign: 'right', paddingRight: 16 }}>
                              {formatMontant(budgetLignes.reduce((sum, l) => sum + (l.dotation || 0), 0))}
                            </td>
                            <td style={{ ...styles.td, fontFamily: 'monospace', color: '#f0b429', textAlign: 'right' }}>
                              {formatMontant(budgetLignes.reduce((sum, l) => sum + getEngagementLigne(l.code), 0))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowModal(false); setSelectedVersion(null); }} style={styles.buttonSecondary}>Annuler</button>
                <button 
                  onClick={handleSave} 
                  disabled={saving || budgetLignes.length === 0}
                  style={{ 
                    ...styles.button, 
                    background: currentSourceObj?.couleur || '#0f4c3a',
                    opacity: saving || budgetLignes.length === 0 ? 0.6 : 1,
                    cursor: saving || budgetLignes.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Enregistrement...' : '✓ Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Mot de passe */}
        {showPasswordModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 400 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e65100', color: 'white' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>🔐 Correction du budget</h2>
              </div>
              <div style={{ padding: 24 }}>
                <p style={{ marginBottom: 16, color: '#555' }}>
                  Vous allez modifier le budget actuel. Cette action nécessite un mot de passe administrateur.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mot de passe</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyPasswordAndEdit()}
                    placeholder="Entrez le mot de passe"
                    style={styles.input}
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setShowPasswordModal(false)} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={verifyPasswordAndEdit} style={{ ...styles.button, background: '#e65100' }}>✓ Valider</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nouvelle révision */}
        {showRevisionModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 500 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: currentSourceObj?.couleur || '#0f4c3a', color: 'white' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>📝 Créer une nouvelle révision</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <strong style={{ color: '#e65100' }}>⚠️ Information importante</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>
                    Une nouvelle révision (v{(latestVersion?.version || 1) + 1}) sera créée. 
                    La version actuelle ({getVersionLabel(latestVersion)}) sera archivée et ne pourra plus être modifiée.
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Motif de la révision *</label>
                  <textarea 
                    value={motifRevision} 
                    onChange={(e) => setMotifRevision(e.target.value)}
                    placeholder="Ex: Augmentation suite avenant, Report exercice N-1, etc."
                    style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
                  />
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setShowRevisionModal(false)} style={styles.buttonSecondary}>Annuler</button>
                <button 
                  onClick={() => {
                    if (!motifRevision.trim()) {
                      alert('Le motif de la révision est obligatoire');
                      return;
                    }
                    createRevision();
                  }} 
                  disabled={saving || !motifRevision.trim()}
                  style={{ 
                    ...styles.button, 
                    background: currentSourceObj?.couleur || '#0f4c3a',
                    opacity: saving || !motifRevision.trim() ? 0.6 : 1,
                    cursor: saving || !motifRevision.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Création...' : '✓ Créer la révision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== PAGE HISTORIQUE BUDGET ====================
  const PageHistoriqueBudget = () => {
    const { sourceId, exerciceId } = historiqueParams;
    
    const currentSourceObj = sources.find(s => s.id === sourceId);
    const currentExerciceObj = exercices.find(e => e.id === exerciceId);
    
    // Obtenir tous les budgets pour cette source/exercice
    const allBudgetsForSourceExercice = budgets
      .filter(b => b.sourceId === sourceId && b.exerciceId === exerciceId)
      .sort((a, b) => (a.version || 1) - (b.version || 1)); // Trier par version croissante
    
    const latestVersion = allBudgetsForSourceExercice[allBudgetsForSourceExercice.length - 1];

    // Calculer les totaux d'un budget
    const getTotaux = (budget) => {
      if (!budget || !budget.lignes) return { dotation: 0 };
      return {
        dotation: budget.lignes.reduce((sum, l) => sum + (l.dotation || 0), 0)
      };
    };

    // Label de version
    const getVersionLabel = (budget) => {
      if (!budget) return '';
      const v = budget.version || 1;
      if (v === 1) return 'Budget Initial';
      return `V${v}`;
    };

    // Export de l'historique
    const exportHistorique = () => {
      if (allBudgetsForSourceExercice.length === 0) return;

      const now = new Date().toLocaleDateString('fr-FR');
      let csv = `HISTORIQUE DES VERSIONS BUDGETAIRES - ${currentSourceObj?.nom || ''}\n`;
      csv += `Exercice: ${currentExerciceObj?.annee || ''}\n`;
      csv += `Date d'export: ${now}\n\n`;
      
      // En-tête avec dates
      csv += `DATE;`;
      allBudgetsForSourceExercice.forEach(budget => {
        csv += `${budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-'};`;
      });
      csv += `\n`;

      // En-tête avec versions
      csv += `LIGNE;`;
      allBudgetsForSourceExercice.forEach((budget, index) => {
        csv += `${getVersionLabel(budget)}${index > 0 ? ' (variation)' : ''};`;
      });
      csv += `DOTATION FINALE\n`;

      // Collecter toutes les lignes
      const allLignes = new Map();
      allBudgetsForSourceExercice.forEach(budget => {
        (budget.lignes || []).forEach(ligne => {
          if (!allLignes.has(ligne.code)) {
            allLignes.set(ligne.code, ligne.libelle);
          }
        });
      });

      // Lignes de données
      Array.from(allLignes.keys()).sort().forEach(code => {
        csv += `${code};`;
        
        let prevDotation = 0;
        allBudgetsForSourceExercice.forEach((budget, index) => {
          const ligne = (budget.lignes || []).find(l => l.code === code);
          const dotation = ligne?.dotation || 0;
          
          if (index === 0) {
            csv += `${dotation};`;
          } else {
            const variation = dotation - prevDotation;
            csv += `${variation === 0 ? '' : (variation > 0 ? '+' : '') + variation};`;
          }
          prevDotation = dotation;
        });
        
        // Dotation finale
        const lastBudget = allBudgetsForSourceExercice[allBudgetsForSourceExercice.length - 1];
        const lastLigne = (lastBudget?.lignes || []).find(l => l.code === code);
        csv += `${lastLigne?.dotation || 0}\n`;
      });

      // Ligne total
      csv += `TOTAL;`;
      let prevTotal = 0;
      allBudgetsForSourceExercice.forEach((budget, index) => {
        const total = (budget.lignes || []).reduce((sum, l) => sum + (l.dotation || 0), 0);
        if (index === 0) {
          csv += `${total};`;
        } else {
          const variation = total - prevTotal;
          csv += `${variation === 0 ? '' : (variation > 0 ? '+' : '') + variation};`;
        }
        prevTotal = total;
      });
      csv += `${getTotaux(latestVersion).dotation}\n`;

      const filename = `Historique_Budget_${currentSourceObj?.sigle || 'Source'}_${currentExerciceObj?.annee || ''}.csv`;
      exportToCSV(csv, filename);
    };

    if (!sourceId || !exerciceId) {
      return (
        <div>
          <button onClick={() => setCurrentPage('budget')} style={{ ...styles.buttonSecondary, marginBottom: 20 }}>
            ← Retour au budget
          </button>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: '#6c757d' }}>Aucune donnée à afficher</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <button onClick={() => setCurrentPage('budget')} style={{ ...styles.buttonSecondary, padding: '8px 16px', marginBottom: 12 }}>
              ← Retour au budget
            </button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📜 Historique des versions</h1>
            <p style={{ color: '#6c757d', marginTop: 8 }}>
              <span style={{ 
                display: 'inline-block', 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                background: currentSourceObj?.couleur || '#0f4c3a',
                marginRight: 8
              }}></span>
              {currentSourceObj?.nom} - Exercice {currentExerciceObj?.annee}
            </p>
          </div>
          <button onClick={exportHistorique} style={{ ...styles.button, background: '#1565c0' }}>
            📥 Exporter Excel
          </button>
        </div>

        {/* Légende des versions */}
        <div style={{ ...styles.card, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {allBudgetsForSourceExercice.map((budget) => (
              <div key={budget.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  background: budget.id === latestVersion?.id ? '#4caf50' : currentSourceObj?.couleur || '#0f4c3a' 
                }}></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {getVersionLabel(budget)}
                    {budget.id === latestVersion?.id && <span style={{ color: '#4caf50', marginLeft: 4 }}>(actif)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#6c757d' }}>
                    {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-'}
                    {budget.motifRevision && ` - ${budget.motifRevision}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tableau principal */}
        <div style={styles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                {/* Ligne des dates */}
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ ...styles.th, borderBottom: 'none', minWidth: 150 }}>DATE</th>
                  {allBudgetsForSourceExercice.map(budget => (
                    <th key={budget.id} style={{ ...styles.th, textAlign: 'right', borderBottom: 'none', minWidth: 120 }}>
                      {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </th>
                  ))}
                  <th style={{ ...styles.th, textAlign: 'right', borderBottom: 'none', minWidth: 140, background: '#e8f5e9' }}></th>
                </tr>
                {/* Ligne des versions */}
                <tr>
                  <th style={{ ...styles.th, minWidth: 150 }}>LIGNE</th>
                  {allBudgetsForSourceExercice.map((budget, index) => (
                    <th key={budget.id} style={{ 
                      ...styles.th, 
                      textAlign: 'right', 
                      minWidth: 120,
                      background: budget.id === latestVersion?.id ? '#e8f5e9' : '#f8f9fa'
                    }}>
                      {getVersionLabel(budget)}
                      {index > 0 && <div style={{ fontSize: 9, fontWeight: 400, color: '#6c757d' }}>(variation)</div>}
                    </th>
                  ))}
                  <th style={{ ...styles.th, textAlign: 'right', minWidth: 140, background: currentSourceObj?.couleur || '#0f4c3a', color: 'white' }}>
                    DOTATION FINALE
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Collecter toutes les lignes
                  const allLignes = new Map();
                  allBudgetsForSourceExercice.forEach(budget => {
                    (budget.lignes || []).forEach(ligne => {
                      if (!allLignes.has(ligne.code)) {
                        allLignes.set(ligne.code, ligne.libelle);
                      }
                    });
                  });

                  return Array.from(allLignes.keys()).sort().map(code => {
                    // Calculer les valeurs pour chaque version
                    const valuesPerVersion = allBudgetsForSourceExercice.map((budget, index) => {
                      const ligne = (budget.lignes || []).find(l => l.code === code);
                      const dotation = ligne?.dotation || 0;
                      
                      let variation = null;
                      if (index > 0) {
                        const prevBudget = allBudgetsForSourceExercice[index - 1];
                        const prevLigne = (prevBudget.lignes || []).find(l => l.code === code);
                        variation = dotation - (prevLigne?.dotation || 0);
                      }
                      
                      return { dotation, variation, isLatest: budget.id === latestVersion?.id };
                    });

                    const dotationFinale = valuesPerVersion[valuesPerVersion.length - 1]?.dotation || 0;

                    return (
                      <tr key={code}>
                        <td style={styles.td}>
                          <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                            {code}
                          </code>
                          <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>{allLignes.get(code)}</div>
                        </td>
                        {valuesPerVersion.map((item, index) => (
                          <td key={index} style={{ 
                            ...styles.td, 
                            textAlign: 'right', 
                            fontFamily: 'monospace',
                            background: item.isLatest ? '#f1f8e9' : 'transparent'
                          }}>
                            {index === 0 ? (
                              <span style={{ fontWeight: 500 }}>{formatMontant(item.dotation)}</span>
                            ) : (
                              item.variation === 0 ? (
                                <span style={{ color: '#bdbdbd' }}>-</span>
                              ) : (
                                <span style={{ 
                                  color: item.variation > 0 ? '#2e7d32' : '#c62828',
                                  fontWeight: 600
                                }}>
                                  {item.variation > 0 ? '+' : ''}{formatMontant(item.variation)}
                                </span>
                              )
                            )}
                          </td>
                        ))}
                        <td style={{ 
                          ...styles.td, 
                          textAlign: 'right', 
                          fontFamily: 'monospace', 
                          fontWeight: 700,
                          background: '#e8f5e9',
                          color: currentSourceObj?.couleur || '#0f4c3a'
                        }}>
                          {formatMontant(dotationFinale)}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f9fa' }}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                  {allBudgetsForSourceExercice.map((budget, index) => {
                    const totalDotation = (budget.lignes || []).reduce((sum, l) => sum + (l.dotation || 0), 0);
                    
                    let variation = null;
                    if (index > 0) {
                      const prevBudget = allBudgetsForSourceExercice[index - 1];
                      const prevTotal = (prevBudget.lignes || []).reduce((sum, l) => sum + (l.dotation || 0), 0);
                      variation = totalDotation - prevTotal;
                    }

                    return (
                      <td key={budget.id} style={{ 
                        ...styles.td, 
                        textAlign: 'right', 
                        fontFamily: 'monospace', 
                        fontWeight: 700,
                        background: budget.id === latestVersion?.id ? '#e8f5e9' : '#f8f9fa'
                      }}>
                        {index === 0 ? (
                          formatMontant(totalDotation)
                        ) : (
                          variation === 0 ? (
                            <span style={{ color: '#bdbdbd' }}>-</span>
                          ) : (
                            <span style={{ color: variation > 0 ? '#2e7d32' : '#c62828' }}>
                              {variation > 0 ? '+' : ''}{formatMontant(variation)}
                            </span>
                          )
                        )}
                      </td>
                    );
                  })}
                  <td style={{ 
                    ...styles.td, 
                    textAlign: 'right', 
                    fontFamily: 'monospace', 
                    fontWeight: 700,
                    fontSize: 16,
                    background: currentSourceObj?.couleur || '#0f4c3a',
                    color: 'white'
                  }}>
                    {formatMontant(getTotaux(latestVersion).dotation)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==================== PAGE NOUVEL OP ====================
  const PageNouvelOp = () => {
    const [activeSource, setActiveSource] = useState(sources[0]?.id || null);
    const [form, setForm] = useState({
      type: 'PROVISOIRE',
      beneficiaireId: '',
      ribIndex: 0,
      modeReglement: 'VIREMENT',
      objet: '',
      piecesJustificatives: '',
      montant: '',
      ligneBudgetaire: '',
      montantTVA: '',
      tvaRecuperable: false,
      opProvisoireNumero: '',
      opProvisoireId: ''
    });
    const [saving, setSaving] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    const currentSourceObj = sources.find(s => s.id === activeSource);
    const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);
    
    // Fonction utilitaire pour obtenir les RIB (rétrocompatibilité)
    const getBeneficiaireRibs = (ben) => {
      if (!ben) return [];
      if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
      if (ben.rib) return [{ banque: '', numero: ben.rib }];
      return [];
    };
    
    const beneficiaireRibs = getBeneficiaireRibs(selectedBeneficiaire);
    const selectedRib = beneficiaireRibs[form.ribIndex] || beneficiaireRibs[0] || null;

    // OP disponibles pour duplication (tous les OP de la même source/exercice)
    const opsPourDuplication = ops.filter(op => 
      op.sourceId === activeSource &&
      op.exerciceId === exerciceActif?.id
    ).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Fonction de duplication (sans montant ni TVA)
    const handleDuplicate = (opId) => {
      const op = ops.find(o => o.id === opId);
      if (!op) return;
      
      // Pré-remplir le formulaire avec les données de l'OP sélectionné
      // Montant et TVA ne sont PAS copiés car ils peuvent varier
      setForm({
        type: op.type === 'ANNULATION' ? 'PROVISOIRE' : op.type, // Tous les types sauf Annulation
        beneficiaireId: op.beneficiaireId || '',
        ribIndex: 0,
        modeReglement: op.modeReglement || 'VIREMENT',
        objet: op.objet || '',
        piecesJustificatives: op.piecesJustificatives || '',
        montant: '', // À saisir
        ligneBudgetaire: op.ligneBudgetaire || '',
        montantTVA: '', // À saisir
        tvaRecuperable: op.tvaRecuperable || false,
        opProvisoireNumero: '',
        opProvisoireId: ''
      });
      
      setShowDuplicateModal(false);
    };
    
    // Budget actif pour la source et l'exercice actif
    const currentBudget = budgets
      .filter(b => b.sourceId === activeSource && b.exerciceId === exerciceActif?.id)
      .sort((a, b) => (b.version || 1) - (a.version || 1))[0];

    // Ligne budgétaire sélectionnée
    const selectedLigne = currentBudget?.lignes?.find(l => l.code === form.ligneBudgetaire);

    // Calculs budgétaires
    const getDotation = () => selectedLigne?.dotation || 0;
    
    const getEngagementsAnterieurs = () => {
      if (!form.ligneBudgetaire) return 0;
      return ops
        .filter(op => 
          op.sourceId === activeSource && 
          op.exerciceId === exerciceActif?.id &&
          op.ligneBudgetaire === form.ligneBudgetaire &&
          ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
          !['REJETE', 'ANNULE'].includes(op.statut)
        )
        .reduce((sum, op) => sum + (op.montant || 0), 0);
    };

    const getEngagementActuel = () => {
      const montant = parseFloat(form.montant) || 0;
      // Pour Annulation : libère le budget (négatif)
      if (form.type === 'ANNULATION') return -montant;
      // Pour Définitif : remplace le provisoire, donc pas d'impact supplémentaire si même montant
      if (form.type === 'DEFINITIF' && form.opProvisoireId) {
        const opProv = ops.find(o => o.id === form.opProvisoireId);
        return montant - (opProv?.montant || 0);
      }
      return montant;
    };

    const getEngagementsCumules = () => getEngagementsAnterieurs() + getEngagementActuel();
    const getDisponible = () => getDotation() - getEngagementsCumules();

    // OP Provisoires disponibles pour Annulation/Définitif
    const opProvisoiresDisponibles = ops.filter(op => 
      op.sourceId === activeSource &&
      op.exerciceId === exerciceActif?.id &&
      op.type === 'PROVISOIRE' &&
      !['REJETE', 'ANNULE'].includes(op.statut) &&
      !ops.find(o => o.opProvisoireId === op.id && ['DEFINITIF', 'ANNULATION'].includes(o.type))
    );

    // Générer le prochain numéro
    const genererNumero = () => {
      const sigleProjet = projet?.sigle || 'PROJET';
      const sigleSource = currentSourceObj?.sigle || 'OP';
      const annee = exerciceActif?.annee || new Date().getFullYear();
      const opsSource = ops.filter(op => 
        op.sourceId === activeSource && 
        op.exerciceId === exerciceActif?.id
      );
      const nextNum = opsSource.length + 1;
      return `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
    };

    // Quand on sélectionne un OP Provisoire
    const handleSelectOpProvisoire = (opId) => {
      if (!opId) {
        setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '' });
        return;
      }
      const op = ops.find(o => o.id === opId);
      if (op) {
        setForm({
          ...form,
          opProvisoireId: opId,
          opProvisoireNumero: op.numero,
          beneficiaireId: op.beneficiaireId,
          ligneBudgetaire: op.ligneBudgetaire,
          objet: op.objet,
          montant: form.type === 'ANNULATION' ? String(op.montant) : form.montant,
          modeReglement: op.modeReglement || 'VIREMENT'
        });
      }
    };

    // Effacer le formulaire
    const handleClear = () => {
      setForm({
        type: 'PROVISOIRE',
        beneficiaireId: '',
        ribIndex: 0,
        modeReglement: 'VIREMENT',
        objet: '',
        piecesJustificatives: '',
        montant: '',
        ligneBudgetaire: '',
        montantTVA: '',
        tvaRecuperable: false,
        opProvisoireNumero: '',
        opProvisoireId: ''
      });
    };

    // Validation et sauvegarde
    const handleSave = async () => {
      // Validations
      if (!activeSource) {
        alert('Veuillez sélectionner une source de financement');
        return;
      }
      if (!exerciceActif) {
        alert('Aucun exercice actif. Veuillez en définir un dans les Paramètres.');
        return;
      }
      if (!form.type) {
        alert('Veuillez sélectionner le type d\'OP');
        return;
      }
      if (!form.beneficiaireId) {
        alert('Veuillez sélectionner un bénéficiaire');
        return;
      }
      if (!form.ligneBudgetaire) {
        alert('Veuillez sélectionner une ligne budgétaire');
        return;
      }
      if (!form.objet.trim()) {
        alert('Veuillez saisir l\'objet de la dépense');
        return;
      }
      if (!form.montant || parseFloat(form.montant) <= 0) {
        alert('Veuillez saisir un montant valide');
        return;
      }
      if (['ANNULATION', 'DEFINITIF'].includes(form.type) && !form.opProvisoireId && !form.opProvisoireNumero.trim()) {
        alert(`Veuillez renseigner le N° d'OP Provisoire à ${form.type === 'ANNULATION' ? 'annuler' : 'régulariser'}`);
        return;
      }

      // Vérification disponible (bloquant si < 0 sauf pour Annulation)
      if (form.type !== 'ANNULATION' && getDisponible() < 0) {
        alert(`❌ Impossible de créer cet OP.\n\nLe disponible budgétaire serait négatif (${formatMontant(getDisponible())} FCFA).\n\nVeuillez réduire le montant ou augmenter la dotation.`);
        return;
      }

      setSaving(true);
      try {
        const numero = genererNumero();
        const opData = {
          numero,
          type: form.type,
          sourceId: activeSource,
          exerciceId: exerciceActif.id,
          beneficiaireId: form.beneficiaireId,
          modeReglement: form.modeReglement,
          rib: selectedRib ? selectedRib : null,
          ligneBudgetaire: form.ligneBudgetaire,
          objet: form.objet.trim(),
          piecesJustificatives: form.piecesJustificatives.trim(),
          montant: parseFloat(form.montant),
          montantTVA: form.montantTVA ? parseFloat(form.montantTVA) : null,
          tvaRecuperable: form.tvaRecuperable,
          statut: 'CREE',
          opProvisoireId: form.opProvisoireId || null,
          opProvisoireNumero: form.opProvisoireNumero || null,
          dateCreation: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'ops'), opData);
        setOps([...ops, { id: docRef.id, ...opData }]);

        alert(`✅ OP ${numero} créé avec succès !`);
        handleClear();
        setCurrentPage('ops');
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création de l\'OP');
      }
      setSaving(false);
    };

    return (
      <div>
        {/* En-tête */}
        <div style={{ 
          background: currentSourceObj?.couleur || '#0f4c3a', 
          color: 'white', 
          padding: '20px 24px', 
          borderRadius: '10px 10px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            FORMULAIRE OP {currentSourceObj?.sigle || ''}
          </h1>
          <div style={{ display: 'flex', gap: 12 }}>
            {sources.map(source => (
              <button
                key={source.id}
                onClick={() => setActiveSource(source.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeSource === source.id ? 'white' : 'rgba(255,255,255,0.2)',
                  color: activeSource === source.id ? (source.couleur || '#0f4c3a') : 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {source.sigle || source.nom}
              </button>
            ))}
          </div>
        </div>

        {!exerciceActif ? (
          <div style={{ ...styles.card, borderRadius: '0 0 10px 10px', textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 50, marginBottom: 16 }}>⚠️</div>
            <p style={{ color: '#e65100', fontWeight: 600 }}>Aucun exercice actif</p>
            <p style={{ color: '#6c757d' }}>Veuillez définir un exercice actif dans les <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span></p>
          </div>
        ) : (
          <div style={{ ...styles.card, borderRadius: '0 0 10px 10px', padding: 0 }}>
            <div style={{ padding: 24 }}>
              {/* Ligne 1 : N°OP + Boutons Dupliquer/Effacer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 20 }}>
                <div style={{ width: 250 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N° OP</label>
                  <input 
                    type="text" 
                    value={genererNumero()} 
                    readOnly 
                    style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontWeight: 700, fontFamily: 'monospace', fontSize: 16 }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => setShowDuplicateModal(true)} 
                    style={{ ...styles.buttonSecondary, padding: '12px 20px', background: '#fff3e0', color: '#e65100' }}
                  >
                    📋 Dupliquer un OP
                  </button>
                  <button onClick={handleClear} style={{ ...styles.buttonSecondary, padding: '12px 24px' }}>
                    EFFACER
                  </button>
                </div>
              </div>

              {/* Ligne 2 : Type d'OP en boutons compacts */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>TYPE D'OP *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'PROVISOIRE', label: 'Provisoire', color: '#ff9800' },
                    { value: 'DIRECT', label: 'Direct', color: '#2196f3' },
                    { value: 'DEFINITIF', label: 'Définitif', color: '#4caf50' },
                    { value: 'ANNULATION', label: 'Annulation', color: '#f44336' }
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: type.value, opProvisoireId: '', opProvisoireNumero: '' })}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: form.type === type.value ? type.color : '#f0f0f0',
                        color: form.type === type.value ? 'white' : '#555',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ligne 3 : Bénéficiaire, NCC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>BÉNÉFICIAIRE *</label>
                  <Autocomplete
                    options={beneficiaires.map(b => ({
                      value: b.id,
                      label: b.nom,
                      searchFields: [b.nom, b.ncc || '', ...(b.ribs || []).map(r => r.numero), ...(b.ribs || []).map(r => r.banque), b.rib || '']
                    }))}
                    value={form.beneficiaireId ? {
                      value: form.beneficiaireId,
                      label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || ''
                    } : null}
                    onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })}
                    placeholder="🔍 Rechercher par nom ou NCC..."
                    isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                    noOptionsMessage="Aucun bénéficiaire trouvé"
                    accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N°CC</label>
                  <input 
                    type="text" 
                    value={selectedBeneficiaire?.ncc || ''} 
                    readOnly 
                    style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} 
                  />
                </div>
              </div>

              {/* Ligne 3 : Mode de règlement */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>MODE DE RÈGLEMENT</label>
                <div style={{ display: 'flex', gap: 30 }}>
                  {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="modeReglement" 
                        checked={form.modeReglement === mode}
                        onChange={() => setForm({ ...form, modeReglement: mode })}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ligne 4 : Références bancaires */}
              {form.modeReglement === 'VIREMENT' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>
                    RÉFÉRENCES BANCAIRES (RIB) {beneficiaireRibs.length > 1 && '*'}
                  </label>
                  {!selectedBeneficiaire ? (
                    <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', color: '#adb5bd', fontStyle: 'italic' }}>
                      Sélectionnez d'abord un bénéficiaire
                    </div>
                  ) : beneficiaireRibs.length === 0 ? (
                    <div style={{ ...styles.input, marginBottom: 0, background: '#fff3e0', color: '#e65100' }}>
                      ⚠️ Aucun RIB enregistré pour ce bénéficiaire
                    </div>
                  ) : beneficiaireRibs.length === 1 ? (
                    <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {beneficiaireRibs[0].banque && (
                        <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                          {beneficiaireRibs[0].banque}
                        </span>
                      )}
                      <span>{beneficiaireRibs[0].numero}</span>
                    </div>
                  ) : (
                    <select
                      value={form.ribIndex}
                      onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })}
                      style={{ ...styles.input, marginBottom: 0 }}
                    >
                      {beneficiaireRibs.map((rib, index) => (
                        <option key={index} value={index}>
                          {rib.banque ? `${rib.banque} - ` : ''}{rib.numero}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Ligne 5 : Objet de la dépense */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>OBJET DE LA DÉPENSE *</label>
                <textarea 
                  value={form.objet} 
                  onChange={(e) => setForm({ ...form, objet: e.target.value })}
                  style={{ ...styles.input, marginBottom: 0, minHeight: 80, resize: 'vertical', background: '#fff0f0' }} 
                  placeholder="Décrire l'objet de la dépense..."
                />
              </div>

              {/* Ligne 6 : Pièces justificatives */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>PIÈCES JUSTIFICATIVES</label>
                <textarea 
                  value={form.piecesJustificatives} 
                  onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })}
                  style={{ ...styles.input, marginBottom: 0, minHeight: 60, resize: 'vertical', background: '#fff0f0' }} 
                  placeholder="Lister les pièces jointes..."
                />
              </div>

              {/* Ligne 7 : Montant et Ligne budgétaire */}
              <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT (FCFA) *</label>
                  <input 
                    type="number" 
                    value={form.montant} 
                    onChange={(e) => setForm({ ...form, montant: e.target.value })}
                    style={{ ...styles.input, marginBottom: 0, background: '#fff0f0', fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} 
                    placeholder="0"
                    disabled={form.type === 'ANNULATION' && form.opProvisoireId}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>LIGNE BUDGÉTAIRE *</label>
                  <Autocomplete
                    options={(currentBudget?.lignes || []).map(l => ({
                      value: l.code,
                      label: `${l.code} - ${l.libelle}`,
                      searchFields: [l.code, l.libelle]
                    }))}
                    value={form.ligneBudgetaire ? 
                      (currentBudget?.lignes || []).filter(x => x.code === form.ligneBudgetaire).map(l => ({
                        value: l.code,
                        label: `${l.code} - ${l.libelle}`
                      }))[0] || null
                    : null}
                    onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                    placeholder="🔍 Rechercher par code ou libellé..."
                    isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                    noOptionsMessage="Aucune ligne trouvée"
                    accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                  />
                </div>
              </div>

              {/* Ligne 8 : Infos budgétaires + Date + TVA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Colonne gauche : Infos budget */}
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Dotation budgétaire</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                    
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements antérieurs</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                    
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Engagement actuel</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: getEngagementActuel() < 0 ? '#2e7d32' : '#e65100' }}>
                      {getEngagementActuel() >= 0 ? '+' : ''}{formatMontant(getEngagementActuel())}
                    </span>
                    
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements cumulés</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsCumules())}</span>
                    
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Disponible budgétaire</span>
                    <span style={{ 
                      fontSize: 14, 
                      fontFamily: 'monospace', 
                      textAlign: 'right', 
                      fontWeight: 700,
                      color: getDisponible() >= 0 ? '#2e7d32' : '#c62828'
                    }}>
                      {formatMontant(getDisponible())}
                    </span>
                  </div>
                  {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                    <div style={{ marginTop: 12, padding: 8, background: '#ffebee', borderRadius: 4, color: '#c62828', fontSize: 12, fontWeight: 600 }}>
                      ⚠️ Budget insuffisant - OP non validable
                    </div>
                  )}
                </div>

                {/* Colonne droite : Date + TVA */}
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>DATE</label>
                    <input 
                      type="date" 
                      value={new Date().toISOString().split('T')[0]} 
                      readOnly
                      style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} 
                    />
                  </div>

                  {/* TVA pour OP Direct ou Définitif */}
                  {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8, color: '#6c757d' }}>TVA RÉCUPÉRABLE</label>
                        <div style={{ display: 'flex', gap: 20 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              checked={form.tvaRecuperable === true}
                              onChange={() => setForm({ ...form, tvaRecuperable: true })}
                            />
                            <span>OUI</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              checked={form.tvaRecuperable === false}
                              onChange={() => setForm({ ...form, tvaRecuperable: false })}
                            />
                            <span>NON</span>
                          </label>
                        </div>
                      </div>
                      {form.tvaRecuperable && (
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT TVA</label>
                          <input 
                            type="number" 
                            value={form.montantTVA} 
                            onChange={(e) => setForm({ ...form, montantTVA: e.target.value })}
                            style={{ ...styles.input, marginBottom: 0, fontFamily: 'monospace', textAlign: 'right' }} 
                            placeholder="0"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Ligne 9 : N° OP Provisoire (pour Annulation/Définitif) */}
              {['ANNULATION', 'DEFINITIF'].includes(form.type) && (
                <div style={{ marginBottom: 20, padding: 16, background: form.type === 'ANNULATION' ? '#ffebee' : '#e8f5e9', borderRadius: 8 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>
                    N° OP PROVISOIRE À {form.type === 'ANNULATION' ? 'ANNULER' : 'RÉGULARISER'} *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, marginBottom: 4, color: '#6c757d' }}>Saisie manuelle</label>
                      <input 
                        type="text" 
                        value={form.opProvisoireNumero} 
                        onChange={(e) => setForm({ ...form, opProvisoireNumero: e.target.value, opProvisoireId: '' })}
                        style={{ ...styles.input, marginBottom: 0 }} 
                        placeholder="Ex: ETAT-2025-0012"
                      />
                    </div>
                    <div style={{ padding: '0 8px', color: '#6c757d', fontSize: 12 }}>ou</div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, marginBottom: 4, color: '#6c757d' }}>Sélectionner un OP existant</label>
                      <Autocomplete
                        options={opProvisoiresDisponibles.map(op => {
                          const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                          return {
                            value: op.id,
                            label: `${op.numero} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`,
                            searchFields: [op.numero, ben?.nom || '', String(op.montant), op.objet || '']
                          };
                        })}
                        value={form.opProvisoireId ? 
                          opProvisoiresDisponibles.filter(o => o.id === form.opProvisoireId).map(op => {
                            const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                            return {
                              value: op.id,
                              label: `${op.numero} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`
                            };
                          })[0] || null
                        : null}
                        onChange={(option) => handleSelectOpProvisoire(option?.value || '')}
                        placeholder="🔍 Rechercher par N°, bénéficiaire..."
                        noOptionsMessage="Aucun OP Provisoire disponible"
                        accentColor={form.type === 'ANNULATION' ? '#c62828' : '#2e7d32'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton Enregistrer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
                <button
                  onClick={handleSave}
                  disabled={saving || (getDisponible() < 0 && form.type !== 'ANNULATION')}
                  style={{
                    ...styles.button,
                    padding: '14px 40px',
                    fontSize: 16,
                    background: (getDisponible() < 0 && form.type !== 'ANNULATION') ? '#bdbdbd' : (currentSourceObj?.couleur || '#0f4c3a'),
                    cursor: (saving || (getDisponible() < 0 && form.type !== 'ANNULATION')) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Enregistrement...' : 'ENREGISTRER'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dupliquer un OP */}
        {showDuplicateModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 700 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#fff3e0' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#e65100' }}>📋 Dupliquer un OP Provisoire</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
                  <strong>Ce qui sera copié :</strong> Bénéficiaire, Mode de règlement, Objet, Pièces justificatives, Ligne budgétaire<br/>
                  <strong style={{ color: '#e65100' }}>Ce qui ne sera PAS copié :</strong> Montant, TVA (à saisir manuellement)
                </div>
                
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Rechercher un OP Provisoire</label>
                  <Autocomplete
                    options={opsPourDuplication.map(op => {
                      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                      return {
                        value: op.id,
                        label: `${op.numero} - ${ben?.nom || 'N/A'}`,
                        searchFields: [op.numero, ben?.nom || '', op.objet || '']
                      };
                    })}
                    value={null}
                    onChange={(option) => option && handleDuplicate(option.value)}
                    placeholder="🔍 Rechercher par N°, bénéficiaire, objet..."
                    noOptionsMessage="Aucun OP Provisoire trouvé"
                    accentColor="#e65100"
                  />
                </div>

                {opsPourDuplication.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Ou sélectionner dans les derniers OP Provisoires</label>
                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8 }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, fontSize: 11 }}>N° OP</th>
                            <th style={{ ...styles.th, fontSize: 11 }}>BÉNÉFICIAIRE</th>
                            <th style={{ ...styles.th, fontSize: 11 }}>OBJET</th>
                            <th style={{ ...styles.th, fontSize: 11 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {opsPourDuplication.slice(0, 10).map(op => {
                            const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                            return (
                              <tr key={op.id} style={{ cursor: 'pointer' }} onClick={() => handleDuplicate(op.id)}>
                                <td style={{ ...styles.td, fontSize: 12, fontFamily: 'monospace' }}>{op.numero}</td>
                                <td style={{ ...styles.td, fontSize: 12 }}>{ben?.nom || 'N/A'}</td>
                                <td style={{ ...styles.td, fontSize: 11, color: '#6c757d', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDuplicate(op.id); }}
                                    style={{ ...styles.button, padding: '4px 12px', fontSize: 11, background: '#e65100' }}
                                  >
                                    Dupliquer
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {opsPourDuplication.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <p>Aucun OP Provisoire créé pour cette source et cet exercice.</p>
                  </div>
                )}
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowDuplicateModal(false)} style={styles.buttonSecondary}>Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== PAGE LISTE DES OP ====================
  const PageListeOP = () => {
    const [activeSource, setActiveSource] = useState('ALL'); // 'ALL' pour toutes sources
    const [activeTab, setActiveTab] = useState('TOUS'); // Onglet de suivi actif
    const [filters, setFilters] = useState({
      type: '',
      statut: '',
      search: '',
      ligneBudgetaire: '',
      dateDebut: '',
      dateFin: ''
    });
    const [showDetail, setShowDetail] = useState(null);
    const [showActionModal, setShowActionModal] = useState(null); // { op, action: 'DIFFERER_CF'|'REJETER_CF'|... }
    const [actionForm, setActionForm] = useState({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' });
    const [showPaiementModal, setShowPaiementModal] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(null);
    const [showStatutModal, setShowStatutModal] = useState(null); // { op, nouveauStatut } - pour changement manuel de statut
    const [showEditModal, setShowEditModal] = useState(null); // OP à modifier
    const [editForm, setEditForm] = useState({});
    const [showArchiveModal, setShowArchiveModal] = useState(null); // OP à archiver
    const [showTransmissionModal, setShowTransmissionModal] = useState(null); // { op, destination: 'CF'|'AC' }
    const [showCircuitModal, setShowCircuitModal] = useState(null); // OP pour modal circuit complet
    const [circuitForm, setCircuitForm] = useState({}); // Formulaire circuit

    const currentSourceObj = activeSource === 'ALL' ? null : sources.find(s => s.id === activeSource);

    // Toutes les lignes budgétaires disponibles
    const allLignes = [...new Set(
      budgets
        .filter(b => b.exerciceId === exerciceActif?.id)
        .flatMap(b => b.lignes || [])
        .map(l => l.code)
    )].sort();

    // Couleurs par type
    const typeColors = {
      PROVISOIRE: '#ff9800',
      DIRECT: '#2196f3',
      DEFINITIF: '#4caf50',
      ANNULATION: '#f44336'
    };

    // Couleurs par statut
    const statutConfig = {
      CREE: { bg: '#e3f2fd', color: '#1565c0', label: 'Créé', icon: '🔵' },
      TRANSMIS_CF: { bg: '#fff3e0', color: '#e65100', label: 'Transmis CF', icon: '📤' },
      DIFFERE_CF: { bg: '#fff8e1', color: '#f9a825', label: 'Différé CF', icon: '⏸️' },
      RETOURNE_CF: { bg: '#e1f5fe', color: '#0277bd', label: 'Retourné CF', icon: '↩️' },
      VISE_CF: { bg: '#e8f5e9', color: '#2e7d32', label: 'Visé CF', icon: '✅' },
      REJETE_CF: { bg: '#ffebee', color: '#c62828', label: 'Rejeté CF', icon: '❌' },
      TRANSMIS_AC: { bg: '#f3e5f5', color: '#7b1fa2', label: 'Transmis AC', icon: '📤' },
      DIFFERE_AC: { bg: '#fff8e1', color: '#f9a825', label: 'Différé AC', icon: '⏸️' },
      RETOURNE_AC: { bg: '#e1f5fe', color: '#0277bd', label: 'Retourné AC', icon: '↩️' },
      PAYE_PARTIEL: { bg: '#fff3e0', color: '#ef6c00', label: 'Payé partiel', icon: '💰' },
      PAYE: { bg: '#e0f2f1', color: '#00695c', label: 'Payé', icon: '💰' },
      REJETE_AC: { bg: '#ffebee', color: '#c62828', label: 'Rejeté AC', icon: '❌' },
      ARCHIVE: { bg: '#eceff1', color: '#546e7a', label: 'Archivé', icon: '📦' }
    };

    // OP de l'exercice actif (toutes sources ou source sélectionnée)
    const opsExercice = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      return true;
    });

    // Provisoires à régulariser (sans DEFINITIF ou ANNULATION liés)
    const provisoiresARegulariser = opsExercice.filter(op => {
      if (op.type !== 'PROVISOIRE') return false;
      if (['REJETE_CF', 'REJETE_AC', 'ARCHIVE'].includes(op.statut)) return false;
      const hasRegularisation = opsExercice.some(o => 
        (o.type === 'DEFINITIF' || o.type === 'ANNULATION') && 
        o.opProvisoireId === op.id
      );
      return !hasRegularisation;
    });

    // Calcul ancienneté en jours
    const getAnciennete = (dateStr) => {
      if (!dateStr) return 0;
      const date = new Date(dateStr);
      const now = new Date();
      return Math.floor((now - date) / (1000 * 60 * 60 * 24));
    };

    // Compteurs par onglet
    const counts = {
      TOUS: opsExercice.filter(op => op.statut !== 'ARCHIVE').length,
      CIRCUIT_CF: opsExercice.filter(op => ['TRANSMIS_CF', 'DIFFERE_CF', 'RETOURNE_CF', 'VISE_CF', 'REJETE_CF'].includes(op.statut)).length,
      CIRCUIT_AC: opsExercice.filter(op => ['TRANSMIS_AC', 'DIFFERE_AC', 'RETOURNE_AC', 'PAYE_PARTIEL', 'PAYE', 'REJETE_AC'].includes(op.statut)).length,
      DIFFERES: opsExercice.filter(op => ['DIFFERE_CF', 'DIFFERE_AC', 'RETOURNE_CF', 'RETOURNE_AC'].includes(op.statut)).length,
      A_REGULARISER: provisoiresARegulariser.length,
      ARCHIVES: opsExercice.filter(op => op.statut === 'ARCHIVE').length
    };

    // Filtrer selon l'onglet actif
    const getFilteredByTab = () => {
      let result = opsExercice;
      
      switch (activeTab) {
        case 'TOUS':
          result = result.filter(op => op.statut !== 'ARCHIVE'); // Exclure archives de "Tous"
          break;
        case 'CIRCUIT_CF':
          result = result.filter(op => ['TRANSMIS_CF', 'DIFFERE_CF', 'RETOURNE_CF', 'VISE_CF', 'REJETE_CF'].includes(op.statut));
          break;
        case 'CIRCUIT_AC':
          result = result.filter(op => ['TRANSMIS_AC', 'DIFFERE_AC', 'RETOURNE_AC', 'PAYE_PARTIEL', 'PAYE', 'REJETE_AC'].includes(op.statut));
          break;
        case 'DIFFERES':
          result = result.filter(op => ['DIFFERE_CF', 'DIFFERE_AC', 'RETOURNE_CF', 'RETOURNE_AC'].includes(op.statut));
          break;
        case 'A_REGULARISER':
          result = provisoiresARegulariser;
          break;
        case 'ARCHIVES':
          result = result.filter(op => op.statut === 'ARCHIVE');
          break;
        default:
          break;
      }
      
      return result;
    };

    // Appliquer les filtres supplémentaires
    const filteredOps = getFilteredByTab().filter(op => {
      if (filters.type && op.type !== filters.type) return false;
      if (filters.statut && op.statut !== filters.statut) return false;
      if (filters.ligneBudgetaire && op.ligneBudgetaire !== filters.ligneBudgetaire) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
        const source = sources.find(s => s.id === op.sourceId);
        if (
          !op.numero?.toLowerCase().includes(search) &&
          !ben?.nom?.toLowerCase().includes(search) &&
          !op.objet?.toLowerCase().includes(search) &&
          !source?.sigle?.toLowerCase().includes(search)
        ) return false;
      }
      if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
      if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
      return true;
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Totaux
    const totaux = {
      count: filteredOps.length,
      montant: filteredOps.reduce((sum, op) => sum + (op.montant || 0), 0),
      paye: filteredOps.reduce((sum, op) => sum + (op.totalPaye || 0), 0)
    };

    // === ACTIONS ===
    
    // Ouvrir modal transmission CF
    const handleOpenTransmissionCF = (op) => {
      setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauCF || '' });
      setShowTransmissionModal({ op, destination: 'CF' });
    };

    // Ouvrir modal transmission AC
    const handleOpenTransmissionAC = (op) => {
      setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauAC || '' });
      setShowTransmissionModal({ op, destination: 'AC' });
    };

    // Confirmer transmission (CF ou AC)
    const handleConfirmTransmission = async () => {
      const { op, destination } = showTransmissionModal;
      try {
        const updates = { 
          statut: destination === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC',
          updatedAt: new Date().toISOString()
        };
        
        if (destination === 'CF') {
          updates.dateTransmissionCF = actionForm.date;
          updates.bordereauCF = actionForm.bordereau.trim() || null;
        } else {
          updates.dateTransmissionAC = actionForm.date;
          updates.bordereauAC = actionForm.bordereau.trim() || null;
        }
        
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
        setShowTransmissionModal(null);
        setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' });
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la transmission');
      }
    };

    // Viser CF
    const handleViserCF = async (op) => {
      if (!window.confirm(`Viser l'OP ${op.numero} ?`)) return;
      try {
        const updates = { 
          statut: 'VISE_CF',
          dateVisaCF: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du visa');
      }
    };

    // Retourner pour correction (CF ou AC)
    const handleRetourner = async (op, origine) => {
      const motif = window.prompt(`Motif du retour par le ${origine} :`);
      if (!motif) return;
      try {
        const updates = { 
          statut: origine === 'CF' ? 'RETOURNE_CF' : 'RETOURNE_AC',
          [`dateRetour${origine}`]: new Date().toISOString().split('T')[0],
          [`motifRetour${origine}`]: motif.trim(),
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du retour');
      }
    };

    // Différer (CF ou AC)
    const handleDifferer = async () => {
      if (!actionForm.motif.trim()) {
        alert('Le motif est obligatoire');
        return;
      }
      const op = showActionModal.op;
      const isCF = showActionModal.action === 'DIFFERER_CF';
      try {
        const updates = { 
          statut: isCF ? 'DIFFERE_CF' : 'DIFFERE_AC',
          [`dateDiffere${isCF ? 'CF' : 'AC'}`]: actionForm.date,
          [`motifDiffere${isCF ? 'CF' : 'AC'}`]: actionForm.motif.trim(),
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
        setShowActionModal(null);
        setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '' });
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du différé');
      }
    };

    // Rejeter (CF ou AC) - libère le budget (protégé par mot de passe)
    const handleRejeterWithPassword = () => {
      if (!actionForm.motif.trim()) {
        alert('Le motif est obligatoire');
        return;
      }
      const op = showActionModal.op;
      const isCF = showActionModal.action === 'REJETER_CF';
      
      setShowPasswordModal({
        title: `Rejeter l'OP ${op.numero}`,
        description: `Rejet par le ${isCF ? 'CF' : 'AC'} avec motif : "${actionForm.motif.trim()}"`,
        warningMessage: `Le rejet va libérer ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire}.`,
        confirmText: '❌ Confirmer le rejet',
        confirmColor: '#c62828',
        action: async () => {
          try {
            const updates = { 
              statut: isCF ? 'REJETE_CF' : 'REJETE_AC',
              dateRejet: actionForm.date,
              motifRejet: actionForm.motif.trim(),
              rejetePar: isCF ? 'CF' : 'AC',
              updatedAt: new Date().toISOString()
            };
            await updateDoc(doc(db, 'ops', op.id), updates);
            setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
            setShowActionModal(null);
            setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '' });
            setShowPasswordModal(null);
          } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du rejet');
          }
        }
      });
    };

    // Enregistrer un paiement
    const handlePaiement = async () => {
      if (!actionForm.reference.trim()) {
        alert('La référence est obligatoire');
        return;
      }
      const montantPaye = parseFloat(actionForm.montant);
      if (!montantPaye || montantPaye <= 0) {
        alert('Le montant doit être supérieur à 0');
        return;
      }
      
      const op = showPaiementModal;
      const totalPayeActuel = op.totalPaye || 0;
      const resteAPayer = op.montant - totalPayeActuel;
      
      if (montantPaye > resteAPayer) {
        alert(`Le montant ne peut pas dépasser le reste à payer (${formatMontant(resteAPayer)} FCFA)`);
        return;
      }
      
      try {
        const nouveauPaiement = {
          date: actionForm.date,
          reference: actionForm.reference.trim(),
          montant: montantPaye,
          mode: op.modeReglement || 'VIREMENT'
        };
        
        const paiements = [...(op.paiements || []), nouveauPaiement];
        const nouveauTotalPaye = totalPayeActuel + montantPaye;
        const nouveauReste = op.montant - nouveauTotalPaye;
        const nouveauStatut = nouveauReste <= 0 ? 'PAYE' : 'PAYE_PARTIEL';
        
        const updates = { 
          paiements,
          totalPaye: nouveauTotalPaye,
          resteAPayer: nouveauReste,
          statut: nouveauStatut,
          datePaiement: nouveauStatut === 'PAYE' ? actionForm.date : op.datePaiement,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
        setShowPaiementModal(null);
        setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '' });
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'enregistrement du paiement');
      }
    };

    // Archiver - ouvrir le modal
    const handleArchiver = (op) => {
      setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], boiteArchive: op.boiteArchive || '' });
      setShowArchiveModal(op);
    };
    
    // Confirmer l'archivage
    const handleConfirmArchive = async () => {
      const op = showArchiveModal;
      try {
        const updates = { 
          statut: 'ARCHIVE',
          dateArchivage: actionForm.date,
          boiteArchive: actionForm.boiteArchive.trim() || null,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
        setShowArchiveModal(null);
        setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '' });
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'archivage');
      }
    };

    // Supprimer un OP (protégé par mot de passe)
    const handleDeleteWithPassword = (op) => {
      let warningMsg = `Cette action est irréversible.`;
      
      // Avertissement selon le statut
      if (!['REJETE_CF', 'REJETE_AC', 'ARCHIVE'].includes(op.statut)) {
        warningMsg += ` Le budget de ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire} sera libéré.`;
      }
      if (['TRANSMIS_CF', 'VISE_CF', 'TRANSMIS_AC', 'PAYE_PARTIEL', 'PAYE'].includes(op.statut)) {
        warningMsg += ` ⚠️ Attention : cet OP est déjà en cours de traitement !`;
      }
      
      setShowPasswordModal({
        title: 'Supprimer un OP',
        description: `Supprimer définitivement l'OP ${op.numero} (${statutConfig[op.statut]?.label || op.statut}) ?`,
        warningMessage: warningMsg,
        confirmText: '🗑️ Confirmer la suppression',
        confirmColor: '#c62828',
        action: async () => {
          try {
            await deleteDoc(doc(db, 'ops', op.id));
            setOps(ops.filter(o => o.id !== op.id));
            setShowPasswordModal(null);
            setShowDetail(null); // Fermer le détail si ouvert
          } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression');
          }
        }
      });
    };

    // Retransmettre (après différé)
    const handleRetransmettre = async (op) => {
      const isCF = op.statut === 'DIFFERE_CF';
      if (!window.confirm(`Retransmettre l'OP ${op.numero} au ${isCF ? 'CF' : 'AC'} ?`)) return;
      try {
        const updates = { 
          statut: isCF ? 'TRANSMIS_CF' : 'TRANSMIS_AC',
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la retransmission');
      }
    };

    // Ouvrir le modal de changement de statut manuel
    const handleOpenStatutModal = (op) => {
      setShowStatutModal({ op });
      setActionForm({ 
        motif: '', 
        date: new Date().toISOString().split('T')[0], 
        reference: '', 
        montant: '',
        nouveauStatut: ''
      });
    };

    // Appliquer le changement de statut manuel
    const handleChangeStatut = async () => {
      const op = showStatutModal.op;
      const { nouveauStatut, date, motif } = actionForm;
      
      if (!nouveauStatut) {
        alert('Veuillez sélectionner un statut');
        return;
      }
      
      // Vérifier si motif obligatoire
      if (['DIFFERE_CF', 'DIFFERE_AC', 'REJETE_CF', 'REJETE_AC'].includes(nouveauStatut) && !motif.trim()) {
        alert('Le motif est obligatoire pour ce statut');
        return;
      }
      
      // Si rejet, demander mot de passe
      if (['REJETE_CF', 'REJETE_AC'].includes(nouveauStatut)) {
        setShowPasswordModal({
          title: `Changer le statut en ${statutConfig[nouveauStatut]?.label}`,
          description: `L'OP ${op.numero} sera marqué comme rejeté.`,
          warningMessage: `Le rejet va libérer ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire}.`,
          confirmText: '✓ Confirmer',
          confirmColor: '#c62828',
          action: async () => {
            await saveStatutChange(op, nouveauStatut, date, motif);
            setShowPasswordModal(null);
          }
        });
        return;
      }
      
      await saveStatutChange(op, nouveauStatut, date, motif);
    };

    // Sauvegarder le changement de statut
    const saveStatutChange = async (op, nouveauStatut, date, motif) => {
      try {
        const updates = { 
          statut: nouveauStatut,
          updatedAt: new Date().toISOString()
        };
        
        // Ajouter les dates spécifiques selon le statut
        if (nouveauStatut === 'TRANSMIS_CF') updates.dateTransmissionCF = date;
        if (nouveauStatut === 'VISE_CF') updates.dateVisaCF = date;
        if (nouveauStatut === 'TRANSMIS_AC') updates.dateTransmissionAC = date;
        if (nouveauStatut === 'DIFFERE_CF') {
          updates.dateDiffereCF = date;
          updates.motifDiffereCF = motif;
        }
        if (nouveauStatut === 'DIFFERE_AC') {
          updates.dateDiffereAC = date;
          updates.motifDiffereAC = motif;
        }
        if (nouveauStatut === 'REJETE_CF' || nouveauStatut === 'REJETE_AC') {
          updates.dateRejet = date;
          updates.motifRejet = motif;
          updates.rejetePar = nouveauStatut === 'REJETE_CF' ? 'CF' : 'AC';
        }
        if (nouveauStatut === 'ARCHIVE') updates.dateArchivage = date;
        
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
        setShowStatutModal(null);
        setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', nouveauStatut: '' });
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du changement de statut');
      }
    };

    // Désarchiver un OP
    const handleDesarchiver = async (op) => {
      if (!window.confirm(`Désarchiver l'OP ${op.numero} ? Il retournera au statut "Payé".`)) return;
      try {
        const updates = { 
          statut: 'PAYE',
          dateArchivage: null,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du désarchivage');
      }
    };

    // Ouvrir le modal de modification
    const handleOpenEdit = (op) => {
      setEditForm({
        objet: op.objet || '',
        montant: op.montant || '',
        ligneBudgetaire: op.ligneBudgetaire || '',
        modeReglement: op.modeReglement || 'VIREMENT',
        piecesJustificatives: op.piecesJustificatives || '',
        dateCreation: op.dateCreation || '',
        dateTransmissionCF: op.dateTransmissionCF || '',
        dateVisaCF: op.dateVisaCF || '',
        dateTransmissionAC: op.dateTransmissionAC || '',
        datePaiement: op.datePaiement || '',
        dateArchivage: op.dateArchivage || '',
        boiteArchive: op.boiteArchive || '',
        bordereauCF: op.bordereauCF || '',
        bordereauAC: op.bordereauAC || ''
      });
      setShowEditModal(op);
    };

    // Sauvegarder les modifications
    const handleSaveEdit = async () => {
      const op = showEditModal;
      const montantModifie = parseFloat(editForm.montant) !== op.montant;
      
      // Si le montant a changé, demander mot de passe
      if (montantModifie) {
        // Vérifier s'il y a des OP postérieurs sur la même ligne
        const opsPostérieurs = ops.filter(o => 
          o.sourceId === op.sourceId &&
          o.exerciceId === op.exerciceId &&
          o.ligneBudgetaire === editForm.ligneBudgetaire &&
          o.id !== op.id &&
          (o.createdAt || '') > (op.createdAt || '')
        );
        
        let warningMsg = `Le montant passe de ${formatMontant(op.montant)} à ${formatMontant(parseFloat(editForm.montant))} FCFA.`;
        if (opsPostérieurs.length > 0) {
          warningMsg += ` Attention : ${opsPostérieurs.length} OP postérieur(s) sur cette ligne seront impactés.`;
        }
        
        setShowPasswordModal({
          title: 'Modifier le montant',
          description: `Modification de l'OP ${op.numero}`,
          warningMessage: warningMsg,
          confirmText: '✓ Confirmer la modification',
          confirmColor: '#f57f17',
          action: async () => {
            await saveEditChanges(op);
            setShowPasswordModal(null);
          }
        });
        return;
      }
      
      await saveEditChanges(op);
    };

    // Sauvegarder les modifications
    const saveEditChanges = async (op) => {
      try {
        const updates = {
          objet: editForm.objet,
          montant: parseFloat(editForm.montant) || op.montant,
          ligneBudgetaire: editForm.ligneBudgetaire,
          modeReglement: editForm.modeReglement,
          piecesJustificatives: editForm.piecesJustificatives,
          dateCreation: editForm.dateCreation,
          dateTransmissionCF: editForm.dateTransmissionCF || null,
          dateVisaCF: editForm.dateVisaCF || null,
          dateTransmissionAC: editForm.dateTransmissionAC || null,
          datePaiement: editForm.datePaiement || null,
          dateArchivage: editForm.dateArchivage || null,
          boiteArchive: editForm.boiteArchive || null,
          bordereauCF: editForm.bordereauCF || null,
          bordereauAC: editForm.bordereauAC || null,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
        setShowEditModal(null);
        setEditForm({});
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la modification');
      }
    };

    // Export Excel
    const handleExport = () => {
      const headers = ['Source', 'N° OP', 'Création', 'Type', 'Bénéficiaire', 'Objet', 'Ligne', 'Montant', 'Trans. CF', 'Visa CF', 'Trans. AC', 'Payé', 'Reste', 'Statut', 'Motif Rejet/Différé'];
      const rows = filteredOps.map(op => {
        const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
        const source = sources.find(s => s.id === op.sourceId);
        const motif = op.motifRejet || op.motifDiffereCF || op.motifDiffereAC || '';
        return [
          source?.sigle || '',
          op.numero,
          op.dateCreation || '',
          op.type,
          ben?.nom || '',
          op.objet || '',
          op.ligneBudgetaire || '',
          op.montant || 0,
          op.dateTransmissionCF || '',
          op.dateVisaCF || '',
          op.dateTransmissionAC || '',
          op.totalPaye || 0,
          (op.montant || 0) - (op.totalPaye || 0),
          statutConfig[op.statut]?.label || op.statut,
          motif
        ];
      });

      const csvContent = '\uFEFF' + [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OP_${activeSource === 'ALL' ? 'TOUTES_SOURCES' : currentSourceObj?.sigle}_${exerciceActif?.annee}_${activeTab}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    // Ouvrir le modal de gestion complète du circuit
    const handleOpenCircuitModal = (op) => {
      setCircuitForm({
        statut: op.statut,
        dateCreation: op.dateCreation || '',
        dateTransmissionCF: op.dateTransmissionCF || '',
        dateVisaCF: op.dateVisaCF || '',
        dateTransmissionAC: op.dateTransmissionAC || '',
        datePaiement: op.datePaiement || '',
        dateArchivage: op.dateArchivage || '',
        boiteArchive: op.boiteArchive || '',
        motifDiffereCF: op.motifDiffereCF || '',
        motifDiffereAC: op.motifDiffereAC || '',
        dateDiffereCF: op.dateDiffereCF || '',
        dateDiffereAC: op.dateDiffereAC || '',
        motifRejet: op.motifRejet || '',
        dateRejet: op.dateRejet || '',
        rejetePar: op.rejetePar || 'CF'
      });
      setShowCircuitModal(op);
    };

    // Sauvegarder les modifications du circuit
    const handleSaveCircuit = async () => {
      const op = showCircuitModal;
      const nouveauStatut = circuitForm.statut;
      
      // Si rejet, demander mot de passe
      if (['REJETE_CF', 'REJETE_AC'].includes(nouveauStatut) && op.statut !== nouveauStatut) {
        setShowPasswordModal({
          title: `Rejeter l'OP ${op.numero}`,
          description: `L'OP sera marqué comme rejeté par le ${nouveauStatut === 'REJETE_CF' ? 'CF' : 'AC'}.`,
          warningMessage: `Le rejet va libérer ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire}.`,
          confirmText: '❌ Confirmer le rejet',
          confirmColor: '#c62828',
          action: async () => {
            await saveCircuitChanges(op);
            setShowPasswordModal(null);
          }
        });
        return;
      }
      
      await saveCircuitChanges(op);
    };
    
    const saveCircuitChanges = async (op) => {
      try {
        const updates = {
          statut: circuitForm.statut,
          dateCreation: circuitForm.dateCreation || null,
          dateTransmissionCF: circuitForm.dateTransmissionCF || null,
          dateVisaCF: circuitForm.dateVisaCF || null,
          dateTransmissionAC: circuitForm.dateTransmissionAC || null,
          datePaiement: circuitForm.datePaiement || null,
          dateArchivage: circuitForm.dateArchivage || null,
          boiteArchive: circuitForm.boiteArchive || null,
          dateDiffereCF: circuitForm.dateDiffereCF || null,
          motifDiffereCF: circuitForm.motifDiffereCF || null,
          dateDiffereAC: circuitForm.dateDiffereAC || null,
          motifDiffereAC: circuitForm.motifDiffereAC || null,
          dateRejet: circuitForm.dateRejet || null,
          motifRejet: circuitForm.motifRejet || null,
          rejetePar: circuitForm.rejetePar || null,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(doc(db, 'ops', op.id), updates);
        setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
        setShowCircuitModal(null);
        setCircuitForm({});
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la mise à jour');
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>📋 Liste des Ordres de Paiement</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleExport} style={{ ...styles.buttonSecondary, background: '#e8f5e9', color: '#2e7d32' }}>
              📥 Export Excel
            </button>
            <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>
              ➕ Nouvel OP
            </button>
          </div>
        </div>

        {/* Onglets de suivi */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'TOUS', label: 'Tous', icon: '📋' },
            { key: 'CIRCUIT_CF', label: 'Circuit CF', icon: '📤' },
            { key: 'CIRCUIT_AC', label: 'Circuit AC', icon: '💰' },
            { key: 'DIFFERES', label: 'Différés', icon: '⏸️' },
            { key: 'A_REGULARISER', label: 'À régulariser', icon: '⏳' },
            { key: 'ARCHIVES', label: 'Archives', icon: '📦' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === tab.key ? (tab.key === 'ARCHIVES' ? '#546e7a' : '#0f4c3a') : '#f0f0f0',
                color: activeTab === tab.key ? 'white' : '#333',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {tab.icon} {tab.label} <span style={{ 
                background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#ddd',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11
              }}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Onglets sources */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e9ecef' }}>
          <button
            onClick={() => setActiveSource('ALL')}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeSource === 'ALL' ? '3px solid #0f4c3a' : '3px solid transparent',
              background: 'transparent',
              color: activeSource === 'ALL' ? '#0f4c3a' : '#6c757d',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -2
            }}
          >
            🌐 TOUTES
          </button>
          {sources.map(source => (
            <button
              key={source.id}
              onClick={() => setActiveSource(source.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderBottom: activeSource === source.id ? `3px solid ${source.couleur}` : '3px solid transparent',
                background: 'transparent',
                color: activeSource === source.id ? source.couleur : '#6c757d',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: -2
              }}
            >
              {source.sigle}
            </button>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ ...styles.card, marginBottom: 20, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 150px 110px 110px', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>RECHERCHE</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="🔍 N°, bénéficiaire, objet..."
                style={{ ...styles.input, marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>TYPE</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                style={{ ...styles.input, marginBottom: 0 }}
              >
                <option value="">Tous</option>
                <option value="PROVISOIRE">Provisoire</option>
                <option value="DIRECT">Direct</option>
                <option value="DEFINITIF">Définitif</option>
                <option value="ANNULATION">Annulation</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>STATUT</label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                style={{ ...styles.input, marginBottom: 0 }}
              >
                <option value="">Tous</option>
                {Object.entries(statutConfig).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>LIGNE BUDGÉTAIRE</label>
              <select
                value={filters.ligneBudgetaire}
                onChange={(e) => setFilters({ ...filters, ligneBudgetaire: e.target.value })}
                style={{ ...styles.input, marginBottom: 0 }}
              >
                <option value="">Toutes</option>
                {allLignes.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>DU</label>
              <input
                type="date"
                value={filters.dateDebut}
                onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })}
                style={{ ...styles.input, marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>AU</label>
              <input
                type="date"
                value={filters.dateFin}
                onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
                style={{ ...styles.input, marginBottom: 0 }}
              />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div style={styles.card}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6c757d', fontSize: 14 }}>
              {totaux.count} OP - Montant : <strong>{formatMontant(totaux.montant)}</strong>
              {totaux.paye > 0 && <> - Payé : <strong style={{ color: '#2e7d32' }}>{formatMontant(totaux.paye)}</strong></>}
            </span>
            {(filters.type || filters.statut || filters.search || filters.ligneBudgetaire || filters.dateDebut || filters.dateFin) && (
              <button 
                onClick={() => setFilters({ type: '', statut: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '' })}
                style={{ ...styles.buttonSecondary, padding: '4px 12px', fontSize: 12 }}
              >
                ✕ Effacer filtres
              </button>
            )}
          </div>

          {filteredOps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6c757d' }}>
              <div style={{ fontSize: 50, marginBottom: 16 }}>📭</div>
              <p>Aucun OP trouvé</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {activeSource === 'ALL' && <th style={{ ...styles.th, width: 60 }}>SOURCE</th>}
                    <th style={{ ...styles.th, width: 145 }}>N° OP</th>
                    <th style={{ ...styles.th, width: 80 }}>CRÉATION</th>
                    <th style={{ ...styles.th, width: 75 }}>TYPE</th>
                    <th style={{ ...styles.th, width: 140 }}>BÉNÉFICIAIRE</th>
                    <th style={styles.th}>OBJET</th>
                    <th style={{ ...styles.th, width: 70 }}>LIGNE</th>
                    <th style={{ ...styles.th, width: 100, textAlign: 'right' }}>MONTANT</th>
                    {/* Colonnes dynamiques selon l'onglet */}
                    {activeTab === 'CIRCUIT_CF' && <th style={{ ...styles.th, width: 80 }}>TRANS. CF</th>}
                    {activeTab === 'CIRCUIT_CF' && <th style={{ ...styles.th, width: 80 }}>VISA CF</th>}
                    {activeTab === 'CIRCUIT_AC' && <th style={{ ...styles.th, width: 80 }}>TRANS. AC</th>}
                    {activeTab === 'CIRCUIT_AC' && <th style={{ ...styles.th, width: 85, textAlign: 'right' }}>PAYÉ</th>}
                    {activeTab === 'DIFFERES' && <th style={{ ...styles.th, width: 80 }}>DATE DIFF.</th>}
                    {activeTab === 'A_REGULARISER' && <th style={{ ...styles.th, width: 80 }}>ANCIENNETÉ</th>}
                    <th style={{ ...styles.th, width: 95 }}>STATUT</th>
                    <th style={{ ...styles.th, width: 100, textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOps.map(op => {
                    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                    const source = sources.find(s => s.id === op.sourceId);
                    const statut = statutConfig[op.statut] || { bg: '#f5f5f5', color: '#666', label: op.statut };
                    const anciennete = getAnciennete(op.dateCreation);
                    
                    return (
                      <tr key={op.id} style={{ cursor: 'pointer' }} onClick={() => setShowDetail(op)}>
                        {activeSource === 'ALL' && (
                          <td style={styles.td}>
                            <span style={{ 
                              background: source?.couleur || '#666', 
                              color: 'white', 
                              padding: '2px 6px', 
                              borderRadius: 4, 
                              fontSize: 10, 
                              fontWeight: 600 
                            }}>
                              {source?.sigle || '?'}
                            </span>
                          </td>
                        )}
                        <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>
                          {op.numero}
                        </td>
                        <td style={{ ...styles.td, fontSize: 11 }}>{op.dateCreation || '-'}</td>
                        <td style={styles.td}>
                          <span style={{
                            background: `${typeColors[op.type]}20`,
                            color: typeColors[op.type],
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 600
                          }}>
                            {op.type}
                          </span>
                        </td>
                        <td style={{ ...styles.td, fontSize: 11 }}>{ben?.nom || 'N/A'}</td>
                        <td style={{ ...styles.td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={op.objet}>
                          {op.objet || '-'}
                        </td>
                        <td style={{ ...styles.td, fontSize: 11, fontFamily: 'monospace' }}>{op.ligneBudgetaire || '-'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>
                          {formatMontant(op.montant)}
                        </td>
                        {/* Colonnes dynamiques selon l'onglet */}
                        {activeTab === 'CIRCUIT_CF' && (
                          <td style={{ ...styles.td, fontSize: 11 }}>{op.dateTransmissionCF || '-'}</td>
                        )}
                        {activeTab === 'CIRCUIT_CF' && (
                          <td style={{ ...styles.td, fontSize: 11, color: op.dateVisaCF ? '#2e7d32' : '#adb5bd' }}>
                            {op.dateVisaCF || '-'}
                          </td>
                        )}
                        {activeTab === 'CIRCUIT_AC' && (
                          <td style={{ ...styles.td, fontSize: 11 }}>{op.dateTransmissionAC || '-'}</td>
                        )}
                        {activeTab === 'CIRCUIT_AC' && (
                          <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: op.totalPaye ? '#2e7d32' : '#adb5bd' }}>
                            {formatMontant(op.totalPaye || 0)}
                          </td>
                        )}
                        {activeTab === 'DIFFERES' && (
                          <td style={{ ...styles.td, fontSize: 11, color: '#f9a825' }}>
                            {op.dateDiffereCF || op.dateDiffereAC || '-'}
                          </td>
                        )}
                        {activeTab === 'A_REGULARISER' && (
                          <td style={styles.td}>
                            <span style={{
                              background: anciennete > 30 ? '#ffebee' : anciennete > 15 ? '#fff3e0' : '#e8f5e9',
                              color: anciennete > 30 ? '#c62828' : anciennete > 15 ? '#e65100' : '#2e7d32',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              {anciennete}j
                            </span>
                          </td>
                        )}
                        <td style={styles.td}>
                          <span style={{
                            background: statut.bg,
                            color: statut.color,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600
                          }}>
                            {statut.label}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            {/* Bouton Modifier/Supprimer */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(op); }}
                              title="Modifier / Supprimer"
                              style={{ 
                                background: '#fff8e1', 
                                color: '#f57f17', 
                                border: 'none', 
                                borderRadius: 6, 
                                padding: '8px 12px', 
                                cursor: 'pointer', 
                                fontSize: 14
                              }}
                            >
                              ✏️
                            </button>
                            {/* Bouton Circuit */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenCircuitModal(op); }}
                              title="Gérer le circuit"
                              style={{ 
                                background: '#e3f2fd', 
                                color: '#1565c0', 
                                border: 'none', 
                                borderRadius: 6, 
                                padding: '8px 12px', 
                                cursor: 'pointer', 
                                fontSize: 14
                              }}
                            >
                              📋
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Détail OP */}
        {showDetail && (
          <div style={styles.modal} onClick={() => setShowDetail(null)}>
            <div style={{ ...styles.modalContent, maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: sources.find(s => s.id === showDetail.sourceId)?.couleur || '#0f4c3a', color: 'white' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>📋 {showDetail.numero}</h2>
              </div>
              <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
                {(() => {
                  const ben = beneficiaires.find(b => b.id === showDetail.beneficiaireId);
                  const statut = statutConfig[showDetail.statut] || { label: showDetail.statut };
                  const source = sources.find(s => s.id === showDetail.sourceId);
                  
                  // Calcul des engagements antérieurs sur la même ligne
                  const currentBudget = budgets.find(b => b.sourceId === showDetail.sourceId && b.exerciceId === showDetail.exerciceId);
                  const ligne = currentBudget?.lignes?.find(l => l.code === showDetail.ligneBudgetaire);
                  const dotation = ligne?.dotation || 0;
                  
                  const opsAnterieurs = ops.filter(o => 
                    o.sourceId === showDetail.sourceId &&
                    o.exerciceId === showDetail.exerciceId &&
                    o.ligneBudgetaire === showDetail.ligneBudgetaire &&
                    o.id !== showDetail.id &&
                    !['REJETE_CF', 'REJETE_AC'].includes(o.statut) &&
                    (o.createdAt || '') < (showDetail.createdAt || '')
                  );
                  
                  const engagementsAnterieurs = opsAnterieurs.reduce((sum, o) => {
                    if (o.type === 'PROVISOIRE' || o.type === 'DIRECT') return sum + (o.montant || 0);
                    if (o.type === 'DEFINITIF') {
                      const prov = ops.find(p => p.id === o.opProvisoireId);
                      return sum - (prov?.montant || 0) + (o.montant || 0);
                    }
                    if (o.type === 'ANNULATION') {
                      const prov = ops.find(p => p.id === o.opProvisoireId);
                      return sum - (prov?.montant || 0);
                    }
                    return sum;
                  }, 0);
                  
                  return (
                    <div style={{ display: 'grid', gap: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>SOURCE</label>
                          <div style={{ marginTop: 4 }}>
                            <span style={{ background: source?.couleur || '#666', color: 'white', padding: '4px 12px', borderRadius: 4, fontWeight: 600 }}>
                              {source?.sigle || '?'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>TYPE</label>
                          <div style={{ marginTop: 4 }}>
                            <span style={{ background: `${typeColors[showDetail.type]}20`, color: typeColors[showDetail.type], padding: '4px 12px', borderRadius: 4, fontWeight: 600 }}>
                              {showDetail.type}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>STATUT</label>
                          <div style={{ marginTop: 4 }}>
                            <span style={{ background: statut.bg, color: statut.color, padding: '4px 12px', borderRadius: 4, fontWeight: 600 }}>
                              {statut.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>BÉNÉFICIAIRE</label>
                        <div style={{ marginTop: 4, fontWeight: 600 }}>{ben?.nom || 'N/A'}</div>
                        {ben?.ncc && <div style={{ fontSize: 12, color: '#6c757d' }}>NCC: {ben.ncc}</div>}
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>OBJET</label>
                        <div style={{ marginTop: 4 }}>{showDetail.objet}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>LIGNE BUDGÉTAIRE</label>
                          <div style={{ marginTop: 4 }}><code>{showDetail.ligneBudgetaire}</code></div>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>MODE RÈGLEMENT</label>
                          <div style={{ marginTop: 4 }}>{showDetail.modeReglement}</div>
                        </div>
                      </div>
                      
                      {/* Section Budget / Engagements */}
                      <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8 }}>
                        <label style={{ fontSize: 11, color: '#1565c0', fontWeight: 600, marginBottom: 12, display: 'block' }}>📊 SITUATION BUDGÉTAIRE (Ligne {showDetail.ligneBudgetaire})</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                          <div>
                            <div style={{ color: '#6c757d', fontSize: 11 }}>Dotation</div>
                            <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatMontant(dotation)}</div>
                          </div>
                          <div>
                            <div style={{ color: '#6c757d', fontSize: 11 }}>Engagements antérieurs</div>
                            <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#e65100' }}>{formatMontant(engagementsAnterieurs)}</div>
                          </div>
                          <div>
                            <div style={{ color: '#6c757d', fontSize: 11 }}>Disponible avant cet OP</div>
                            <div style={{ fontWeight: 600, fontFamily: 'monospace', color: (dotation - engagementsAnterieurs) >= 0 ? '#2e7d32' : '#c62828' }}>
                              {formatMontant(dotation - engagementsAnterieurs)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Montants de l'OP */}
                      <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                          <div>
                            <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>MONTANT</label>
                            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>
                              {formatMontant(showDetail.montant)}
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>PAYÉ</label>
                            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#2e7d32' }}>
                              {formatMontant(showDetail.totalPaye || 0)}
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>RESTE</label>
                            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: (showDetail.montant - (showDetail.totalPaye || 0)) > 0 ? '#e65100' : '#2e7d32' }}>
                              {formatMontant(showDetail.montant - (showDetail.totalPaye || 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Dates du circuit */}
                      <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, marginBottom: 12, display: 'block' }}>📅 SUIVI DU CIRCUIT</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, fontSize: 12 }}>
                          {/* Colonne CF */}
                          <div style={{ background: '#fff3e0', padding: 12, borderRadius: 6 }}>
                            <div style={{ fontWeight: 600, color: '#e65100', marginBottom: 8 }}>Contrôleur Financier</div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Transmission</span>
                                <span style={{ fontWeight: 500 }}>{showDetail.dateTransmissionCF || '-'}</span>
                              </div>
                              {showDetail.bordereauCF && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#6c757d', fontSize: 10 }}>Bordereau</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{showDetail.bordereauCF}</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Visa</span>
                                <span style={{ fontWeight: 500, color: showDetail.dateVisaCF ? '#2e7d32' : '#adb5bd' }}>{showDetail.dateVisaCF || '-'}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Colonne AC */}
                          <div style={{ background: '#f3e5f5', padding: 12, borderRadius: 6 }}>
                            <div style={{ fontWeight: 600, color: '#7b1fa2', marginBottom: 8 }}>Agent Comptable</div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Transmission</span>
                                <span style={{ fontWeight: 500 }}>{showDetail.dateTransmissionAC || '-'}</span>
                              </div>
                              {showDetail.bordereauAC && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#6c757d', fontSize: 10 }}>Bordereau</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{showDetail.bordereauAC}</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Paiement</span>
                                <span style={{ fontWeight: 500, color: showDetail.datePaiement ? '#00695c' : '#adb5bd' }}>{showDetail.datePaiement || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Ligne Archivage */}
                        {(showDetail.dateArchivage || showDetail.boiteArchive) && (
                          <div style={{ marginTop: 12, background: '#eceff1', padding: 12, borderRadius: 6 }}>
                            <div style={{ fontWeight: 600, color: '#546e7a', marginBottom: 8 }}>📦 Archivage</div>
                            <div style={{ display: 'flex', gap: 24 }}>
                              <div>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Date : </span>
                                <span style={{ fontWeight: 500 }}>{showDetail.dateArchivage || '-'}</span>
                              </div>
                              {showDetail.boiteArchive && (
                                <div>
                                  <span style={{ color: '#6c757d', fontSize: 10 }}>Boîte : </span>
                                  <span style={{ fontWeight: 600 }}>{showDetail.boiteArchive}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Historique des paiements */}
                      {showDetail.paiements && showDetail.paiements.length > 0 && (
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, marginBottom: 8, display: 'block' }}>HISTORIQUE DES PAIEMENTS</label>
                          <table style={{ ...styles.table, fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th style={{ ...styles.th, fontSize: 11 }}>DATE</th>
                                <th style={{ ...styles.th, fontSize: 11 }}>RÉFÉRENCE</th>
                                <th style={{ ...styles.th, fontSize: 11, textAlign: 'right' }}>MONTANT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {showDetail.paiements.map((p, i) => (
                                <tr key={i}>
                                  <td style={styles.td}>{p.date}</td>
                                  <td style={{ ...styles.td, fontFamily: 'monospace' }}>{p.reference}</td>
                                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(p.montant)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Motif retour */}
                      {(showDetail.statut === 'RETOURNE_CF' || showDetail.statut === 'RETOURNE_AC') && (
                        <div style={{ background: '#e1f5fe', padding: 16, borderRadius: 8 }}>
                          <label style={{ fontSize: 11, color: '#0277bd', fontWeight: 600 }}>↩️ MOTIF DU RETOUR</label>
                          <div style={{ marginTop: 4 }}>{showDetail.motifRetourCF || showDetail.motifRetourAC}</div>
                          <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                            Date: {showDetail.dateRetourCF || showDetail.dateRetourAC}
                          </div>
                        </div>
                      )}

                      {/* Motif différé */}
                      {(showDetail.statut === 'DIFFERE_CF' || showDetail.statut === 'DIFFERE_AC') && (
                        <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8 }}>
                          <label style={{ fontSize: 11, color: '#f9a825', fontWeight: 600 }}>⏸️ MOTIF DU DIFFÉRÉ</label>
                          <div style={{ marginTop: 4 }}>{showDetail.motifDiffereCF || showDetail.motifDiffereAC}</div>
                          <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                            Date: {showDetail.dateDiffereCF || showDetail.dateDiffereAC}
                          </div>
                        </div>
                      )}

                      {/* Motif rejet */}
                      {(showDetail.statut === 'REJETE_CF' || showDetail.statut === 'REJETE_AC') && showDetail.motifRejet && (
                        <div style={{ background: '#ffebee', padding: 16, borderRadius: 8 }}>
                          <label style={{ fontSize: 11, color: '#c62828', fontWeight: 600 }}>❌ MOTIF DU REJET</label>
                          <div style={{ marginTop: 4, color: '#c62828' }}>{showDetail.motifRejet}</div>
                          <div style={{ fontSize: 12, color: '#c62828', marginTop: 4 }}>
                            Date: {showDetail.dateRejet} - Par: {showDetail.rejetePar}
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: '#6c757d' }}>
                        Créé le {showDetail.dateCreation || '-'}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={() => { handleOpenEdit(showDetail); setShowDetail(null); }} 
                    style={{ ...styles.buttonSecondary, background: '#fff8e1', color: '#f57f17' }}
                  >
                    ✏️ Modifier
                  </button>
                  <button 
                    onClick={() => { handleDeleteWithPassword(showDetail); }} 
                    style={{ ...styles.buttonSecondary, background: '#ffebee', color: '#c62828' }}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
                <button onClick={() => setShowDetail(null)} style={styles.buttonSecondary}>Fermer</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Différer / Rejeter */}
        {showActionModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={{ 
                padding: 24, 
                borderBottom: '1px solid #e9ecef', 
                background: showActionModal.action.includes('REJETER') ? '#ffebee' : '#fff8e1' 
              }}>
                <h2 style={{ margin: 0, fontSize: 18, color: showActionModal.action.includes('REJETER') ? '#c62828' : '#f9a825' }}>
                  {showActionModal.action.includes('REJETER') ? '❌ Rejeter' : '⏸️ Différer'} l'OP {showActionModal.op.numero}
                </h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date *</label>
                  <input 
                    type="date" 
                    value={actionForm.date} 
                    onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Motif *</label>
                  <textarea 
                    value={actionForm.motif} 
                    onChange={(e) => setActionForm({ ...actionForm, motif: e.target.value })}
                    style={{ ...styles.input, minHeight: 100 }}
                    placeholder={showActionModal.action.includes('REJETER') ? 'Raison du rejet...' : 'Raison du différé, corrections à apporter...'}
                  />
                </div>
                {showActionModal.action.includes('REJETER') && (
                  <div style={{ marginTop: 16, padding: 12, background: '#fff3e0', borderRadius: 8, fontSize: 13 }}>
                    ⚠️ <strong>Attention :</strong> Le rejet libérera le budget engagé par cet OP.
                  </div>
                )}
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowActionModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '' }); }} style={styles.buttonSecondary}>Annuler</button>
                <button 
                  onClick={showActionModal.action.includes('REJETER') ? handleRejeterWithPassword : handleDifferer} 
                  style={{ 
                    ...styles.button, 
                    background: showActionModal.action.includes('REJETER') ? '#c62828' : '#f9a825' 
                  }}
                >
                  {showActionModal.action.includes('REJETER') ? '❌ Confirmer le rejet' : '⏸️ Confirmer le différé'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Paiement */}
        {showPaiementModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e0f2f1' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#00695c' }}>💰 Enregistrer un paiement</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>Montant OP</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{formatMontant(showPaiementModal.montant)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>Déjà payé</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#2e7d32' }}>{formatMontant(showPaiementModal.totalPaye || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>Reste à payer</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#e65100' }}>{formatMontant(showPaiementModal.montant - (showPaiementModal.totalPaye || 0))}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date du paiement *</label>
                    <input 
                      type="date" 
                      value={actionForm.date} 
                      onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Référence *</label>
                    <input 
                      type="text" 
                      value={actionForm.reference} 
                      onChange={(e) => setActionForm({ ...actionForm, reference: e.target.value })}
                      style={styles.input}
                      placeholder="Ex: CHQ-045892, VIR-TRS-7821"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Montant payé *</label>
                  <input 
                    type="number" 
                    value={actionForm.montant} 
                    onChange={(e) => setActionForm({ ...actionForm, montant: e.target.value })}
                    style={{ ...styles.input, fontFamily: 'monospace', fontSize: 18, textAlign: 'right' }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowPaiementModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' }); }} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handlePaiement} style={{ ...styles.button, background: '#00695c' }}>
                  💰 Enregistrer le paiement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Transmission (CF ou AC) */}
        {showTransmissionModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 450 }}>
              <div style={{ 
                padding: 24, 
                borderBottom: '1px solid #e9ecef', 
                background: showTransmissionModal.destination === 'CF' ? '#fff3e0' : '#f3e5f5' 
              }}>
                <h2 style={{ margin: 0, fontSize: 18, color: showTransmissionModal.destination === 'CF' ? '#e65100' : '#7b1fa2' }}>
                  📤 Transmettre {showTransmissionModal.destination === 'CF' ? 'au CF' : 'à l\'AC'}
                </h2>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showTransmissionModal.op.numero}</div>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date de transmission *</label>
                  <input 
                    type="date" 
                    value={actionForm.date} 
                    onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    N° Bordereau de transmission {showTransmissionModal.destination}
                  </label>
                  <input 
                    type="text" 
                    value={actionForm.bordereau} 
                    onChange={(e) => setActionForm({ ...actionForm, bordereau: e.target.value })}
                    style={styles.input}
                    placeholder={`Ex: BT-${showTransmissionModal.destination}-2026-001`}
                  />
                  <span style={{ fontSize: 11, color: '#6c757d' }}>Optionnel - référence du bordereau de transmission</span>
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowTransmissionModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' }); }} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleConfirmTransmission} style={{ ...styles.button, background: showTransmissionModal.destination === 'CF' ? '#e65100' : '#7b1fa2' }}>
                  📤 Confirmer la transmission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Archivage */}
        {showArchiveModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 450 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#eceff1' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#546e7a' }}>📦 Archiver l'OP</h2>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showArchiveModal.numero}</div>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date d'archivage *</label>
                  <input 
                    type="date" 
                    value={actionForm.date} 
                    onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>N° Boîte / Classeur d'archive</label>
                  <input 
                    type="text" 
                    value={actionForm.boiteArchive} 
                    onChange={(e) => setActionForm({ ...actionForm, boiteArchive: e.target.value })}
                    style={styles.input}
                    placeholder="Ex: BOX-2026-001, Classeur IDA-A3..."
                  />
                  <span style={{ fontSize: 11, color: '#6c757d' }}>Optionnel - pour faciliter la recherche physique</span>
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowArchiveModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '' }); }} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleConfirmArchive} style={{ ...styles.button, background: '#546e7a' }}>
                  📦 Confirmer l'archivage
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Changement de statut */}
        {showStatutModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 500 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e3f2fd' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1565c0' }}>🔄 Changer le statut</h2>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showStatutModal.op.numero}</div>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nouveau statut *</label>
                  <select
                    value={actionForm.nouveauStatut || ''}
                    onChange={(e) => setActionForm({ ...actionForm, nouveauStatut: e.target.value })}
                    style={styles.input}
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="TRANSMIS_CF">📤 Transmis CF</option>
                    <option value="DIFFERE_CF">⏸️ Différé CF</option>
                    <option value="VISE_CF">✅ Visé CF</option>
                    <option value="REJETE_CF">❌ Rejeté CF</option>
                    <option value="TRANSMIS_AC">📤 Transmis AC</option>
                    <option value="DIFFERE_AC">⏸️ Différé AC</option>
                    <option value="PAYE_PARTIEL">💰 Payé partiel</option>
                    <option value="PAYE">💰 Payé</option>
                    <option value="REJETE_AC">❌ Rejeté AC</option>
                    <option value="ARCHIVE">📦 Archivé</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date *</label>
                  <input
                    type="date"
                    value={actionForm.date}
                    onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                    style={styles.input}
                  />
                </div>
                {['DIFFERE_CF', 'DIFFERE_AC', 'REJETE_CF', 'REJETE_AC'].includes(actionForm.nouveauStatut) && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Motif *</label>
                    <textarea
                      value={actionForm.motif}
                      onChange={(e) => setActionForm({ ...actionForm, motif: e.target.value })}
                      style={{ ...styles.input, minHeight: 80 }}
                      placeholder="Raison du différé ou rejet..."
                    />
                  </div>
                )}
                {['REJETE_CF', 'REJETE_AC'].includes(actionForm.nouveauStatut) && (
                  <div style={{ marginTop: 16, padding: 12, background: '#fff3e0', borderRadius: 8, fontSize: 13 }}>
                    ⚠️ Le rejet libérera le budget engagé.
                  </div>
                )}
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setShowStatutModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', nouveauStatut: '' }); }} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleChangeStatut} style={{ ...styles.button, background: '#1565c0' }}>
                  ✓ Appliquer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modification OP */}
        {showEditModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 650 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#fff8e1' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#f57f17' }}>✏️ Modifier l'OP</h2>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showEditModal.numero}</div>
              </div>
              <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Objet</label>
                  <textarea
                    value={editForm.objet || ''}
                    onChange={(e) => setEditForm({ ...editForm, objet: e.target.value })}
                    style={{ ...styles.input, minHeight: 60 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Montant (FCFA) 🔐</label>
                    <input
                      type="number"
                      value={editForm.montant || ''}
                      onChange={(e) => setEditForm({ ...editForm, montant: e.target.value })}
                      style={{ ...styles.input, fontFamily: 'monospace', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 10, color: '#f57f17' }}>⚠️ Modification protégée</span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Ligne budgétaire</label>
                    <select
                      value={editForm.ligneBudgetaire || ''}
                      onChange={(e) => setEditForm({ ...editForm, ligneBudgetaire: e.target.value })}
                      style={styles.input}
                    >
                      <option value="">-- Sélectionner --</option>
                      {allLignes.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mode de règlement</label>
                    <select
                      value={editForm.modeReglement || 'VIREMENT'}
                      onChange={(e) => setEditForm({ ...editForm, modeReglement: e.target.value })}
                      style={styles.input}
                    >
                      <option value="VIREMENT">Virement</option>
                      <option value="CHEQUE">Chèque</option>
                      <option value="ESPECES">Espèces</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date de création</label>
                    <input
                      type="date"
                      value={editForm.dateCreation || ''}
                      onChange={(e) => setEditForm({ ...editForm, dateCreation: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Pièces justificatives</label>
                  <textarea
                    value={editForm.piecesJustificatives || ''}
                    onChange={(e) => setEditForm({ ...editForm, piecesJustificatives: e.target.value })}
                    style={{ ...styles.input, minHeight: 60 }}
                  />
                </div>
                
                {/* Dates du circuit */}
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>📅 Dates et bordereaux du circuit</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date Trans. CF</label>
                      <input
                        type="date"
                        value={editForm.dateTransmissionCF || ''}
                        onChange={(e) => setEditForm({ ...editForm, dateTransmissionCF: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Bordereau CF</label>
                      <input
                        type="text"
                        value={editForm.bordereauCF || ''}
                        onChange={(e) => setEditForm({ ...editForm, bordereauCF: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        placeholder="BT-CF-2026-001"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date Visa CF</label>
                      <input
                        type="date"
                        value={editForm.dateVisaCF || ''}
                        onChange={(e) => setEditForm({ ...editForm, dateVisaCF: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date Trans. AC</label>
                      <input
                        type="date"
                        value={editForm.dateTransmissionAC || ''}
                        onChange={(e) => setEditForm({ ...editForm, dateTransmissionAC: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Bordereau AC</label>
                      <input
                        type="text"
                        value={editForm.bordereauAC || ''}
                        onChange={(e) => setEditForm({ ...editForm, bordereauAC: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        placeholder="BT-AC-2026-001"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date paiement</label>
                      <input
                        type="date"
                        value={editForm.datePaiement || ''}
                        onChange={(e) => setEditForm({ ...editForm, datePaiement: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date archivage</label>
                      <input
                        type="date"
                        value={editForm.dateArchivage || ''}
                        onChange={(e) => setEditForm({ ...editForm, dateArchivage: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Boîte archive</label>
                      <input
                        type="text"
                        value={editForm.boiteArchive || ''}
                        onChange={(e) => setEditForm({ ...editForm, boiteArchive: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        placeholder="BOX-2026-001"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
                <button 
                  onClick={() => { handleDeleteWithPassword(showEditModal); }} 
                  style={{ ...styles.buttonSecondary, background: '#ffebee', color: '#c62828' }}
                >
                  🗑️ Supprimer
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setShowEditModal(null); setEditForm({}); }} style={styles.buttonSecondary}>Annuler</button>
                  <button onClick={handleSaveEdit} style={{ ...styles.button, background: '#f57f17' }}>
                    ✓ Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Gestion du Circuit */}
        {showCircuitModal && (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: 700 }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e3f2fd' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1565c0' }}>📋 Gérer le circuit</h2>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showCircuitModal.numero}</div>
              </div>
              <div style={{ padding: 24, maxHeight: '65vh', overflowY: 'auto' }}>
                {/* Statut actuel */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Statut actuel</label>
                  <select
                    value={circuitForm.statut || ''}
                    onChange={(e) => setCircuitForm({ ...circuitForm, statut: e.target.value })}
                    style={{ ...styles.input, fontWeight: 600 }}
                  >
                    <option value="CREE">🔵 Créé</option>
                    <option value="TRANSMIS_CF">📤 Transmis CF</option>
                    <option value="DIFFERE_CF">⏸️ Différé CF</option>
                    <option value="VISE_CF">✅ Visé CF</option>
                    <option value="REJETE_CF">❌ Rejeté CF</option>
                    <option value="TRANSMIS_AC">📤 Transmis AC</option>
                    <option value="DIFFERE_AC">⏸️ Différé AC</option>
                    <option value="PAYE_PARTIEL">💰 Payé partiel</option>
                    <option value="PAYE">💰 Payé</option>
                    <option value="REJETE_AC">❌ Rejeté AC</option>
                    <option value="ARCHIVE">📦 Archivé</option>
                  </select>
                </div>

                {/* Section CF */}
                <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#f57f17' }}>📤 Contrôleur Financier (CF)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date transmission CF</label>
                      <input
                        type="date"
                        value={circuitForm.dateTransmissionCF || ''}
                        onChange={(e) => setCircuitForm({ ...circuitForm, dateTransmissionCF: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date visa CF</label>
                      <input
                        type="date"
                        value={circuitForm.dateVisaCF || ''}
                        onChange={(e) => setCircuitForm({ ...circuitForm, dateVisaCF: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Différé CF */}
                {['DIFFERE_CF'].includes(circuitForm.statut) && (
                  <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#e65100' }}>⏸️ Différé CF</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date différé</label>
                        <input
                          type="date"
                          value={circuitForm.dateDiffereCF || ''}
                          onChange={(e) => setCircuitForm({ ...circuitForm, dateDiffereCF: e.target.value })}
                          style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Motif *</label>
                        <input
                          type="text"
                          value={circuitForm.motifDiffereCF || ''}
                          onChange={(e) => setCircuitForm({ ...circuitForm, motifDiffereCF: e.target.value })}
                          style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                          placeholder="Pièces manquantes..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section AC */}
                <div style={{ background: '#f3e5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#7b1fa2' }}>💰 Agent Comptable (AC)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date transmission AC</label>
                      <input
                        type="date"
                        value={circuitForm.dateTransmissionAC || ''}
                        onChange={(e) => setCircuitForm({ ...circuitForm, dateTransmissionAC: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date paiement</label>
                      <input
                        type="date"
                        value={circuitForm.datePaiement || ''}
                        onChange={(e) => setCircuitForm({ ...circuitForm, datePaiement: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Différé AC */}
                {['DIFFERE_AC'].includes(circuitForm.statut) && (
                  <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#e65100' }}>⏸️ Différé AC</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date différé</label>
                        <input
                          type="date"
                          value={circuitForm.dateDiffereAC || ''}
                          onChange={(e) => setCircuitForm({ ...circuitForm, dateDiffereAC: e.target.value })}
                          style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Motif *</label>
                        <input
                          type="text"
                          value={circuitForm.motifDiffereAC || ''}
                          onChange={(e) => setCircuitForm({ ...circuitForm, motifDiffereAC: e.target.value })}
                          style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                          placeholder="Pièces manquantes..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Rejet */}
                {['REJETE_CF', 'REJETE_AC'].includes(circuitForm.statut) && (
                  <div style={{ background: '#ffebee', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#c62828' }}>❌ Rejet</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date rejet</label>
                        <input
                          type="date"
                          value={circuitForm.dateRejet || ''}
                          onChange={(e) => setCircuitForm({ ...circuitForm, dateRejet: e.target.value })}
                          style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Rejeté par</label>
                        <select
                          value={circuitForm.rejetePar || 'CF'}
                          onChange={(e) => setCircuitForm({ ...circuitForm, rejetePar: e.target.value })}
                          style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        >
                          <option value="CF">CF</option>
                          <option value="AC">AC</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Motif *</label>
                        <input
                          type="text"
                          value={circuitForm.motifRejet || ''}
                          onChange={(e) => setCircuitForm({ ...circuitForm, motifRejet: e.target.value })}
                          style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                          placeholder="Motif du rejet..."
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 12, padding: 10, background: '#fff', borderRadius: 4, fontSize: 12, color: '#c62828' }}>
                      ⚠️ Le rejet libérera le budget engagé par cet OP
                    </div>
                  </div>
                )}

                {/* Section Archive */}
                <div style={{ background: '#eceff1', padding: 16, borderRadius: 8 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#546e7a' }}>📦 Archivage</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date archivage</label>
                      <input
                        type="date"
                        value={circuitForm.dateArchivage || ''}
                        onChange={(e) => setCircuitForm({ ...circuitForm, dateArchivage: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Boîte / Classeur</label>
                      <input
                        type="text"
                        value={circuitForm.boiteArchive || ''}
                        onChange={(e) => setCircuitForm({ ...circuitForm, boiteArchive: e.target.value })}
                        style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                        placeholder="BOX-2026-001"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
                <button 
                  onClick={() => { setShowPaiementModal(showCircuitModal); setActionForm({ ...actionForm, montant: String(showCircuitModal.montant - (showCircuitModal.totalPaye || 0)) }); }} 
                  style={{ ...styles.buttonSecondary, background: '#e0f2f1', color: '#00695c' }}
                >
                  💰 Ajouter paiement
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setShowCircuitModal(null); setCircuitForm({}); }} style={styles.buttonSecondary}>Annuler</button>
                  <button onClick={handleSaveCircuit} style={{ ...styles.button, background: '#1565c0' }}>
                    ✓ Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Mot de passe */}
        {showPasswordModal && (
          <PasswordModal
            isOpen={!!showPasswordModal}
            onClose={() => setShowPasswordModal(null)}
            onConfirm={showPasswordModal.action}
            adminPassword={projet?.adminPassword || ''}
            title={showPasswordModal.title}
            description={showPasswordModal.description}
            warningMessage={showPasswordModal.warningMessage}
            impactDetails={showPasswordModal.impactDetails}
            confirmText={showPasswordModal.confirmText}
            confirmColor={showPasswordModal.confirmColor}
          />
        )}
      </div>
    );
  };

  // ==================== PAGES EN CONSTRUCTION ====================
  const PageEnConstruction = ({ title, icon }) => (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{icon} {title}</h1>
      <SourceTabs activeSource={sources[0]?.id} onChangeSource={() => {}} />
      <div style={{ ...styles.card, textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🚧</div>
        <h2 style={{ color: '#6c757d' }}>Module en cours de développement</h2>
        <p style={{ color: '#adb5bd' }}>Cette fonctionnalité sera disponible prochainement</p>
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================
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
      <Sidebar />
      <main style={styles.main}>
        {currentPage === 'dashboard' && <PageDashboard />}
        {currentPage === 'parametres' && <PageParametres />}
        {currentPage === 'beneficiaires' && <PageBeneficiaires />}
        {currentPage === 'budget' && <PageBudget />}
        {currentPage === 'historique' && <PageHistoriqueBudget />}
        {currentPage === 'ops' && <PageListeOP />}
        {currentPage === 'nouvelOp' && <PageNouvelOp />}
        {currentPage === 'suivi' && <PageEnConstruction title="Suivi Circuit" icon="🔄" />}
      </main>
    </div>
  );
}
