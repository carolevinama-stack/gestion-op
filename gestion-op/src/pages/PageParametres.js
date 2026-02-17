import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import PageAdmin from './PageAdmin';

const PageParametres = () => {
  const { userProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState('projet');
  const isAdmin = ['ADMIN'].includes(userProfile?.role);

  const tabs = [
    { id: 'projet', label: 'Projet' },
    { id: 'sources', label: 'Sources' },
    { id: 'exercices', label: 'Exercices' },

  ];
  if (isAdmin) tabs.push({ id: 'utilisateurs', label: 'Utilisateurs' });
  if (isAdmin) tabs.push({ id: 'maintenance', label: 'Maintenance' });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Paramètres</h1>
      
      {/* Onglets */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
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

      {activeTab === 'maintenance' && isAdmin && <TabMaintenance />}
      {activeTab === 'utilisateurs' && isAdmin && <PageAdmin />}
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
      alert('Les mots de passe ne correspondent pas');
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

      <div style={{ ...styles.card, background: '#fff8e1', border: '2px solid #E8B931' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #E8B931', color: '#C5961F' }}>
          Sécurité administrative
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
              {showPassword ? 'Masquer' : 'Afficher'}
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
            <span style={{ color: '#C43E3E', fontSize: 12 }}>Les mots de passe ne correspondent pas</span>
          )}
          {form.adminPassword && confirmPassword && form.adminPassword === confirmPassword && (
            <span style={{ color: '#2e7d32', fontSize: 12 }}>Mots de passe identiques</span>
          )}
        </div>
        
        <div style={{ background: 'white', padding: 12, borderRadius: 8, fontSize: 13, color: '#555' }}>
          <strong style={{ color: '#C5961F' }}>Ce mot de passe protège les actions sensibles :</strong>
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
  const [form, setForm] = useState({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#1B6B2E' });

  const openNew = () => {
    setForm({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#1B6B2E' });
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
        <button onClick={openNew} style={styles.button}>+ Nouvelle source</button>
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
                  <td style={styles.td}><span style={{ ...styles.badge, background: source.compteDebiter === 'BAILLEUR' ? '#e8f5e9' : '#E8F5E9', color: source.compteDebiter === 'BAILLEUR' ? '#2e7d32' : '#1B6B2E' }}>{source.compteDebiter}</span></td>
                  <td style={styles.td}><div style={{ width: 30, height: 30, borderRadius: 6, background: source.couleur }}></div></td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button onClick={() => openEdit(source)} style={{ ...styles.buttonSecondary, padding: '6px 12px', marginRight: 8 }}>Modifier</button>
                    <button onClick={() => handleDelete(source)} style={{ ...styles.buttonSecondary, padding: '6px 12px', background: '#ffebee', color: '#C43E3E' }}>Suppr</button>
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
              <h2 style={{ margin: 0, fontSize: 18 }}>{editSource ? 'Modifier la source' : 'Nouvelle source'}</h2>
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
        <button onClick={() => { setForm({ annee: new Date().getFullYear() + 1, actif: false }); setShowModal(true); }} style={styles.button}>+ Nouvel exercice</button>
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
                      {ex.actif ? 'Actif' : 'Inactif'}
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
              <h2 style={{ margin: 0, fontSize: 18 }}>+ Nouvel exercice</h2>
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






// ==================== TAB MAINTENANCE (ADMIN ONLY) ====================
const TabMaintenance = () => {
  const { projet, sources, exercices, ops, setOps, bordereaux, setBordereaux, beneficiaires } = useAppContext();
  const [tool, setTool] = useState(null); // 'purge' | 'import' | 'compteurs' | 'doublons'
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // === Purge state ===
  const [purgeExercice, setPurgeExercice] = useState('');
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [purgeScope, setPurgeScope] = useState('exercice'); // 'exercice' | 'tout'

  // === Import state ===
  const [importExercice, setImportExercice] = useState('');
  const [importData, setImportData] = useState(null); // parsed data
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);

  // === Compteurs state ===
  const [compteurExercice, setCompteurExercice] = useState('');

  // === Doublons state ===
  const [doublonExercice, setDoublonExercice] = useState('');
  const [doublons, setDoublons] = useState(null);

  const showMsg = (text, type = 'success') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 5000); };

  const checkPwd = () => {
    const p = window.prompt('Mot de passe admin requis :');
    if (p !== (projet?.motDePasseAdmin || 'admin123')) { if (p !== null) alert('Mot de passe incorrect'); return false; }
    return true;
  };

  // ================================================================
  // 1. PURGE
  // ================================================================
  const handlePurge = async () => {
    if (!checkPwd()) return;
    if (purgeScope === 'exercice' && !purgeExercice) { alert('Sélectionnez un exercice.'); return; }
    if (purgeConfirm !== 'SUPPRIMER') { alert('Tapez exactement SUPPRIMER pour confirmer.'); return; }

    const exLabel = purgeScope === 'tout' ? 'TOUS LES EXERCICES' : exercices.find(e => e.id === purgeExercice)?.annee;
    if (!window.confirm(`DERNIÈRE CONFIRMATION :\n\nSupprimer tous les OP et bordereaux de ${exLabel} ?\n\nCette action est IRRÉVERSIBLE.`)) return;

    setSaving(true);
    try {
      let opsToDelete, btsToDelete;
      if (purgeScope === 'tout') {
        opsToDelete = ops;
        btsToDelete = bordereaux;
      } else {
        opsToDelete = ops.filter(o => o.exerciceId === purgeExercice);
        btsToDelete = bordereaux.filter(b => b.exerciceId === purgeExercice);
      }

      // Supprimer par batch de 500
      const batchSize = 400;
      for (let i = 0; i < opsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        opsToDelete.slice(i, i + batchSize).forEach(o => batch.delete(doc(db, 'ops', o.id)));
        await batch.commit();
      }
      for (let i = 0; i < btsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        btsToDelete.slice(i, i + batchSize).forEach(b => batch.delete(doc(db, 'bordereaux', b.id)));
        await batch.commit();
      }

      // Supprimer les compteurs concernés
      if (purgeScope === 'tout') {
        const comptSnap = await getDocs(collection(db, 'compteurs'));
        for (const d of comptSnap.docs) await deleteDoc(doc(db, 'compteurs', d.id));
      } else {
        const comptSnap = await getDocs(collection(db, 'compteurs'));
        for (const d of comptSnap.docs) {
          if (d.data().exerciceId === purgeExercice) await deleteDoc(doc(db, 'compteurs', d.id));
        }
      }

      showMsg(`Purge terminée : ${opsToDelete.length} OP et ${btsToDelete.length} bordereaux supprimés.`);
      setPurgeConfirm('');
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  // ================================================================
  // 2. TÉLÉCHARGER CANEVAS IMPORT
  // ================================================================
  const handleDownloadCanevas = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const colonnes = ['N° OP', 'Type', 'Bénéficiaire', 'Objet', 'Montant', 'Ligne budgétaire', 'Mode règlement',
      'Date création', 'Statut', 'Date transmission CF', 'N° Bordereau CF', 'Date visa CF',
      'Date transmission AC', 'N° Bordereau AC', 'Date paiement', 'Montant payé', 'Référence paiement',
      'N° OP Provisoire', 'Observation'];

    // Un onglet par source
    sources.forEach(src => {
      const data = [colonnes]; // header row
      const ws = XLSX.utils.aoa_to_sheet(data);
      // Largeurs de colonnes
      ws['!cols'] = colonnes.map((c) => ({ wch: c.length < 12 ? 15 : c.length + 4 }));
      XLSX.utils.book_append_sheet(wb, ws, src.sigle || src.nom);
    });

    // Onglet EXEMPLE
    const exRows = [colonnes,
      ['N°0001/PIF2-IDA/2026', 'PROVISOIRE', 'ENTREPRISE ABC', 'Fourniture bureau', 1500000, 'Biens', 'VIREMENT', '2026-01-15', 'PAYE', '2026-01-16', 'BT-CF-0001/PIF2-IDA/2026', '2026-01-18', '2026-01-20', 'BT-AC-0001/PIF2-IDA/2026', '2026-01-25', 1500000, 'REF-001', '', 'Paiement complet'],
      ['N°0002/PIF2-IDA/2026', 'PROVISOIRE', 'CABINET XYZ', 'Étude faisabilité', 3000000, 'Services', 'VIREMENT', '2026-01-20', 'VISE_CF', '2026-01-22', 'BT-CF-0002/PIF2-IDA/2026', '2026-01-25', '', '', '', '', '', '', 'En attente AC'],
      ['N°0003/PIF2-IDA/2026', 'PROVISOIRE', 'ENTREPRISE ABC', 'Formation agents', 800000, 'Services', 'CHEQUE', '2026-02-01', 'TRANSMIS_CF', '2026-02-03', 'BT-CF-0003/PIF2-IDA/2026', '', '', '', '', '', '', '', 'En attente visa'],
      ['N°0004/PIF2-IDA/2026', 'PROVISOIRE', 'FOURNISSEUR DEF', 'Achat matériel', 5000000, 'Biens', 'VIREMENT', '2026-02-05', 'PAYE', '2026-02-06', 'BT-CF-0004/PIF2-IDA/2026', '2026-02-08', '2026-02-10', 'BT-AC-0002/PIF2-IDA/2026', '2026-02-15', 4000000, 'REF-002', '', 'Paiement partiel 4M/5M'],
      ['N°0005/PIF2-IDA/2026', 'DEFINITIF', 'FOURNISSEUR DEF', 'Régularisation matériel', 4800000, 'Biens', 'VIREMENT', '2026-02-20', 'CREE', '', '', '', '', '', '', '', '', 'N°0004/PIF2-IDA/2026', 'Définitif du provisoire 0004'],
    ];
    const wsEx = XLSX.utils.aoa_to_sheet(exRows);
    wsEx['!cols'] = colonnes.map((c) => ({ wch: c.length < 12 ? 15 : c.length + 4 }));
    XLSX.utils.book_append_sheet(wb, wsEx, 'EXEMPLE');

    // Onglet LÉGENDE
    const leg = [
      ['Colonne', 'Description', 'Valeurs acceptées', 'Obligatoire'],
      ['N° OP', 'Numéro unique de l\'OP', 'Ex: N°0001/PIF2-IDA/2026', 'OUI'],
      ['Type', 'Type d\'ordre de paiement', 'PROVISOIRE, DEFINITIF, ANNULATION', 'OUI'],
      ['Bénéficiaire', 'Nom exact du bénéficiaire (doit exister dans l\'appli)', 'Ex: ENTREPRISE ABC', 'OUI'],
      ['Objet', 'Objet de la dépense', 'Texte libre', 'OUI'],
      ['Montant', 'Montant en FCFA (nombre)', 'Ex: 1500000', 'OUI'],
      ['Ligne budgétaire', 'Libellé exact de la ligne (doit exister dans l\'appli)', 'Ex: Biens', 'OUI'],
      ['Mode règlement', 'Mode de paiement', 'VIREMENT, CHEQUE, ESPECES, ORDRE_PAIEMENT', 'OUI'],
      ['Date création', 'Date de création de l\'OP', 'AAAA-MM-JJ (ex: 2026-01-15)', 'OUI'],
      ['Statut', 'Statut actuel de l\'OP', 'CREE, TRANSMIS_CF, VISE_CF, DIFFERE_CF, REJETE_CF, TRANSMIS_AC, PAYE, DIFFERE_AC, REJETE_AC', 'OUI'],
      ['Date transmission CF', 'Date de transmission au CF', 'AAAA-MM-JJ ou vide', 'NON'],
      ['N° Bordereau CF', 'Référence du bordereau CF', 'Texte ou vide', 'NON'],
      ['Date visa CF', 'Date du visa par le CF', 'AAAA-MM-JJ ou vide', 'NON'],
      ['Date transmission AC', 'Date de transmission à l\'AC', 'AAAA-MM-JJ ou vide', 'NON'],
      ['N° Bordereau AC', 'Référence du bordereau AC', 'Texte ou vide', 'NON'],
      ['Date paiement', 'Date du paiement', 'AAAA-MM-JJ ou vide', 'NON'],
      ['Montant payé', 'Montant effectivement payé (si différent du montant)', 'Nombre ou vide (= montant si complet)', 'NON'],
      ['Référence paiement', 'Référence bancaire du paiement', 'Texte ou vide', 'NON'],
      ['N° OP Provisoire', 'Pour DEFINITIF/ANNULATION : N° de l\'OP provisoire lié', 'Ex: N°0001/PIF2-IDA/2026 ou vide', 'Si DEFINITIF ou ANNULATION'],
      ['Observation', 'Commentaire libre', 'Texte ou vide', 'NON'],
    ];
    const wsLeg = XLSX.utils.aoa_to_sheet(leg);
    wsLeg['!cols'] = [{ wch: 22 }, { wch: 50 }, { wch: 55 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsLeg, 'LÉGENDE');

    XLSX.writeFile(wb, 'Canevas_Import_OP_Complet.xlsx');
    showMsg('Canevas téléchargé !');
  };

  // ================================================================
  // 3. IMPORT OP
  // ================================================================
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);

    const parsed = {};
    let totalOps = 0;
    sources.forEach(src => {
      const sheetName = wb.SheetNames.find(s => s === (src.sigle || src.nom));
      if (sheetName) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length > 0) { parsed[src.id] = { sigle: src.sigle, rows }; totalOps += rows.length; }
      }
    });

    setImportData(parsed);
    setImportPreview({ total: totalOps, parSource: Object.entries(parsed).map(([id, d]) => ({ sigle: d.sigle, count: d.rows.length })) });
  };

  const handleImport = async () => {
    if (!importData || !importExercice) { alert('Sélectionnez un exercice et un fichier.'); return; }
    if (!checkPwd()) return;

    const exercice = exercices.find(e => e.id === importExercice);
    if (!window.confirm(`Importer ${importPreview.total} OP dans l'exercice ${exercice?.annee} ?\n\nLes OP existants ne seront PAS supprimés.`)) return;

    setSaving(true);
    let imported = 0, errors = [];
    try {
      for (const [sourceId, { rows }] of Object.entries(importData)) {
        for (const row of rows) {
          try {
            const numero = String(row['N° OP'] || '').trim();
            const type = String(row['Type'] || 'PROVISOIRE').trim().toUpperCase();
            const benNom = String(row['Bénéficiaire'] || '').trim();
            const objet = String(row['Objet'] || '').trim();
            const montant = parseFloat(String(row['Montant'] || '0').replace(/\s/g, '').replace(/,/g, '.')) || 0;
            const ligne = String(row['Ligne budgétaire'] || '').trim();
            const mode = String(row['Mode règlement'] || 'VIREMENT').trim().toUpperCase();
            const dateCrea = String(row['Date création'] || '').trim();
            const statut = String(row['Statut'] || 'CREE').trim().toUpperCase();

            if (!numero || !benNom || !montant) { errors.push(`Ligne ignorée (données manquantes) : ${numero || '?'}`); continue; }

            // Trouver le bénéficiaire par nom
            const ben = beneficiaires.find(b => (b.nom || '').toLowerCase().trim() === benNom.toLowerCase());
            if (!ben) { errors.push(`Bénéficiaire introuvable : "${benNom}" (OP ${numero})`); continue; }

            const opData = {
              numero, type: ['PROVISOIRE', 'DEFINITIF', 'ANNULATION'].includes(type) ? type : 'PROVISOIRE',
              sourceId, exerciceId: importExercice,
              beneficiaireId: ben.id, objet, montant, ligneBudgetaire: ligne,
              modeReglement: ['VIREMENT', 'CHEQUE', 'ESPECES', 'ORDRE_PAIEMENT'].includes(mode) ? mode : 'VIREMENT',
              dateCreation: dateCrea || new Date().toISOString().split('T')[0],
              statut: statut || 'CREE',
              // Circuit
              dateTransmissionCF: String(row['Date transmission CF'] || '').trim() || null,
              bordereauCF: String(row['N° Bordereau CF'] || '').trim() || null,
              dateVisaCF: String(row['Date visa CF'] || '').trim() || null,
              dateTransmissionAC: String(row['Date transmission AC'] || '').trim() || null,
              bordereauAC: String(row['N° Bordereau AC'] || '').trim() || null,
              datePaiement: String(row['Date paiement'] || '').trim() || null,
              montantPaye: row['Montant payé'] ? parseFloat(String(row['Montant payé']).replace(/\s/g, '').replace(/,/g, '.')) : null,
              referencePaiement: String(row['Référence paiement'] || '').trim() || null,
              // Liens
              opProvisoireNumero: String(row['N° OP Provisoire'] || '').trim() || null,
              opProvisoireId: null,
              observation: String(row['Observation'] || '').trim() || null,
              // Métadonnées
              rib: null, montantTVA: null, tvaRecuperable: false, piecesJustificatives: '',
              importedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'ops'), opData);
            imported++;
          } catch (rowErr) { errors.push(`Erreur ligne : ${rowErr.message}`); }
        }
      }

      // Résoudre les liens opProvisoireId après import
      if (imported > 0) {
        const allOps = await getDocs(query(collection(db, 'ops'), where('exerciceId', '==', importExercice)));
        const opsMap = {};
        allOps.docs.forEach(d => { opsMap[d.data().numero] = d.id; });
        for (const d of allOps.docs) {
          const data = d.data();
          if (data.opProvisoireNumero && !data.opProvisoireId && opsMap[data.opProvisoireNumero]) {
            await updateDoc(doc(db, 'ops', d.id), { opProvisoireId: opsMap[data.opProvisoireNumero] });
          }
        }
      }

      let msg = `${imported} OP importés avec succès !`;
      if (errors.length > 0) msg += `\n\n${errors.length} erreur(s) :\n` + errors.slice(0, 10).join('\n');
      if (errors.length > 10) msg += `\n... et ${errors.length - 10} autres.`;
      alert(msg);
      showMsg(`${imported} OP importés.`);
      setImportData(null); setImportPreview(null); setImportFile(null);
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  // ================================================================
  // 4. RECALER COMPTEURS
  // ================================================================
  const handleRecalerCompteurs = async () => {
    if (!compteurExercice) { alert('Sélectionnez un exercice.'); return; }
    if (!checkPwd()) return;
    setSaving(true);
    try {
      let fixed = 0;
      for (const src of sources) {
        for (const typeBT of ['CF', 'AC']) {
          const bts = bordereaux.filter(b => b.type === typeBT && b.sourceId === src.id && b.exerciceId === compteurExercice);
          let maxNum = 0;
          bts.forEach(b => { const m = (b.numero || '').match(/(\d{4})\//); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });

          const compteurId = `${typeBT}_${src.id}_${compteurExercice}`;
          await setDoc(doc(db, 'compteurs', compteurId), {
            count: maxNum, type: typeBT, sourceId: src.id, exerciceId: compteurExercice
          });
          fixed++;
        }
      }
      showMsg(`${fixed} compteurs recalés pour ${sources.length} source(s).`);
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  // ================================================================
  // 5. CORRECTION DOUBLONS
  // ================================================================
  const handleDetecterDoublons = () => {
    if (!doublonExercice) { alert('Sélectionnez un exercice.'); return; }
    const opsEx = ops.filter(o => o.exerciceId === doublonExercice);
    const numCount = {};
    opsEx.forEach(o => { numCount[o.numero] = (numCount[o.numero] || 0) + 1; });
    const dups = Object.entries(numCount).filter(([, c]) => c > 1).map(([num, count]) => ({
      numero: num, count, ops: opsEx.filter(o => o.numero === num)
    }));
    setDoublons(dups);
  };

  const handleFixDoublon = async (dup) => {
    if (!checkPwd()) return;
    setSaving(true);
    try {
      const opsToFix = dup.ops.slice(1); // garder le premier, renommer les suivants
      const opsEx = ops.filter(o => o.exerciceId === doublonExercice);
      let maxNum = 0;
      opsEx.forEach(o => { const m = (o.numero || '').match(/N°(\d+)\//); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });

      for (const op of opsToFix) {
        maxNum++;
        const newNumero = op.numero.replace(/N°\d+\//, `N°${String(maxNum).padStart(4, '0')}/`);
        await updateDoc(doc(db, 'ops', op.id), { numero: newNumero, updatedAt: new Date().toISOString() });
      }
      showMsg(`${opsToFix.length} doublon(s) corrigé(s) pour ${dup.numero}`);
      // Rafraîchir
      handleDetecterDoublons();
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  // ================================================================
  // RENDU
  // ================================================================
  const cardStyle = { background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid #e0e0e0' };
  const btnTool = (id, icon, label, desc, color) => (
    <div key={id} onClick={() => setTool(tool === id ? null : id)}
      style={{ flex: 1, minWidth: 200, padding: 20, borderRadius: 12, border: tool === id ? `2px solid ${color}` : '2px solid #e0e0e0',
        background: tool === id ? color + '10' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color }}>{label}</div>
      <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>{desc}</div>
    </div>
  );

  return (
    <div style={{ padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Outils de maintenance</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#C43E3E' }}>Zone sensible — Mot de passe admin requis pour chaque action</p>
        </div>
      </div>

      {message && (
        <div style={{ padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
          background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
          color: message.type === 'success' ? '#2e7d32' : '#C43E3E',
          border: `1px solid ${message.type === 'success' ? '#a5d6a7' : '#ef9a9a'}` }}>
          {message.text}
        </div>
      )}

      {/* Sélection outil */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {btnTool('purge', '', 'Purge', 'Supprimer OP & bordereaux', '#C43E3E')}
        {btnTool('import', '', 'Import OP', 'Importer depuis Excel', '#3B6B8A')}
        {btnTool('compteurs', '', 'Recaler compteurs', 'Corriger la numérotation', '#C5961F')}
        {btnTool('doublons', 'Doublons', 'Détecter et corriger', '#C5961F')}
      </div>

      {/* === PURGE === */}
      {tool === 'purge' && (
        <div style={cardStyle}>
          <h3 style={{ color: '#C43E3E', margin: '0 0 16px' }}>Purge des données</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={purgeScope === 'exercice'} onChange={() => setPurgeScope('exercice')} /> Par exercice
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={purgeScope === 'tout'} onChange={() => setPurgeScope('tout')} />
              <span style={{ color: '#C43E3E', fontWeight: 700 }}>Tout purger </span>
            </label>
          </div>
          {purgeScope === 'exercice' && (
            <select value={purgeExercice} onChange={e => setPurgeExercice(e.target.value)} style={{ ...styles.input, width: 200 }}>
              <option value="">-- Exercice --</option>
              {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
            </select>
          )}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#C43E3E' }}>Tapez SUPPRIMER pour confirmer :</label>
            <input value={purgeConfirm} onChange={e => setPurgeConfirm(e.target.value)}
              placeholder="SUPPRIMER" style={{ ...styles.input, width: 200, marginTop: 4, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }} />
          </div>
          {purgeScope === 'exercice' && purgeExercice && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              {ops.filter(o => o.exerciceId === purgeExercice).length} OP + {bordereaux.filter(b => b.exerciceId === purgeExercice).length} bordereaux à supprimer
            </div>
          )}
          {purgeScope === 'tout' && (
            <div style={{ fontSize: 12, color: '#C43E3E', fontWeight: 700, marginTop: 8 }}>
              {ops.length} OP + {bordereaux.length} bordereaux seront supprimés DÉFINITIVEMENT
            </div>
          )}
          <button onClick={handlePurge} disabled={saving || purgeConfirm !== 'SUPPRIMER'}
            style={{ ...styles.button, marginTop: 16, background: '#C43E3E', opacity: purgeConfirm !== 'SUPPRIMER' ? 0.4 : 1 }}>
            {saving ? 'Suppression en cours...' : 'Exécuter la purge'}
          </button>
        </div>
      )}

      {/* === IMPORT === */}
      {tool === 'import' && (
        <div style={cardStyle}>
          <h3 style={{ color: '#3B6B8A', margin: '0 0 16px' }}>Import OP depuis Excel</h3>

          {/* Étape 1 : Canevas */}
          <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Étape 1 : Télécharger le canevas</p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#555' }}>
              Un onglet par source ({sources.map(s => s.sigle).join(', ')}) + onglet EXEMPLE + LÉGENDE
            </p>
            <button onClick={handleDownloadCanevas} style={{ ...styles.button, background: '#3B6B8A', fontSize: 13 }}>
              Télécharger le canevas Excel
            </button>
          </div>

          {/* Étape 2 : Sélection exercice */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Étape 2 : Exercice de destination</p>
            <select value={importExercice} onChange={e => setImportExercice(e.target.value)} style={{ ...styles.input, width: 200 }}>
              <option value="">-- Exercice --</option>
              {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
            </select>
          </div>

          {/* Étape 3 : Upload */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Étape 3 : Charger le fichier rempli</p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ fontSize: 13 }} />
          </div>

          {/* Prévisualisation */}
          {importPreview && (
            <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Aperçu : {importPreview.total} OP trouvés</p>
              {importPreview.parSource.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#333' }}>• {s.sigle} : {s.count} OP</div>
              ))}
            </div>
          )}

          {importPreview && importExercice && (
            <button onClick={handleImport} disabled={saving}
              style={{ ...styles.button, background: '#3B6B8A', fontSize: 14 }}>
              {saving ? 'Import en cours...' : `Importer ${importPreview.total} OP`}
            </button>
          )}
        </div>
      )}

      {/* === COMPTEURS === */}
      {tool === 'compteurs' && (
        <div style={cardStyle}>
          <h3 style={{ color: '#C5961F', margin: '0 0 16px' }}>Recaler les compteurs de bordereaux</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            Remet les compteurs en cohérence avec le plus grand numéro de bordereau existant pour chaque source.
          </p>
          <select value={compteurExercice} onChange={e => setCompteurExercice(e.target.value)} style={{ ...styles.input, width: 200 }}>
            <option value="">-- Exercice --</option>
            {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
          </select>
          <button onClick={handleRecalerCompteurs} disabled={saving || !compteurExercice}
            style={{ ...styles.button, marginTop: 12, background: '#C5961F' }}>
            {saving ? 'Recalage en cours...' : 'Recaler les compteurs'}
          </button>
        </div>
      )}

      {/* === DOUBLONS === */}
      {tool === 'doublons' && (
        <div style={cardStyle}>
          <h3 style={{ color: '#C5961F', margin: '0 0 16px' }}>Détection et correction des doublons</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <select value={doublonExercice} onChange={e => setDoublonExercice(e.target.value)} style={{ ...styles.input, width: 200, marginBottom: 0 }}>
              <option value="">-- Exercice --</option>
              {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
            </select>
            <button onClick={handleDetecterDoublons} disabled={!doublonExercice}
              style={{ ...styles.button, background: '#C5961F', marginBottom: 0 }}>
              Scanner
            </button>
          </div>
          {doublons !== null && (
            doublons.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>Aucun doublon détecté !</div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#C43E3E', fontWeight: 600, marginBottom: 12 }}>{doublons.length} doublon(s) détecté(s)</p>
                {doublons.map((dup, i) => (
                  <div key={i} style={{ padding: 12, background: '#FFEBEE', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{dup.numero}</span>
                      <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>× {dup.count} exemplaires</span>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        {dup.ops.map(o => `${o.type} - ${formatMontant(o.montant)} F`).join(' | ')}
                      </div>
                    </div>
                    <button onClick={() => handleFixDoublon(dup)} disabled={saving}
                      style={{ ...styles.button, background: '#C5961F', padding: '6px 14px', fontSize: 12 }}>
                      Corriger
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};


export default PageParametres;
