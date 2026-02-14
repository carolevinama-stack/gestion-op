import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';

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
  const { projet, setProjet, sources, exercices } = useAppContext();
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
      setForm({
        pays: 'République de Côte d\'Ivoire',
        devise: 'Union – Discipline – Travail',
        nbExemplairesCF: 4,
        nbExemplairesAC: 2,
        nbCaracteresLigne: 4,
        ...projet
      });
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
            <input type="number" min="1" value={form.nbExemplairesCF ?? 4} onChange={e => setForm({...form, nbExemplairesCF: parseInt(e.target.value) || 4})} style={styles.input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nombre d'exemplaires pour l'AC</label>
            <input type="number" min="1" value={form.nbExemplairesAC ?? 2} onChange={e => setForm({...form, nbExemplairesAC: parseInt(e.target.value) || 2})} style={styles.input} />
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
  const { sources, setSources } = useAppContext();
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
  const { exercices, setExercices } = useAppContext();
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
  const { lignesBudgetaires, setLignesBudgetaires, budgets } = useAppContext();
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


export default PageParametres;
