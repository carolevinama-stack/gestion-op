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
  input: { width: '100%', padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 8, fontSize: 14, marginBottom: 16 },
  button: { padding: '12px 24px', background: '#0f4c3a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  buttonSecondary: { padding: '12px 24px', background: '#e9ecef', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, background: '#f8f9fa', borderBottom: '2px solid #e9ecef' },
  td: { padding: '14px 16px', borderBottom: '1px solid #f1f3f4' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modalContent: { background: 'white', borderRadius: 14, width: '90%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' },
};

// ==================== UTILITAIRES ====================
const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('fr-FR');
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
  
  // Navigation
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // Data state
  const [projet, setProjet] = useState(null);
  const [sources, setSources] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [lignesBudgetaires, setLignesBudgetaires] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [ops, setOps] = useState([]);
  
  // Selected state
  const [sourceActive, setSourceActive] = useState(null);
  const [exerciceActif, setExerciceActif] = useState(null);
  
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
      setCurrentPage('dashboard');
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
        if (sourcesData.length > 0 && !sourceActive) {
          setSourceActive(sourcesData[0].id);
        }

        // Charger les exercices
        const exercicesSnap = await getDocs(query(collection(db, 'exercices'), orderBy('annee', 'desc')));
        const exercicesData = exercicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setExercices(exercicesData);
        if (exercicesData.length > 0 && !exerciceActif) {
          const actif = exercicesData.find(e => e.actif) || exercicesData[0];
          setExerciceActif(actif.id);
        }

        // Charger les lignes budgétaires
        const lignesSnap = await getDocs(collection(db, 'lignesBudgetaires'));
        setLignesBudgetaires(lignesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Charger les bénéficiaires
        const benSnap = await getDocs(query(collection(db, 'beneficiaires'), orderBy('nom')));
        setBeneficiaires(benSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error('Erreur chargement données:', error);
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Charger les budgets et OP quand source/exercice change
  useEffect(() => {
    if (!user || !sourceActive || !exerciceActif) return;

    // Écouter les budgets
    const budgetsQuery = query(
      collection(db, 'budgets'),
      where('sourceId', '==', sourceActive),
      where('exerciceId', '==', exerciceActif)
    );
    const unsubBudgets = onSnapshot(budgetsQuery, (snap) => {
      setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Écouter les OP
    const opsQuery = query(
      collection(db, 'ops'),
      where('sourceId', '==', sourceActive),
      where('exerciceId', '==', exerciceActif),
      orderBy('numero', 'desc')
    );
    const unsubOps = onSnapshot(opsQuery, (snap) => {
      setOps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubBudgets();
      unsubOps();
    };
  }, [user, sourceActive, exerciceActif]);

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
        <div style={{ padding: '6px 18px', fontSize: 10, opacity: 0.5, marginTop: 10 }}>TABLEAU DE BORD</div>
        <NavItem id="dashboard" icon="📊" label="Vue d'ensemble" />
        
        <div style={{ padding: '6px 18px', fontSize: 10, opacity: 0.5, marginTop: 16 }}>OPÉRATIONS</div>
        <NavItem id="ops" icon="📋" label="Liste des OP" />
        <NavItem id="nouvelOp" icon="➕" label="Nouvel OP" />
        <NavItem id="suivi" icon="🔄" label="Suivi Circuit" />
        
        <div style={{ padding: '6px 18px', fontSize: 10, opacity: 0.5, marginTop: 16 }}>GESTION</div>
        <NavItem id="budget" icon="💰" label="Budget" />
        <NavItem id="beneficiaires" icon="👥" label="Bénéficiaires" />
        
        <div style={{ padding: '6px 18px', fontSize: 10, opacity: 0.5, marginTop: 16 }}>PARAMÈTRES</div>
        <NavItem id="paramProjet" icon="⚙️" label="Projet" />
        <NavItem id="paramSources" icon="🏦" label="Sources" />
        <NavItem id="paramExercices" icon="📅" label="Exercices" />
        <NavItem id="paramLignes" icon="📝" label="Lignes budgétaires" />
      </nav>
      
      {/* Sélection Source et Exercice */}
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 6 }}>SOURCE</div>
          <select 
            value={sourceActive || ''} 
            onChange={(e) => setSourceActive(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: 'none', fontSize: 13 }}
          >
            {sources.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 6 }}>EXERCICE</div>
          <select 
            value={exerciceActif || ''} 
            onChange={(e) => setExerciceActif(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: 'none', fontSize: 13 }}
          >
            {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
          </select>
        </div>
      </div>
      
      {/* User */}
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{user.email}</div>
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
        padding: '11px 18px', 
        cursor: 'pointer', 
        borderLeft: currentPage === id ? '3px solid #f0b429' : '3px solid transparent', 
        background: currentPage === id ? 'rgba(255,255,255,0.15)' : 'transparent',
        transition: 'all 0.2s'
      }}
    >
      <span>{icon}</span>
      <span style={{ fontSize: 14 }}>{label}</span>
    </div>
  );

  // ==================== PAGES ====================
  
  // Dashboard
  const PageDashboard = () => {
    const sourceObj = sources.find(s => s.id === sourceActive);
    const exerciceObj = exercices.find(e => e.id === exerciceActif);
    
    const totalDotation = budgets.reduce((sum, b) => sum + (b.dotation || 0), 0);
    const opsValides = ops.filter(op => ['DIRECT', 'DEFINITIF'].includes(op.type) && op.statut !== 'REJETE');
    const totalEngagement = opsValides.reduce((sum, op) => sum + (op.montant || 0), 0);
    const totalDisponible = totalDotation - totalEngagement;
    
    const opsProvisoires = ops.filter(op => op.type === 'PROVISOIRE' && op.statut !== 'REGULARISE');
    const opsEnCours = ops.filter(op => op.statut === 'TRANSMIS_CF' || op.statut === 'TRANSMIS_AC');

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📊 Tableau de bord</h1>
          <p style={{ color: '#6c757d' }}>
            <span style={{ background: sourceObj?.couleur || '#0f4c3a', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12, marginRight: 8 }}>{sourceObj?.nom || 'Source'}</span>
            Exercice {exerciceObj?.annee || ''}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: '💰', label: 'Dotation', value: formatMontant(totalDotation), color: '#0f4c3a' },
            { icon: '📝', label: 'Engagements', value: formatMontant(totalEngagement), color: '#f0b429' },
            { icon: '✅', label: 'Disponible', value: formatMontant(totalDisponible), color: '#06d6a0' },
            { icon: '📋', label: 'Nombre OP', value: ops.length, color: '#1565c0' },
          ].map((s, i) => (
            <div key={i} style={styles.card}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            </div>
          ))}
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
                    <span>N°{op.numero} - {beneficiaires.find(b => b.id === op.beneficiaireId)?.nom}</span>
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
                {opsEnCours.slice(0, 5).map(op => (
                  <div key={op.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>N°{op.numero}</span>
                    <span style={{ ...styles.badge, background: op.statut === 'TRANSMIS_CF' ? '#fff3e0' : '#e3f2fd', color: op.statut === 'TRANSMIS_CF' ? '#e65100' : '#1565c0' }}>
                      {op.statut === 'TRANSMIS_CF' ? 'Chez CF' : 'Chez AC'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Page Paramètres Projet
  const PageParamProjet = () => {
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>⚙️ Paramètres du Projet</h1>
        
        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>🏛️ Informations générales</h3>
          
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
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>📝 Configuration technique</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Code imputation budgétaire (préfixe)</label>
              <input value={form.codeImputation || ''} onChange={e => setForm({...form, codeImputation: e.target.value})} style={styles.input} placeholder="Ex: 345 90042200006 90 11409374" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nb caractères ligne budgétaire</label>
              <select value={form.nbCaracteresLigne || 4} onChange={e => setForm({...form, nbCaracteresLigne: parseInt(e.target.value)})} style={styles.input}>
                <option value={4}>4 caractères</option>
                <option value={6}>6 caractères</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>👤 Responsable / Signataire</h3>
          
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
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e9ecef' }}>🖨️ Configuration impressions</h3>
          
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

  // Page Paramètres Sources
  const PageParamSources = () => {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>🏦 Sources de Financement</h1>
          <button onClick={openNew} style={styles.button}>➕ Nouvelle source</button>
        </div>

        <div style={styles.card}>
          {sources.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', padding: 40 }}>Aucune source de financement. Cliquez sur "Nouvelle source" pour commencer.</p>
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
                  <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} style={{ ...styles.input, minHeight: 80 }} placeholder="Ex: Financement Groupe Banque Mondiale : Projet N° TF0B8829-CI, Crédit IDA N° 7187-CI" />
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

  // Page Paramètres Exercices
  const PageParamExercices = () => {
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
        setExercices([{ id: docRef.id, ...form }, ...newExercices]);
        if (form.actif) setExerciceActif(docRef.id);
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
        setExerciceActif(exercice.id);
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>📅 Exercices</h1>
          <button onClick={() => setShowModal(true)} style={styles.button}>➕ Nouvel exercice</button>
        </div>

        <div style={styles.card}>
          {exercices.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', padding: 40 }}>Aucun exercice. Cliquez sur "Nouvel exercice" pour commencer.</p>
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

  // Page Paramètres Lignes Budgétaires
  const PageParamLignes = () => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ code: '', libelle: '' });

    const handleSave = async () => {
      if (!form.code || !form.libelle) {
        alert('Veuillez remplir tous les champs');
        return;
      }
      try {
        const docRef = await addDoc(collection(db, 'lignesBudgetaires'), form);
        setLignesBudgetaires([...lignesBudgetaires, { id: docRef.id, ...form }]);
        setForm({ code: '', libelle: '' });
        setShowModal(false);
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la sauvegarde');
      }
    };

    const handleDelete = async (ligne) => {
      if (!window.confirm(`Supprimer la ligne "${ligne.code}" ?`)) return;
      try {
        await deleteDoc(doc(db, 'lignesBudgetaires', ligne.id));
        setLignesBudgetaires(lignesBudgetaires.filter(l => l.id !== ligne.id));
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>📝 Lignes Budgétaires</h1>
          <button onClick={() => setShowModal(true)} style={styles.button}>➕ Nouvelle ligne</button>
        </div>

        <div style={styles.card}>
          {lignesBudgetaires.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', padding: 40 }}>Aucune ligne budgétaire.</p>
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
                {lignesBudgetaires.map(ligne => (
                  <tr key={ligne.id}>
                    <td style={styles.td}><code style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 12px', borderRadius: 6, fontWeight: 600 }}>{ligne.code}</code></td>
                    <td style={styles.td}>{ligne.libelle}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => handleDelete(ligne)} style={{ ...styles.buttonSecondary, padding: '6px 12px', background: '#ffebee', color: '#c62828' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
      </div>
    );
  };

  // Page Bénéficiaires
  const PageBeneficiaires = () => {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editBen, setEditBen] = useState(null);
    const [form, setForm] = useState({ nom: '', ncc: '', rib: '' });

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
          setBeneficiaires([...beneficiaires, { id: docRef.id, ...form, nom: form.nom.toUpperCase() }]);
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
          <button onClick={openNew} style={styles.button}>➕ Nouveau</button>
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
      </div>
    );
  };

  // Page en construction
  const PageEnConstruction = ({ title }) => (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 60, marginBottom: 20 }}>🚧</div>
      <h2>{title}</h2>
      <p style={{ color: '#6c757d' }}>Ce module est en cours de développement</p>
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
        {currentPage === 'paramProjet' && <PageParamProjet />}
        {currentPage === 'paramSources' && <PageParamSources />}
        {currentPage === 'paramExercices' && <PageParamExercices />}
        {currentPage === 'paramLignes' && <PageParamLignes />}
        {currentPage === 'beneficiaires' && <PageBeneficiaires />}
        {currentPage === 'budget' && <PageEnConstruction title="💰 Gestion du Budget" />}
        {currentPage === 'ops' && <PageEnConstruction title="📋 Liste des OP" />}
        {currentPage === 'nouvelOp' && <PageEnConstruction title="➕ Nouvel OP" />}
        {currentPage === 'suivi' && <PageEnConstruction title="🔄 Suivi Circuit" />}
      </main>
    </div>
  );
}
