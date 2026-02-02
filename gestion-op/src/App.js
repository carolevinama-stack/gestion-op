import React, { useState, useEffect } from 'react';
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
      nbExemplairesAC: 2
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
      if (projet) setForm(projet);
    }, [projet]);

    const handleSave = async () => {
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
    const [form, setForm] = useState({ nom: '', ncc: '', rib: '' });
    const [importData, setImportData] = useState([]);
    const [importing, setImporting] = useState(false);

    const filtered = beneficiaires.filter(b => 
      b.nom?.toLowerCase().includes(search.toLowerCase()) ||
      b.ncc?.toLowerCase().includes(search.toLowerCase())
    );

    const openNew = () => {
      setForm({ nom: '', ncc: '', rib: '' });
      setEditBen(null);
      setShowModal(true);
    };

    const openEdit = (ben) => {
      setForm(ben);
      setEditBen(ben);
      setShowModal(true);
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
              parsed.push({
                nom: nom,
                ncc: cols[1] || '',
                rib: cols[2] || ''
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
        if (editBen) {
          await updateDoc(doc(db, 'beneficiaires', editBen.id), form);
          setBeneficiaires(beneficiaires.map(b => b.id === editBen.id ? { ...b, ...form } : b));
        } else {
          const docRef = await addDoc(collection(db, 'beneficiaires'), { ...form, nom: form.nom.toUpperCase() });
          setBeneficiaires([...beneficiaires, { id: docRef.id, ...form, nom: form.nom.toUpperCase() }].sort((a, b) => a.nom.localeCompare(b.nom)));
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
                  <th style={styles.th}>RIB</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ben => (
                  <tr key={ben.id}>
                    <td style={styles.td}><strong>{ben.nom}</strong></td>
                    <td style={styles.td}>{ben.ncc || <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>-</span>}</td>
                    <td style={styles.td}>{ben.rib ? <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>{ben.rib}</code> : <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>-</span>}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => openEdit(ben)} style={{ ...styles.buttonSecondary, padding: '6px 12px', marginRight: 8 }}>✏️</button>
                      <button onClick={() => handleDelete(ben)} style={{ ...styles.buttonSecondary, padding: '6px 12px', background: '#ffebee', color: '#c62828' }}>🗑️</button>
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
                <h2 style={{ margin: 0, fontSize: 18 }}>{editBen ? '✏️ Modifier' : '➕ Nouveau bénéficiaire'}</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nom / Raison sociale *</label>
                  <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} style={styles.input} placeholder="Ex: SOGEA SATOM" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>NCC (Compte Contribuable)</label>
                    <input value={form.ncc || ''} onChange={e => setForm({...form, ncc: e.target.value})} style={styles.input} placeholder="Ex: 1904588 U" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>RIB</label>
                    <input value={form.rib || ''} onChange={e => setForm({...form, rib: e.target.value})} style={styles.input} placeholder="Ex: CI005 01012 012345678901 25" />
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
                              <td style={{ ...styles.td, fontSize: 12, fontFamily: 'monospace' }}>{ben.rib || '-'}</td>
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
                {/* Ajouter une ligne via Select */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    ➕ Ajouter une ligne depuis la bibliothèque
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <select
                      value={selectedLigne}
                      onChange={(e) => setSelectedLigne(e.target.value)}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '2px solid #e9ecef', fontSize: 14 }}
                    >
                      <option value="">-- Sélectionner une ligne --</option>
                      {lignesDisponibles.map(ligne => (
                        <option key={ligne.id} value={ligne.code}>
                          {ligne.code} - {ligne.libelle}
                        </option>
                      ))}
                    </select>
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
        {currentPage === 'ops' && <PageEnConstruction title="Liste des OP" icon="📋" />}
        {currentPage === 'nouvelOp' && <PageEnConstruction title="Nouvel OP" icon="➕" />}
        {currentPage === 'suivi' && <PageEnConstruction title="Suivi Circuit" icon="🔄" />}
      </main>
    </div>
  );
}
