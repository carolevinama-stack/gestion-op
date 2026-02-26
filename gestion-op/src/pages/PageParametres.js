import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import PageAdmin from './PageAdmin';

// ============================================================
// PALETTE & ICÔNES
// ============================================================
const P = {
  bg: '#F6F4F1', card: '#FFFFFF', green: '#2E9940', greenDark: '#1B6B2E', greenLight: '#E8F5E9',
  olive: '#5D6A55', oliveDark: '#4A5A42', gold: '#C5961F', goldLight: '#FFF8E1', goldBorder: '#E8B931',
  red: '#C43E3E', redLight: '#FFEBEE', orange: '#D4722A',
  border: '#E2DFD8', text: '#3A3A3A', textSec: '#7A7A7A', textMuted: '#A0A0A0',
};

const I = {
  info: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  project: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
  users: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  maintenance: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
  check: (c = '#fff', s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  plus: (c = '#fff', s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  trash: (c = P.red, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  edit: (c = P.textSec, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  eye: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeOff: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  close: (c = P.textMuted, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  download: (c = '#fff', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  search: (c = P.textMuted, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  calendar: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  source: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  arrowLeft: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
};

// ============================================================
// COMPOSANTS COMMUNS
// ============================================================
const SectionTitle = ({ title, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${P.border}` }}>
    <h3 style={{ fontSize: 12, fontWeight: 800, color: P.text, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>{title}</h3>
    {action}
  </div>
);

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: P.textSec, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</label>
);

const ActionBtn = ({ label, icon, color, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '8px 16px', background: color, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1, transition: 'all .2s' }}>
    {icon}{label}
  </button>
);

const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: .3 }}>{children}</span>
));

const Empty = React.memo(({ text }) => (
  <div style={{ textAlign: 'center', padding: '16px 0', color: P.textMuted }}>
    <p style={{ fontSize: 11, margin: 0, fontWeight: 600 }}>{text}</p>
  </div>
));

// ============================================================
// PAGE PARAMÈTRES
// ============================================================
const PageParametres = () => {
  const { userProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState('infos');
  const isAdmin = ['ADMIN'].includes(userProfile?.role);

  const tabs = [
    { id: 'infos', label: 'Infos & Structure', icon: 'info' },
  ];
  if (isAdmin) tabs.push({ id: 'utilisateurs', label: 'Utilisateurs', icon: 'users' });
  if (isAdmin) tabs.push({ id: 'maintenance', label: 'Maintenance', icon: 'maintenance' });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: P.greenDark, margin: 0, letterSpacing: -0.5 }}>Paramètres Système</h1>
      </div>
      
      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `2px solid ${P.border}`, paddingBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                background: isActive ? P.greenDark : 'transparent', color: isActive ? '#fff' : P.textSec,
              }}
            >
              {I[tab.icon](isActive ? '#fff' : P.textSec, 16)}
              {tab.label}
            </div>
          );
        })}
      </div>

      {activeTab === 'infos' && <TabInfos />}
      {activeTab === 'maintenance' && isAdmin && <TabMaintenance />}
      {activeTab === 'utilisateurs' && isAdmin && <PageAdmin />}
    </div>
  );
};

// ============================================================
// ONGLET INFOS (GRILLE 3 COLONNES STRICTES & DENSES)
// ============================================================
const TabInfos = () => {
  const { projet, setProjet, sources, setSources, exercices, setExercices, ops, budgets } = useAppContext();
  
  // -- State Projet
  const [formProj, setFormProj] = useState(projet || {
    pays: "République de Côte d'Ivoire", devise: "Union – Discipline – Travail", ministere: "", nomProjet: "",
    sigle: "", codeImputation: "", nbCaracteresLigne: 4, coordonnateur: "", titreCoordonnateur: "",
    nbExemplairesCF: 4, nbExemplairesAC: 2, adminPassword: ""
  });
  const [savingProj, setSavingProj] = useState(false);
  const [savedProj, setSavedProj] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // -- State Sources
  const [showSrcModal, setShowSrcModal] = useState(false);
  const [editSource, setEditSource] = useState(null);
  const [formSrc, setFormSrc] = useState({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#1B6B2E' });

  // -- State Exercices
  const [showExModal, setShowExModal] = useState(false);
  const [formEx, setFormEx] = useState({ annee: new Date().getFullYear(), actif: true });

  useEffect(() => {
    if (projet) {
      setFormProj({
        pays: "République de Côte d'Ivoire", devise: "Union – Discipline – Travail", nbExemplairesCF: 4, nbExemplairesAC: 2, nbCaracteresLigne: 4,
        ...projet
      });
      setConfirmPassword(projet.adminPassword || '');
    }
  }, [projet]);

  // --- Handlers Projet
  const handleSaveProjet = async () => {
    if (formProj.adminPassword && formProj.adminPassword !== confirmPassword) { alert('Les mots de passe ne correspondent pas'); return; }
    setSavingProj(true);
    try {
      await setDoc(doc(db, 'parametres', 'projet'), formProj);
      setProjet(formProj);
      setSavedProj(true); setTimeout(() => setSavedProj(false), 3000);
    } catch (error) { console.error(error); alert('Erreur sauvegarde projet'); }
    setSavingProj(false);
  };

  // --- Handlers Sources
  const openNewSrc = () => { setFormSrc({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#1B6B2E' }); setEditSource(null); setShowSrcModal(true); };
  const openEditSrc = (source) => { setFormSrc(source); setEditSource(source); setShowSrcModal(true); };
  
  const handleSaveSrc = async () => {
    if (!formSrc.nom || !formSrc.sigle) return alert('Nom et sigle requis');
    try {
      if (editSource) {
        await updateDoc(doc(db, 'sources', editSource.id), formSrc);
        setSources(sources.map(s => s.id === editSource.id ? { ...s, ...formSrc } : s));
      } else {
        const docRef = await addDoc(collection(db, 'sources'), formSrc);
        setSources([...sources, { id: docRef.id, ...formSrc }]);
      }
      setShowSrcModal(false);
    } catch (error) { console.error(error); alert('Erreur sauvegarde source'); }
  };
  
  const handleDeleteSrc = async (source) => {
    // Mesure de sécurité : Empêcher la suppression si rattachée
    const isUsed = (ops && ops.some(o => o.sourceId === source.id)) || (budgets && budgets.some(b => b.sourceId === source.id));
    if (isUsed) {
      alert(`Sécurité : Impossible de supprimer la source "${source.sigle}". Des données (OP ou Budgets) y sont rattachées.`);
      return;
    }
    if (!window.confirm(`Supprimer définitivement la source "${source.sigle}" ?`)) return;
    try { await deleteDoc(doc(db, 'sources', source.id)); setSources(sources.filter(s => s.id !== source.id)); } 
    catch (error) { console.error(error); alert('Erreur suppression source'); }
  };

  // --- Handlers Exercices
  const handleSaveEx = async () => {
    if (!formEx.annee) return alert("L'année est requise");
    try {
      if (formEx.actif) {
        for (const ex of exercices.filter(e => e.actif)) await updateDoc(doc(db, 'exercices', ex.id), { actif: false });
      }
      const docRef = await addDoc(collection(db, 'exercices'), formEx);
      const newEx = exercices.map(e => formEx.actif ? { ...e, actif: false } : e);
      setExercices([{ id: docRef.id, ...formEx }, ...newEx].sort((a, b) => b.annee - a.annee));
      setShowExModal(false);
    } catch (error) { console.error(error); alert('Erreur sauvegarde exercice'); }
  };
  
  const setActifEx = async (ex) => {
    try {
      for (const e of exercices) await updateDoc(doc(db, 'exercices', e.id), { actif: e.id === ex.id });
      setExercices(exercices.map(e => ({ ...e, actif: e.id === ex.id })));
    } catch (error) { console.error(error); }
  };

  const handleDeleteEx = async (ex) => {
    // Mesure de sécurité : Empêcher la suppression si rattaché
    const isUsed = (ops && ops.some(o => o.exerciceId === ex.id)) || (budgets && budgets.some(b => b.exerciceId === ex.id));
    if (isUsed) {
      alert(`Sécurité : Impossible de supprimer l'exercice ${ex.annee}. Des données y sont rattachées.`);
      return;
    }
    if (!window.confirm(`Supprimer définitivement l'exercice ${ex.annee} ?`)) return;
    try { await deleteDoc(doc(db, 'exercices', ex.id)); setExercices(exercices.filter(e => e.id !== ex.id)); } 
    catch (error) { console.error(error); alert('Erreur suppression exercice'); }
  };

  // Styles mutualisés
  const cardStyle = { background: P.card, borderRadius: 10, padding: 16, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' };
  const inputStyle = { ...styles.input, marginBottom: 0, borderRadius: 6, fontSize: 11, padding: '8px 10px', boxSizing: 'border-box', width: '100%', height: 34 };
  const thStyle = { ...styles.th, fontSize: 10, color: P.textSec, textTransform: 'uppercase', padding: '6px 8px', background: '#FAFAF8' };

  return (
    <div>
      {/* GRILLE 3 COLONNES STRICTES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
        
        {/* ================= COLONNE 1 : IDENTITÉ DU PROJET ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <SectionTitle title="1. Identité du Projet" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><Label>Nom complet du projet</Label><input value={formProj.nomProjet || ''} onChange={e => setFormProj({...formProj, nomProjet: e.target.value})} style={inputStyle} /></div>
              <div><Label>Ministère de tutelle</Label><input value={formProj.ministere || ''} onChange={e => setFormProj({...formProj, ministere: e.target.value})} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><Label>Sigle officiel</Label><input value={formProj.sigle || ''} onChange={e => setFormProj({...formProj, sigle: e.target.value})} style={inputStyle} placeholder="Ex: PIF2" /></div>
                <div><Label>Pays</Label><input value={formProj.pays || ''} onChange={e => setFormProj({...formProj, pays: e.target.value})} style={inputStyle} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}><Label>Devise</Label><input value={formProj.devise || ''} onChange={e => setFormProj({...formProj, devise: e.target.value})} style={inputStyle} /></div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Responsable & Signataire" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <div><Label>Nom / Prénom</Label><input value={formProj.coordonnateur || ''} onChange={e => setFormProj({...formProj, coordonnateur: e.target.value})} style={inputStyle} placeholder="Nom du signataire" /></div>
              <div><Label>Titre (Affiché sur Bordereaux)</Label><input value={formProj.titreCoordonnateur || ''} onChange={e => setFormProj({...formProj, titreCoordonnateur: e.target.value})} style={inputStyle} placeholder="Ex: LA COORDONNATRICE" /></div>
            </div>
          </div>
        </div>

        {/* ================= COLONNE 2 : TECHNIQUE & SÉCURITÉ ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <SectionTitle title="2. Règles d'imputation" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><Label>Préfixe Budgétaire</Label><input value={formProj.codeImputation || ''} onChange={e => setFormProj({...formProj, codeImputation: e.target.value})} style={inputStyle} placeholder="Ex: 345 9004..." /></div>
              <div><Label>Format Ligne Budgétaire</Label>
                <select value={formProj.nbCaracteresLigne || 4} onChange={e => setFormProj({...formProj, nbCaracteresLigne: parseInt(e.target.value)})} style={inputStyle}>
                  <option value={4}>4 chiffres (ex: 3111)</option>
                  <option value={6}>6 chiffres (ex: 311100)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Impressions" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><Label>Exemplaires CF</Label><input type="number" min="1" value={formProj.nbExemplairesCF ?? 4} onChange={e => setFormProj({...formProj, nbExemplairesCF: parseInt(e.target.value) || 4})} style={inputStyle} /></div>
              <div><Label>Exemplaires AC</Label><input type="number" min="1" value={formProj.nbExemplairesAC ?? 2} onChange={e => setFormProj({...formProj, nbExemplairesAC: parseInt(e.target.value) || 2})} style={inputStyle} /></div>
            </div>
          </div>

          <div style={{ ...cardStyle, background: P.goldLight, border: `1px solid ${P.goldBorder}` }}>
            <SectionTitle title="Sécurité Administrateur" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
              <div>
                <Label>Nouveau mot de passe</Label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={formProj.adminPassword || ''} onChange={e => setFormProj({...formProj, adminPassword: e.target.value})} style={{ ...inputStyle, paddingRight: 26 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{showPassword ? I.eyeOff(P.textSec, 14) : I.eye(P.textSec, 14)}</button>
                </div>
              </div>
              <div>
                <Label>Confirmer</Label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
              </div>
            </div>
            {formProj.adminPassword && confirmPassword && formProj.adminPassword !== confirmPassword && <div style={{ color: P.red, fontSize: 10, fontWeight: 700, margin: '4px 0' }}>Les mots de passe diffèrent</div>}
          </div>

          {/* BOUTON SAUVEGARDE GLOBALE */}
          <div style={{ ...cardStyle, background: P.greenLight, borderColor: P.green, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
             {savedProj ? <span style={{ color: P.greenDark, fontWeight: 700, fontSize: 12 }}>✓ Enregistré</span> : <span style={{fontSize: 10, color: P.greenDark, fontWeight: 600, textTransform:'uppercase'}}>Valider les modifications &rarr;</span>}
             <ActionBtn label={savingProj ? "Patientez..." : "Enregistrer"} icon={I.check()} color={P.greenDark} onClick={handleSaveProjet} disabled={savingProj} />
          </div>
        </div>

        {/* ================= COLONNE 3 : BASES DE DONNÉES ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={cardStyle}>
            <SectionTitle title="3. Sources de financement" action={<button onClick={openNewSrc} style={{ background: P.greenLight, color: P.greenDark, border: 'none', borderRadius: 4, padding: '4px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{I.plus(P.greenDark, 12)} Ajouter</button>} />
            {sources.length === 0 ? <Empty text="Aucune source" /> : (
              <div style={{ border: `1px solid ${P.border}`, borderRadius: 6, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr><th style={{...thStyle, textAlign:'left'}}>Sigle</th><th style={thStyle}>Compte</th><th style={{...thStyle, width: 40, textAlign:'right'}}>Act.</th></tr>
                  </thead>
                  <tbody>
                    {sources.map(s => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}><div style={{display:'flex', alignItems:'center', gap:6}}><div style={{width:8, height:8, borderRadius:'50%', background: s.couleur}}/>{s.sigle}</div></td>
                        <td style={{ padding: '6px 8px', textAlign:'center' }}><Badge bg={s.compteDebiter==='BAILLEUR'?P.greenLight:P.goldLight} color={s.compteDebiter==='BAILLEUR'?P.greenDark:P.gold}>{s.compteDebiter}</Badge></td>
                        <td style={{ padding: '6px 8px', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={() => openEditSrc(s)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:2 }}>{I.edit(P.textSec, 13)}</button>
                          <button onClick={() => handleDeleteSrc(s)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:2 }}>{I.trash(P.red, 13)}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Exercices budgétaires" action={<button onClick={() => { setFormEx({ annee: new Date().getFullYear() + 1, actif: false }); setShowExModal(true); }} style={{ background: P.greenLight, color: P.greenDark, border: 'none', borderRadius: 4, padding: '4px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{I.plus(P.greenDark, 12)} Ajouter</button>} />
            {exercices.length === 0 ? <Empty text="Aucun exercice" /> : (
              <div style={{ border: `1px solid ${P.border}`, borderRadius: 6, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr><th style={{...thStyle, textAlign:'left'}}>Année</th><th style={thStyle}>Statut</th><th style={{...thStyle, width: 60, textAlign:'right'}}>Action</th></tr>
                  </thead>
                  <tbody>
                    {exercices.map(ex => (
                      <tr key={ex.id} style={{ borderBottom: `1px solid ${P.border}`, background: ex.actif ? P.greenLight : 'transparent' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 800, fontSize: 12, color: ex.actif ? P.greenDark : P.text }}>{ex.annee}</td>
                        <td style={{ padding: '6px 8px', textAlign:'center' }}>{ex.actif ? <Badge bg={P.greenDark} color="#fff">Actif</Badge> : <span style={{color:P.textMuted}}>Clôturé</span>}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {!ex.actif && <button onClick={() => setActifEx(ex)} style={{ background: '#fff', border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 9, fontWeight: 600 }}>Activer</button>}
                          {!ex.actif && <button onClick={() => handleDeleteEx(ex)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:2 }}>{I.trash(P.red, 13)}</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ================= MODALES D'AJOUT (SOURCES ET EXERCICES) ================= */}
      {showSrcModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(3px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: P.greenDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 13, textTransform: 'uppercase' }}>{editSource ? 'Modifier la source' : 'Nouvelle source'}</h3>
              <button onClick={() => setShowSrcModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding:0 }}>{I.close('#fff')}</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}><Label>Nom complet *</Label><input value={formSrc.nom} onChange={e => setFormSrc({...formSrc, nom: e.target.value})} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><Label>Sigle *</Label><input value={formSrc.sigle} onChange={e => setFormSrc({...formSrc, sigle: e.target.value})} style={inputStyle} /></div>
                <div><Label>Compte à débiter</Label><select value={formSrc.compteDebiter} onChange={e => setFormSrc({...formSrc, compteDebiter: e.target.value})} style={inputStyle}><option value="BAILLEUR">BAILLEUR</option><option value="TRESOR">TRÉSOR</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                 <div><Label>Description</Label><input value={formSrc.description || ''} onChange={e => setFormSrc({...formSrc, description: e.target.value})} style={inputStyle} placeholder="Facultatif..." /></div>
                 <div><Label>Couleur</Label><input type="color" value={formSrc.couleur} onChange={e => setFormSrc({...formSrc, couleur: e.target.value})} style={{ width: 40, height: 34, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} /></div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', background: '#FAFAF8', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowSrcModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>Annuler</button>
              <ActionBtn label="Valider" icon={I.check()} color={P.greenDark} onClick={handleSaveSrc} />
            </div>
          </div>
        </div>
      )}

      {showExModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(3px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 300, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: P.greenDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 13, textTransform:'uppercase' }}>Nouvel exercice</h3>
              <button onClick={() => setShowExModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding:0 }}>{I.close('#fff')}</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}><Label>Année</Label><input type="number" value={formEx.annee} onChange={e => setFormEx({...formEx, annee: parseInt(e.target.value)})} style={{...inputStyle, fontSize: 16, fontWeight: 800, textAlign:'center'}} /></div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent:'center', gap: 8, cursor: 'pointer', background: P.bg, padding: '10px 12px', borderRadius: 8 }}>
                <input type="checkbox" checked={formEx.actif} onChange={e => setFormEx({...formEx, actif: e.target.checked})} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Définir comme actif</span>
              </label>
            </div>
            <div style={{ padding: '12px 20px', background: '#FAFAF8', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button onClick={() => setShowExModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>Annuler</button>
              <ActionBtn label="Créer" icon={I.check()} color={P.greenDark} onClick={handleSaveEx} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ============================================================
// ONGLET MAINTENANCE (TOTALEMENT RESTRUCTURÉ ET SÉCURISÉ)
// ============================================================
const TabMaintenance = () => {
  const { projet, sources, exercices, ops, bordereaux, beneficiaires, setOps, setBordereaux } = useAppContext();
  const [tool, setTool] = useState(null); 
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [purgeExercice, setPurgeExercice] = useState('');
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [purgeScope, setPurgeScope] = useState('exercice'); 
  const [importExercice, setImportExercice] = useState('');
  const [importData, setImportData] = useState(null); 
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [compteurExercice, setCompteurExercice] = useState('');
  const [doublonExercice, setDoublonExercice] = useState('');
  const [doublons, setDoublons] = useState(null);

  const showMsg = (text, type = 'success') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 5000); };
  
  const checkPwd = () => {
    const p = window.prompt('Mot de passe admin requis :');
    if (p !== (projet?.motDePasseAdmin || 'admin123')) { if (p !== null) alert('Mot de passe incorrect'); return false; }
    return true;
  };

  const getBen = (op) => op?.beneficiaireNom || beneficiaires?.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';

  // Outils Actions
  const handlePurge = async () => {
    if (!checkPwd()) return;
    if (purgeScope === 'exercice' && !purgeExercice) return alert('Sélectionnez un exercice.');
    if (purgeConfirm !== 'SUPPRIMER') return alert('Tapez exactement SUPPRIMER pour confirmer.');
    const exLabel = purgeScope === 'tout' ? 'TOUS LES EXERCICES' : exercices.find(e => e.id === purgeExercice)?.annee;
    if (!window.confirm(`DERNIÈRE CONFIRMATION :\n\nSupprimer tous les OP et bordereaux de ${exLabel} ?\n\nCette action est IRRÉVERSIBLE.`)) return;
    
    setSaving(true);
    try {
      let opsToDelete, btsToDelete;
      if (purgeScope === 'tout') { opsToDelete = ops; btsToDelete = bordereaux; } 
      else { opsToDelete = ops.filter(o => o.exerciceId === purgeExercice); btsToDelete = bordereaux.filter(b => b.exerciceId === purgeExercice); }

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

      if (purgeScope === 'tout') {
        const comptSnap = await getDocs(collection(db, 'compteurs'));
        for (const d of comptSnap.docs) await deleteDoc(doc(db, 'compteurs', d.id));
      } else {
        const comptSnap = await getDocs(collection(db, 'compteurs'));
        for (const d of comptSnap.docs) { if (d.data().exerciceId === purgeExercice) await deleteDoc(doc(db, 'compteurs', d.id)); }
      }

      showMsg(`Purge terminée : ${opsToDelete.length} OP et ${btsToDelete.length} bordereaux supprimés.`);
      setPurgeConfirm(''); setTool(null);
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  const handleDownloadCanevas = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const colonnes = ['N° OP', 'Type', 'Bénéficiaire', 'Objet', 'Montant', 'Ligne budgétaire', 'Mode règlement', 'Date création', 'Statut', 'Date transmission CF', 'N° Bordereau CF', 'Date visa CF', 'Date transmission AC', 'N° Bordereau AC', 'Date paiement', 'Montant payé', 'Référence paiement', 'N° OP Provisoire', 'Observation'];

    sources.forEach(src => {
      const ws = XLSX.utils.aoa_to_sheet([[...colonnes]]);
      ws['!cols'] = colonnes.map((c) => ({ wch: c.length < 12 ? 15 : c.length + 4 }));
      XLSX.utils.book_append_sheet(wb, ws, src.sigle || src.nom);
    });

    XLSX.writeFile(wb, 'Canevas_Import_OP.xlsx');
    showMsg('Canevas téléchargé !');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImportFile(file); const XLSX = await import('xlsx'); const data = await file.arrayBuffer(); const wb = XLSX.read(data);
    const parsed = {}; let totalOps = 0;
    sources.forEach(src => {
      const sheetName = wb.SheetNames.find(s => s === (src.sigle || src.nom));
      if (sheetName) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        if (rows.length > 0) { parsed[src.id] = { sigle: src.sigle, rows }; totalOps += rows.length; }
      }
    });
    setImportData(parsed);
    setImportPreview({ total: totalOps, parSource: Object.entries(parsed).map(([id, d]) => ({ sigle: d.sigle, count: d.rows.length })) });
  };

  const handleImport = async () => {
    if (!importData || !importExercice) return alert('Sélectionnez un exercice et un fichier.');
    if (!checkPwd()) return;
    const exercice = exercices.find(e => e.id === importExercice);
    if (!window.confirm(`Importer ${importPreview.total} OP dans l'exercice ${exercice?.annee} ?`)) return;

    setSaving(true);
    let imported = 0, errors = [];
    try {
      for (const [sourceId, { rows }] of Object.entries(importData)) {
        for (const row of rows) {
          try {
            const numero = String(row['N° OP'] || '').trim();
            const benNom = String(row['Bénéficiaire'] || '').trim();
            const montant = parseFloat(String(row['Montant'] || '0').replace(/\s/g, '').replace(/,/g, '.')) || 0;
            if (!numero || !benNom || !montant) continue;
            const ben = beneficiaires.find(b => (b.nom || '').toLowerCase().trim() === benNom.toLowerCase());
            if (!ben) { errors.push(`Bénéficiaire introuvable : "${benNom}"`); continue; }

            await addDoc(collection(db, 'ops'), {
              numero, type: String(row['Type'] || 'PROVISOIRE').trim().toUpperCase(),
              sourceId, exerciceId: importExercice, beneficiaireId: ben.id, objet: String(row['Objet'] || '').trim(),
              montant, ligneBudgetaire: String(row['Ligne budgétaire'] || '').trim(),
              modeReglement: 'VIREMENT', statut: String(row['Statut'] || 'CREE').trim().toUpperCase(),
              dateCreation: String(row['Date création'] || '').trim() || new Date().toISOString().split('T')[0],
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            });
            imported++;
          } catch (rowErr) { errors.push(`Erreur ligne : ${rowErr.message}`); }
        }
      }
      alert(`${imported} OP importés.\n${errors.length} erreurs.`);
      setImportData(null); setImportPreview(null); setImportFile(null); setTool(null);
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  const handleRecalerCompteurs = async () => {
    if (!compteurExercice || !checkPwd()) return;
    setSaving(true);
    try {
      let fixed = 0;
      for (const src of sources) {
        for (const typeBT of ['CF', 'AC']) {
          const bts = bordereaux.filter(b => b.type === typeBT && b.sourceId === src.id && b.exerciceId === compteurExercice);
          let maxNum = 0;
          bts.forEach(b => { const m = (b.numero || '').match(/(\d{4})\//); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });
          await setDoc(doc(db, 'compteurs', `${typeBT}_${src.id}_${compteurExercice}`), { count: maxNum, type: typeBT, sourceId: src.id, exerciceId: compteurExercice });
          fixed++;
        }
      }
      showMsg(`${fixed} compteurs recalés.`); setTool(null);
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  const handleDetecterDoublons = () => {
    if (!doublonExercice) return;
    const opsEx = ops.filter(o => o.exerciceId === doublonExercice);
    const numCount = {};
    opsEx.forEach(o => { numCount[o.numero] = (numCount[o.numero] || 0) + 1; });
    setDoublons(Object.entries(numCount).filter(([, c]) => c > 1).map(([num, count]) => ({ numero: num, count, ops: opsEx.filter(o => o.numero === num) })));
  };

  const handleFixDoublon = async (dup) => {
    if (!checkPwd()) return;
    setSaving(true);
    try {
      const opsToFix = dup.ops.slice(1); 
      const opsEx = ops.filter(o => o.exerciceId === doublonExercice);
      let maxNum = 0;
      opsEx.forEach(o => { const m = (o.numero || '').match(/N°(\d+)\//); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });
      for (const op of opsToFix) {
        maxNum++;
        await updateDoc(doc(db, 'ops', op.id), { numero: op.numero.replace(/N°\d+\//, `N°${String(maxNum).padStart(4, '0')}/`), updatedAt: new Date().toISOString() });
      }
      showMsg(`${opsToFix.length} doublon(s) corrigé(s).`);
      handleDetecterDoublons();
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  const btnTool = (id, iconSvg, label, desc, color) => (
    <div key={id} onClick={() => setTool(id)}
      style={{ flex: 1, minWidth: 220, padding: 20, borderRadius: 12, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconSvg}</div>
      <div style={{ fontWeight: 800, fontSize: 14, color }}>{label}</div>
      <div style={{ fontSize: 11, color: P.textSec, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );

  const cardStyle = { background: 'white', borderRadius: 12, padding: 24, border: `1px solid ${P.border}` };

  return (
    <div>
      {message && <div style={{ padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12, fontWeight: 700, background: message.type === 'success' ? P.greenLight : P.redLight, color: message.type === 'success' ? P.greenDark : P.red, textAlign:'center' }}>{message.text}</div>}

      {tool === null ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: P.text, textTransform: 'uppercase' }}>Outils Maintenance Admin</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: P.red, fontWeight: 600 }}>Zone sensible — Mot de passe administrateur requis pour chaque action.</p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {btnTool('purge', I.trash(P.red, 20), 'Purge des données', 'Supprimer massivement les OP et bordereaux.', P.red)}
            {btnTool('import', I.project('#3B6B8A', 20), 'Import Excel', 'Importer massivement des OP.', '#3B6B8A')}
            {btnTool('compteurs', I.calendar(P.gold, 20), 'Recaler compteurs', 'Corriger la numérotation des bordereaux.', P.gold)}
            {btnTool('doublons', I.source(P.gold, 20), 'Doublons Numéros', 'Scanner et renommer les numéros OP en double.', P.gold)}
          </div>
        </>
      ) : (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setTool(null)} style={{ background: '#fff', border: `1px solid ${P.border}`, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, color: P.textSec }}>
            {I.arrowLeft(P.textSec, 14)} Retour aux outils
          </button>

          {/* === PURGE === */}
          {tool === 'purge' && (
            <div style={{...cardStyle, borderColor: P.red}}>
              <h3 style={{ color: P.red, margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Purge des données</h3>
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}><input type="radio" checked={purgeScope === 'exercice'} onChange={() => setPurgeScope('exercice')} /> Par exercice</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}><input type="radio" checked={purgeScope === 'tout'} onChange={() => setPurgeScope('tout')} /><span style={{ color: P.red, fontWeight: 700 }}>Tout purger </span></label>
              </div>
              {purgeScope === 'exercice' && <select value={purgeExercice} onChange={e => setPurgeExercice(e.target.value)} style={{ ...styles.input, width: 200, marginBottom: 0, fontSize: 12 }}><option value="">-- Exercice --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select>}
              <div style={{ marginTop: 20 }}><Label>Tapez SUPPRIMER pour confirmer :</Label><input value={purgeConfirm} onChange={e => setPurgeConfirm(e.target.value)} style={{ ...styles.input, width: 250, marginTop: 4, fontFamily: 'monospace', fontWeight: 700, marginBottom: 0 }} /></div>
              {purgeScope === 'exercice' && purgeExercice && <div style={{ fontSize: 12, color: P.textSec, marginTop: 12 }}>{ops.filter(o => o.exerciceId === purgeExercice).length} OP et {bordereaux.filter(b => b.exerciceId === purgeExercice).length} bordereaux seront détruits.</div>}
              {purgeScope === 'tout' && <div style={{ fontSize: 12, color: P.red, fontWeight: 700, marginTop: 12 }}>⚠️ La totalité de la base de données (OP et Bordereaux) sera détruite.</div>}
              <div style={{ marginTop: 20 }}><ActionBtn label={saving ? "Suppression..." : "Exécuter la purge"} icon={I.trash('#fff')} color={P.red} onClick={handlePurge} disabled={saving || purgeConfirm !== 'SUPPRIMER'} /></div>
            </div>
          )}

          {/* === IMPORT === */}
          {tool === 'import' && (
            <div style={{...cardStyle, borderColor: '#3B6B8A'}}>
              <h3 style={{ color: '#3B6B8A', margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Import OP depuis Excel</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: P.bg, padding: 16, borderRadius: 8 }}>
                  <Label>1. Télécharger le canevas vierge</Label>
                  <ActionBtn label="Télécharger" icon={I.download()} color="#3B6B8A" onClick={handleDownloadCanevas} />
                </div>
                <div style={{ background: P.bg, padding: 16, borderRadius: 8 }}>
                  <Label>2. Importer les données</Label>
                  <select value={importExercice} onChange={e => setImportExercice(e.target.value)} style={{ ...styles.input, marginBottom: 10, fontSize: 12 }}><option value="">-- Exercice Cible --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ fontSize: 12, width: '100%' }} />
                </div>
              </div>
              {importPreview && (
                <div style={{ marginTop: 20, background: P.greenLight, padding: 16, borderRadius: 8 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: P.greenDark }}>Prévisualisation : {importPreview.total} OP trouvés</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{importPreview.parSource.map((s, i) => <Badge key={i} bg="#fff" color={P.greenDark}>{s.sigle} : {s.count} OP</Badge>)}</div>
                </div>
              )}
              {importPreview && importExercice && <div style={{ marginTop: 20 }}><ActionBtn label={saving ? "Import en cours..." : `Valider l'import (${importPreview.total} OP)`} icon={I.check()} color="#3B6B8A" onClick={handleImport} disabled={saving} /></div>}
            </div>
          )}

          {/* === COMPTEURS === */}
          {tool === 'compteurs' && (
            <div style={{...cardStyle, borderColor: P.gold}}>
              <h3 style={{ color: P.gold, margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Recaler les compteurs</h3>
              <p style={{ fontSize: 12, color: P.textSec, marginBottom: 20 }}>Corrige la numérotation des prochains bordereaux en se basant sur l'historique.</p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <div><Label>Exercice cible</Label><select value={compteurExercice} onChange={e => setCompteurExercice(e.target.value)} style={{ ...styles.input, width: 250, marginBottom: 0, fontSize: 12 }}><option value="">-- Exercice --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select></div>
                <ActionBtn label={saving ? "Recalage en cours..." : "Lancer le recalage"} icon={I.check()} color={P.gold} onClick={handleRecalerCompteurs} disabled={saving || !compteurExercice} />
              </div>
            </div>
          )}

          {/* === DOUBLONS === */}
          {tool === 'doublons' && (
            <div style={{...cardStyle, borderColor: P.gold}}>
              <h3 style={{ color: P.gold, margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Scanner les Doublons</h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 20 }}>
                <div><Label>Exercice à scanner</Label><select value={doublonExercice} onChange={e => setDoublonExercice(e.target.value)} style={{ ...styles.input, width: 250, marginBottom: 0, fontSize: 12 }}><option value="">-- Exercice --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select></div>
                <ActionBtn label="Lancer le scan" icon={I.search('#fff')} color={P.gold} onClick={handleDetecterDoublons} disabled={!doublonExercice} />
              </div>
              
              {doublons !== null && (
                doublons.length === 0 ? <div style={{ padding: 16, background: P.greenLight, color: P.greenDark, borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>✓ Aucun numéro en doublon détecté.</div> : (
                  <div>
                    <div style={{ padding: '8px 12px', background: P.redLight, color: P.red, borderRadius: 8, fontWeight: 700, fontSize: 12, marginBottom: 12 }}>⚠️ {doublons.length} numéro(s) en double</div>
                    {doublons.map((dup, i) => (
                      <div key={i} style={{ padding: 16, background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{dup.numero} <Badge bg={P.goldLight} color={P.gold}>{dup.count}x</Badge></div>
                          <div style={{ fontSize: 11, color: P.textSec }}>{dup.ops.map(o => `${o.type} (${formatMontant(o.montant)}F) - ${getBen(o)}`).join(' | ')}</div>
                        </div>
                        <ActionBtn label="Corriger" icon={I.edit('#fff')} color={P.gold} onClick={() => handleFixDoublon(dup)} disabled={saving} />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PageParametres;
