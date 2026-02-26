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
  arrowLeft: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  alertCircle: (c = P.gold, s = 40) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

// ============================================================
// COMPOSANTS COMMUNS & MODALES PERSONNALISÉES
// ============================================================
const SectionTitle = ({ title, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${P.border}` }}>
    <h3 style={{ fontSize: 13, fontWeight: 800, color: P.text, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>{title}</h3>
    {action}
  </div>
);

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.textSec, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</label>
);

const ActionBtn = ({ label, icon, color, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '8px 16px', background: color, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1, transition: 'all .2s', boxShadow: `0 2px 6px ${color}44` }}>
    {icon}{label}
  </button>
);

const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: .3 }}>{children}</span>
));

const Empty = React.memo(({ text }) => (
  <div style={{ textAlign: 'center', padding: '16px 0', color: P.textMuted }}>
    <p style={{ fontSize: 12, margin: 0, fontWeight: 600 }}>{text}</p>
  </div>
));

// Modale d'Alerte et de Confirmation ultra-propre (remplace window.confirm et window.prompt)
const ModalAlert = ({ data, onClose }) => {
  const [val, setVal] = useState('');
  useEffect(() => { setVal(''); }, [data]); // Réinitialise l'input à chaque nouvelle modale

  if (!data) return null;

  const isConfirm = data.type === 'confirm';
  const color = data.type === 'error' ? P.red : isConfirm ? P.gold : P.greenDark;
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 400, boxShadow: '0 20px 50px rgba(0,0,0,.2)', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          {data.type === 'error' ? I.alertCircle(P.red, 48) : I.alertCircle(color, 48)}
        </div>
        <h3 style={{ color: P.text, margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>{data.title}</h3>
        <p style={{ color: P.textSec, fontSize: 14, marginBottom: 24, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{data.message}</p>
        
        {(data.showInput || data.showPwd) && (
          <div style={{ marginBottom: 24, textAlign: 'left' }}>
            {data.inputLabel && <Label>{data.inputLabel}</Label>}
            <input 
              type={data.showPwd ? "password" : "text"} 
              autoFocus 
              value={val} 
              onChange={e => setVal(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: `2px solid ${P.border}`, boxSizing: 'border-box', fontSize: 14, outline: 'none' }} 
              placeholder={data.showPwd ? "Saisissez le mot de passe administrateur" : "Saisissez ici..."} 
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {isConfirm && (
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${P.border}`, background: '#f9f9f9', cursor: 'pointer', fontWeight: 700, color: P.textSec }}>
              Annuler
            </button>
          )}
          <button 
            onClick={() => { 
              if (isConfirm && (data.showInput || data.showPwd) && !val) return; 
              const confirmFn = data.onConfirm; 
              const finalVal = val; 
              onClose(); 
              if (isConfirm && confirmFn) setTimeout(() => confirmFn(finalVal), 150);
            }} 
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: color, color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: `0 4px 12px ${color}44` }}
          >
            {isConfirm ? 'Confirmer' : 'Compris'}
          </button>
        </div>
      </div>
    </div>
  );
};


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
    <div style={{ width: '100%' }}> {/* CONTENEUR ÉLARGI AU MAXIMUM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: P.greenDark, margin: 0, letterSpacing: -0.5 }}>Paramètres Système</h1>
      </div>
      
      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `2px solid ${P.border}`, paddingBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: isActive ? P.greenDark : 'transparent', color: isActive ? '#fff' : P.textSec,
              }}
            >
              {I[tab.icon](isActive ? '#fff' : P.textSec, 16)}
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'infos' && <TabInfos />}
      {activeTab === 'maintenance' && isAdmin && <TabMaintenance />}
      {activeTab === 'utilisateurs' && isAdmin && <PageAdmin />}
    </div>
  );
};

// ============================================================
// ONGLET INFOS (GRILLE 3 COLONNES ÉQUILIBRÉES)
// ============================================================
const TabInfos = () => {
  const { projet, setProjet, sources, setSources, exercices, setExercices, ops, budgets } = useAppContext();
  const [alertData, setAlertData] = useState(null);
  
  // Helpers Modales
  const notify = (type, title, message) => setAlertData({ type, title, message });
  const ask = (title, message, onConfirm, showPwd = false) => setAlertData({ type: 'confirm', title, message, onConfirm, showPwd });

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
    if (formProj.adminPassword && formProj.adminPassword !== confirmPassword) { notify('error', 'Erreur de saisie', 'Les mots de passe ne correspondent pas.'); return; }
    setSavingProj(true);
    try {
      await setDoc(doc(db, 'parametres', 'projet'), formProj);
      setProjet(formProj);
      setSavedProj(true); setTimeout(() => setSavedProj(false), 3000);
    } catch (error) { notify('error', 'Erreur', 'Impossible de sauvegarder les paramètres du projet.'); }
    setSavingProj(false);
  };

  // --- Handlers Sources
  const openNewSrc = () => { setFormSrc({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#1B6B2E' }); setEditSource(null); setShowSrcModal(true); };
  const openEditSrc = (source) => { setFormSrc(source); setEditSource(source); setShowSrcModal(true); };
  
  const handleSaveSrc = async () => {
    if (!formSrc.nom || !formSrc.sigle) return notify('error', 'Champs requis', 'Le nom et le sigle sont obligatoires.');
    try {
      if (editSource) {
        await updateDoc(doc(db, 'sources', editSource.id), formSrc);
        setSources(sources.map(s => s.id === editSource.id ? { ...s, ...formSrc } : s));
      } else {
        const docRef = await addDoc(collection(db, 'sources'), formSrc);
        setSources([...sources, { id: docRef.id, ...formSrc }]);
      }
      setShowSrcModal(false);
    } catch (error) { notify('error', 'Erreur', 'Impossible de sauvegarder la source.'); }
  };
  
  const handleDeleteSrc = async (source) => {
    const isUsed = (ops && ops.some(o => o.sourceId === source.id)) || (budgets && budgets.some(b => b.sourceId === source.id));
    if (isUsed) {
      return notify('error', 'Sécurité activée', `Impossible de supprimer la source "${source.sigle}".\nDes données (OP ou Budgets) y sont rattachées.`);
    }
    ask('Suppression Source', `Êtes-vous sûr de vouloir supprimer définitivement la source "${source.sigle}" ?`, async () => {
      try { await deleteDoc(doc(db, 'sources', source.id)); setSources(sources.filter(s => s.id !== source.id)); } 
      catch (error) { notify('error', 'Erreur', 'Impossible de supprimer la source.'); }
    });
  };

  // --- Handlers Exercices
  const handleSaveEx = async () => {
    if (!formEx.annee) return notify('error', 'Saisie', "L'année est requise.");
    try {
      if (formEx.actif) {
        for (const ex of exercices.filter(e => e.actif)) await updateDoc(doc(db, 'exercices', ex.id), { actif: false });
      }
      const docRef = await addDoc(collection(db, 'exercices'), formEx);
      const newEx = exercices.map(e => formEx.actif ? { ...e, actif: false } : e);
      setExercices([{ id: docRef.id, ...formEx }, ...newEx].sort((a, b) => b.annee - a.annee));
      setShowExModal(false);
    } catch (error) { notify('error', 'Erreur', 'Impossible de sauvegarder l\'exercice.'); }
  };
  
  const setActifEx = async (ex) => {
    ask('Changement d\'exercice', `Basculer l'application sur l'exercice budgétaire ${ex.annee} ?`, async () => {
      try {
        for (const e of exercices) await updateDoc(doc(db, 'exercices', e.id), { actif: e.id === ex.id });
        setExercices(exercices.map(e => ({ ...e, actif: e.id === ex.id })));
      } catch (error) { notify('error', 'Erreur', 'Impossible d\'activer l\'exercice.'); }
    });
  };

  const handleDeleteEx = async (ex) => {
    const isUsed = (ops && ops.some(o => o.exerciceId === ex.id)) || (budgets && budgets.some(b => b.exerciceId === ex.id));
    if (isUsed) {
      return notify('error', 'Sécurité activée', `Impossible de supprimer l'exercice ${ex.annee}.\nDes données (OP ou Budgets) y sont rattachées.`);
    }
    ask('Suppression Exercice', `Êtes-vous sûr de vouloir supprimer définitivement l'exercice ${ex.annee} ?`, async () => {
      try { await deleteDoc(doc(db, 'exercices', ex.id)); setExercices(exercices.filter(e => e.id !== ex.id)); } 
      catch (error) { notify('error', 'Erreur', 'Impossible de supprimer l\'exercice.'); }
    });
  };

  const cardStyle = { background: P.card, borderRadius: 12, padding: 24, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' };
  const inputStyle = { ...styles.input, marginBottom: 0, borderRadius: 8, fontSize: 13, padding: '10px 14px', boxSizing: 'border-box', width: '100%', height: 42 };
  const thStyle = { ...styles.th, fontSize: 11, color: P.textSec, textTransform: 'uppercase', padding: '10px 14px', background: '#FAFAF8' };

  return (
    <div>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />

      {/* GRILLE 3 COLONNES HOMOGÈNES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* ================= COLONNE 1 : IDENTITÉ & RESPONSABLE ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={cardStyle}>
            <SectionTitle title="Identité du Projet" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><Label>Nom complet du projet</Label><input value={formProj.nomProjet || ''} onChange={e => setFormProj({...formProj, nomProjet: e.target.value})} style={inputStyle} /></div>
              <div><Label>Ministère de tutelle</Label><input value={formProj.ministere || ''} onChange={e => setFormProj({...formProj, ministere: e.target.value})} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><Label>Sigle officiel</Label><input value={formProj.sigle || ''} onChange={e => setFormProj({...formProj, sigle: e.target.value})} style={inputStyle} placeholder="Ex: PIF2" /></div>
                <div><Label>Devise</Label><input value={formProj.devise || ''} onChange={e => setFormProj({...formProj, devise: e.target.value})} style={inputStyle} /></div>
              </div>
              <div><Label>Pays</Label><input value={formProj.pays || ''} onChange={e => setFormProj({...formProj, pays: e.target.value})} style={inputStyle} /></div>
            </div>
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Signataire Principal" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><Label>Nom / Prénom</Label><input value={formProj.coordonnateur || ''} onChange={e => setFormProj({...formProj, coordonnateur: e.target.value})} style={inputStyle} placeholder="Nom du signataire" /></div>
              <div><Label>Titre (Affiché sur Bordereaux)</Label><input value={formProj.titreCoordonnateur || ''} onChange={e => setFormProj({...formProj, titreCoordonnateur: e.target.value})} style={inputStyle} placeholder="Ex: LA COORDONNATRICE" /></div>
            </div>
          </div>
        </div>

        {/* ================= COLONNE 2 : TECHNIQUE & SÉCURITÉ ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={cardStyle}>
            <SectionTitle title="Paramètres d'imputation" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><Label>Préfixe Budgétaire Global</Label><input value={formProj.codeImputation || ''} onChange={e => setFormProj({...formProj, codeImputation: e.target.value})} style={inputStyle} placeholder="Ex: 345 9004..." /></div>
              <div><Label>Format Ligne Budgétaire</Label>
                <select value={formProj.nbCaracteresLigne || 4} onChange={e => setFormProj({...formProj, nbCaracteresLigne: parseInt(e.target.value)})} style={inputStyle}>
                  <option value={4}>4 chiffres (ex: 3111)</option>
                  <option value={6}>6 chiffres (ex: 311100)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Tirages (Bordereaux)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><Label>Exemplaires CF</Label><input type="number" min="1" value={formProj.nbExemplairesCF ?? 4} onChange={e => setFormProj({...formProj, nbExemplairesCF: parseInt(e.target.value) || 4})} style={inputStyle} /></div>
              <div><Label>Exemplaires AC</Label><input type="number" min="1" value={formProj.nbExemplairesAC ?? 2} onChange={e => setFormProj({...formProj, nbExemplairesAC: parseInt(e.target.value) || 2})} style={inputStyle} /></div>
            </div>
          </div>

          <div style={{ ...cardStyle, background: P.goldLight, border: `1px solid ${P.goldBorder}` }}>
            <SectionTitle title="Sécurité Administrateur" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 }}>
              <div>
                <Label>Nouveau mot de passe admin</Label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={formProj.adminPassword || ''} onChange={e => setFormProj({...formProj, adminPassword: e.target.value})} style={{ ...inputStyle, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showPassword ? I.eyeOff(P.textSec, 18) : I.eye(P.textSec, 18)}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirmer le mot de passe</Label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ minHeight: 18, marginTop: 4 }}>
              {formProj.adminPassword && confirmPassword && formProj.adminPassword !== confirmPassword && <div style={{ color: P.red, fontSize: 12, fontWeight: 700 }}>⚠️ Les mots de passe diffèrent</div>}
            </div>
            <div style={{ fontSize: 11, color: P.textSec, lineHeight: 1.4, marginTop: 8 }}>Requis pour : suppressions d'OP, purges, révisions budgétaires et modifications critiques.</div>
          </div>

          {/* BOUTON SAUVEGARDE GLOBALE ÉPURÉ */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 4 }}>
             {savedProj && <span style={{ color: P.green, fontWeight: 800, fontSize: 14 }}>✓ Modifications enregistrées</span>}
             <ActionBtn label={savingProj ? "Enregistrement..." : "Enregistrer"} icon={I.check()} color={P.greenDark} onClick={handleSaveProjet} disabled={savingProj} />
          </div>
        </div>

        {/* ================= COLONNE 3 : BASES DE DONNÉES ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={cardStyle}>
            <SectionTitle title="Sources de financement" action={<button onClick={openNewSrc} style={{ background: P.greenLight, color: P.greenDark, border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>{I.plus(P.greenDark, 14)} Ajouter</button>} />
            {sources.length === 0 ? <Empty text="Aucune source configurée" /> : (
              <div style={{ border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr><th style={{...thStyle, textAlign:'left'}}>Sigle</th><th style={thStyle}>Compte</th><th style={{...thStyle, width: 60, textAlign:'right'}}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {sources.map(s => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}><div style={{display:'flex', alignItems:'center', gap:8}}><div style={{width:10, height:10, borderRadius:'50%', background: s.couleur}}/>{s.sigle}</div></td>
                        <td style={{ padding: '10px 12px', textAlign:'center' }}><Badge bg={s.compteDebiter==='BAILLEUR'?P.greenLight:P.goldLight} color={s.compteDebiter==='BAILLEUR'?P.greenDark:P.gold}>{s.compteDebiter}</Badge></td>
                        <td style={{ padding: '10px 12px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => openEditSrc(s)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:4 }}>{I.edit(P.textSec, 16)}</button>
                          <button onClick={() => handleDeleteSrc(s)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:4 }}>{I.trash(P.red, 16)}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Exercices budgétaires" action={<button onClick={() => { setFormEx({ annee: new Date().getFullYear() + 1, actif: false }); setShowExModal(true); }} style={{ background: P.greenLight, color: P.greenDark, border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>{I.plus(P.greenDark, 14)} Ajouter</button>} />
            {exercices.length === 0 ? <Empty text="Aucun exercice défini" /> : (
              <div style={{ border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr><th style={{...thStyle, textAlign:'left'}}>Année</th><th style={thStyle}>Statut</th><th style={{...thStyle, width: 80, textAlign:'right'}}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {exercices.map(ex => (
                      <tr key={ex.id} style={{ borderBottom: `1px solid ${P.border}`, background: ex.actif ? P.greenLight : 'transparent' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 14, color: ex.actif ? P.greenDark : P.text }}>{ex.annee}</td>
                        <td style={{ padding: '10px 12px', textAlign:'center' }}>{ex.actif ? <Badge bg={P.greenDark} color="#fff">Actif</Badge> : <span style={{color:P.textMuted, fontSize:11, fontWeight:600}}>Clôturé</span>}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {!ex.actif && <button onClick={() => setActifEx(ex)} style={{ background: '#fff', border: `1px solid ${P.border}`, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: P.textSec }}>Activer</button>}
                          {!ex.actif && <button onClick={() => handleDeleteEx(ex)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:4 }}>{I.trash(P.red, 16)}</button>}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 450, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ padding: '16px 24px', background: P.greenDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>{editSource ? 'Modifier la source' : 'Nouvelle source'}</h3>
              <button onClick={() => setShowSrcModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding:0 }}>{I.close('#fff', 20)}</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}><Label>Nom complet *</Label><input value={formSrc.nom} onChange={e => setFormSrc({...formSrc, nom: e.target.value})} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div><Label>Sigle *</Label><input value={formSrc.sigle} onChange={e => setFormSrc({...formSrc, sigle: e.target.value})} style={inputStyle} /></div>
                <div><Label>Compte à débiter</Label><select value={formSrc.compteDebiter} onChange={e => setFormSrc({...formSrc, compteDebiter: e.target.value})} style={inputStyle}><option value="BAILLEUR">BAILLEUR</option><option value="TRESOR">TRÉSOR</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
                 <div><Label>Description</Label><input value={formSrc.description || ''} onChange={e => setFormSrc({...formSrc, description: e.target.value})} style={inputStyle} placeholder="Facultatif..." /></div>
                 <div><Label>Couleur</Label><input type="color" value={formSrc.couleur} onChange={e => setFormSrc({...formSrc, couleur: e.target.value})} style={{ width: 44, height: 42, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }} /></div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', background: '#FAFAF8', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowSrcModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: P.textSec }}>Annuler</button>
              <ActionBtn label="Valider" icon={I.check()} color={P.greenDark} onClick={handleSaveSrc} />
            </div>
          </div>
        </div>
      )}

      {showExModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 350, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ padding: '16px 24px', background: P.greenDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 16, textTransform:'uppercase', letterSpacing: 0.5 }}>Nouvel exercice</h3>
              <button onClick={() => setShowExModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding:0 }}>{I.close('#fff', 20)}</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}><Label>Année budgétaire</Label><input type="number" value={formEx.annee} onChange={e => setFormEx({...formEx, annee: parseInt(e.target.value)})} style={{...inputStyle, fontSize: 20, fontWeight: 800, textAlign:'center', height: 50}} /></div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent:'center', gap: 10, cursor: 'pointer', background: P.bg, padding: '14px', borderRadius: 10 }}>
                <input type="checkbox" checked={formEx.actif} onChange={e => setFormEx({...formEx, actif: e.target.checked})} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Définir comme actif</span>
              </label>
            </div>
            <div style={{ padding: '16px 24px', background: '#FAFAF8', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => setShowExModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: P.textSec }}>Annuler</button>
              <ActionBtn label="Créer" icon={I.plus()} color={P.greenDark} onClick={handleSaveEx} />
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};


// ============================================================
// ONGLET MAINTENANCE (ADMIN ONLY) - Totalement sécurisé avec modales propres
// ============================================================
const TabMaintenance = () => {
  const { projet, sources, exercices, ops, bordereaux, beneficiaires } = useAppContext();
  const [tool, setTool] = useState(null); 
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [alertData, setAlertData] = useState(null);

  const notify = (type, title, msg) => setAlertData({ type, title, message: msg });
  const ask = (title, msg, onConfirm, showPwd = false) => setAlertData({ type: 'confirm', title, message: msg, onConfirm, showPwd });

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
  
  const checkPwdAndExecute = (actionCallback) => {
    ask("Sécurité requise", "Veuillez saisir le mot de passe administrateur pour autoriser cette action critique :", (pwd) => {
      if (pwd === (projet?.motDePasseAdmin || 'admin123')) {
        actionCallback();
      } else {
        notify("error", "Accès refusé", "Le mot de passe administrateur est incorrect.");
      }
    }, true);
  };

  const getBen = (op) => op?.beneficiaireNom || beneficiaires?.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';

  // 1. PURGE
  const handlePurge = () => {
    if (purgeScope === 'exercice' && !purgeExercice) return notify('error', 'Attention', 'Sélectionnez un exercice à purger.');
    if (purgeConfirm !== 'SUPPRIMER') return notify('error', 'Attention', 'Tapez exactement SUPPRIMER pour confirmer.');

    const exLabel = purgeScope === 'tout' ? 'TOUS LES EXERCICES' : exercices.find(e => e.id === purgeExercice)?.annee;
    
    checkPwdAndExecute(() => {
      ask('Dernière Confirmation', `Êtes-vous absolument sûr de vouloir détruire tous les OP et bordereaux de ${exLabel} ?\n\nCette action est DÉFINITIVE et IRRÉVERSIBLE.`, async () => {
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
        } catch (e) { notify('error', 'Erreur critique', e.message); }
        setSaving(false);
      });
    });
  };

  // 2. TÉLÉCHARGER CANEVAS IMPORT
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

  const handleImport = () => {
    if (!importData || !importExercice) return notify('error', 'Attention', 'Sélectionnez un exercice et un fichier.');
    const exercice = exercices.find(e => e.id === importExercice);
    
    checkPwdAndExecute(() => {
      ask('Confirmation Import', `Voulez-vous vraiment importer ${importPreview.total} OP dans l'exercice ${exercice?.annee} ?\n\n(Les OP existants ne seront pas écrasés)`, async () => {
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
          notify('success', 'Import Terminé', `${imported} OP importés.\n${errors.length} erreurs.`);
          setImportData(null); setImportPreview(null); setImportFile(null); setTool(null);
        } catch (e) { notify('error', 'Erreur critique', e.message); }
        setSaving(false);
      });
    });
  };

  const handleRecalerCompteurs = () => {
    if (!compteurExercice) return notify('error', 'Attention', 'Sélectionnez un exercice.');
    checkPwdAndExecute(async () => {
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
        showMsg(`${fixed} compteurs recalés avec succès.`); setTool(null);
      } catch (e) { notify('error', 'Erreur', e.message); }
      setSaving(false);
    });
  };

  const handleDetecterDoublons = () => {
    if (!doublonExercice) return notify('error', 'Attention', 'Sélectionnez un exercice.');
    const opsEx = ops.filter(o => o.exerciceId === doublonExercice);
    const numCount = {};
    opsEx.forEach(o => { numCount[o.numero] = (numCount[o.numero] || 0) + 1; });
    setDoublons(Object.entries(numCount).filter(([, c]) => c > 1).map(([num, count]) => ({ numero: num, count, ops: opsEx.filter(o => o.numero === num) })));
  };

  const handleFixDoublon = (dup) => {
    checkPwdAndExecute(async () => {
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
      } catch (e) { notify('error', 'Erreur', e.message); }
      setSaving(false);
    });
  };

  const btnTool = (id, iconSvg, label, desc, color) => (
    <div key={id} onClick={() => setTool(id)}
      style={{ flex: 1, minWidth: 220, padding: 20, borderRadius: 12, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconSvg}</div>
      <div style={{ fontWeight: 800, fontSize: 15, color }}>{label}</div>
      <div style={{ fontSize: 12, color: P.textSec, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );

  const cardStyle = { background: 'white', borderRadius: 12, padding: 24, border: `1px solid ${P.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };
  const inputStyle = { ...styles.input, marginBottom: 0, borderRadius: 8, fontSize: 13, padding: '10px 14px' };

  return (
    <div>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />
      
      {message && <div style={{ padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 700, background: message.type === 'success' ? P.greenLight : P.redLight, color: message.type === 'success' ? P.greenDark : P.red, textAlign:'center' }}>{message.text}</div>}

      {tool === null ? (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.text, textTransform: 'uppercase' }}>Boîte à outils (Admin)</h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: P.red, fontWeight: 600 }}>Action irréversibles — Mot de passe administrateur requis.</p>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {btnTool('purge', I.trash(P.red, 22), 'Purge des données', 'Supprimer massivement les OP et bordereaux.', P.red)}
            {btnTool('import', I.project('#3B6B8A', 22), 'Import Excel', 'Importer de nouveaux OP depuis un fichier.', '#3B6B8A')}
            {btnTool('compteurs', I.calendar(P.gold, 22), 'Recalage compteurs', 'Corriger les numéros des bordereaux.', P.gold)}
            {btnTool('doublons', I.source(P.gold, 22), 'Scanner Doublons', 'Trouver et renommer les OP en conflit.', P.gold)}
          </div>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <button onClick={() => setTool(null)} style={{ background: '#fff', border: `1px solid ${P.border}`, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, color: P.textSec, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            {I.arrowLeft(P.textSec, 16)} Retour aux outils
          </button>

          {/* === PURGE === */}
          {tool === 'purge' && (
            <div style={{...cardStyle, borderColor: P.red}}>
              <h3 style={{ color: P.red, margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>Purge des données</h3>
              <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><input type="radio" checked={purgeScope === 'exercice'} onChange={() => setPurgeScope('exercice')} /> Par exercice</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><input type="radio" checked={purgeScope === 'tout'} onChange={() => setPurgeScope('tout')} /><span style={{ color: P.red }}>Tout purger </span></label>
              </div>
              {purgeScope === 'exercice' && <select value={purgeExercice} onChange={e => setPurgeExercice(e.target.value)} style={{ ...inputStyle, width: 250, marginBottom: 0 }}><option value="">-- Exercice à détruire --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select>}
              
              <div style={{ marginTop: 24 }}>
                <Label>Tapez SUPPRIMER pour déverrouiller l'action :</Label>
                <input value={purgeConfirm} onChange={e => setPurgeConfirm(e.target.value)} style={{ ...inputStyle, width: 300, marginTop: 4, fontFamily: 'monospace', fontWeight: 800, fontSize: 15 }} />
              </div>
              
              {purgeScope === 'exercice' && purgeExercice && <div style={{ fontSize: 13, color: P.textSec, marginTop: 16, fontWeight: 600 }}>Impact : {ops.filter(o => o.exerciceId === purgeExercice).length} OP et {bordereaux.filter(b => b.exerciceId === purgeExercice).length} bordereaux seront détruits.</div>}
              {purgeScope === 'tout' && <div style={{ fontSize: 13, color: P.red, fontWeight: 700, marginTop: 16 }}>⚠️ Impact : La totalité de la base de données sera détruite.</div>}
              
              <div style={{ marginTop: 24 }}><ActionBtn label={saving ? "Suppression..." : "Exécuter la purge"} icon={I.trash('#fff', 16)} color={P.red} onClick={handlePurge} disabled={saving || purgeConfirm !== 'SUPPRIMER'} /></div>
            </div>
          )}

          {/* === IMPORT === */}
          {tool === 'import' && (
            <div style={{...cardStyle, borderColor: '#3B6B8A'}}>
              <h3 style={{ color: '#3B6B8A', margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>Import OP depuis Excel</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ background: P.bg, padding: 20, borderRadius: 12 }}>
                  <Label>1. Télécharger le modèle (Canevas)</Label>
                  <ActionBtn label="Télécharger le fichier" icon={I.download('#fff', 16)} color="#3B6B8A" onClick={handleDownloadCanevas} />
                </div>
                <div style={{ background: P.bg, padding: 20, borderRadius: 12 }}>
                  <Label>2. Importer les données remplies</Label>
                  <select value={importExercice} onChange={e => setImportExercice(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}><option value="">-- Exercice de destination --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ fontSize: 13, width: '100%' }} />
                </div>
              </div>
              {importPreview && (
                <div style={{ marginTop: 24, background: P.greenLight, padding: 20, borderRadius: 12 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: P.greenDark }}>Résumé : {importPreview.total} OP trouvés</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{importPreview.parSource.map((s, i) => <Badge key={i} bg="#fff" color={P.greenDark}>{s.sigle} : {s.count} OP</Badge>)}</div>
                </div>
              )}
              {importPreview && importExercice && <div style={{ marginTop: 24, textAlign: 'right' }}><ActionBtn label={saving ? "Importation..." : `Valider l'import (${importPreview.total} OP)`} icon={I.check('#fff', 16)} color="#3B6B8A" onClick={handleImport} disabled={saving} /></div>}
            </div>
          )}

          {/* === COMPTEURS === */}
          {tool === 'compteurs' && (
            <div style={{...cardStyle, borderColor: P.gold}}>
              <h3 style={{ color: P.gold, margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>Recaler les compteurs</h3>
              <p style={{ fontSize: 13, color: P.textSec, marginBottom: 24, lineHeight: 1.5 }}>Si les numéros de bordereaux se décalent (suite à des suppressions ou des bugs de réseau), cet outil scannera tout l'historique de l'exercice et remettra le compteur sur le plus grand numéro trouvé pour chaque source.</p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <div><Label>Sélectionner l'exercice</Label><select value={compteurExercice} onChange={e => setCompteurExercice(e.target.value)} style={{ ...inputStyle, width: 250 }}><option value="">-- Exercice --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select></div>
                <ActionBtn label={saving ? "Recalage..." : "Lancer le recalage"} icon={I.check('#fff', 16)} color={P.gold} onClick={handleRecalerCompteurs} disabled={saving || !compteurExercice} />
              </div>
            </div>
          )}

          {/* === DOUBLONS === */}
          {tool === 'doublons' && (
            <div style={{...cardStyle, borderColor: P.gold}}>
              <h3 style={{ color: P.gold, margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>Scanner les Doublons</h3>
              <p style={{ fontSize: 13, color: P.textSec, marginBottom: 24, lineHeight: 1.5 }}>Cet outil trouve tous les Ordres de Paiement qui possèdent le même numéro dans un même exercice. Il vous permet de générer un nouveau numéro unique pour les copies détectées.</p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 24 }}>
                <div><Label>Exercice à scanner</Label><select value={doublonExercice} onChange={e => setDoublonExercice(e.target.value)} style={{ ...inputStyle, width: 250 }}><option value="">-- Exercice --</option>{exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}</select></div>
                <ActionBtn label="Lancer le scan" icon={I.search('#fff', 16)} color={P.gold} onClick={handleDetecterDoublons} disabled={!doublonExercice} />
              </div>
              
              {doublons !== null && (
                doublons.length === 0 ? <div style={{ padding: 20, background: P.greenLight, color: P.greenDark, borderRadius: 10, fontWeight: 700, fontSize: 14, textAlign: 'center' }}>✓ Aucun numéro en doublon détecté pour cet exercice.</div> : (
                  <div>
                    <div style={{ padding: '12px 16px', background: P.redLight, color: P.red, borderRadius: 10, fontWeight: 800, fontSize: 13, marginBottom: 16 }}>⚠️ {doublons.length} numéro(s) en conflit identifié(s)</div>
                    {doublons.map((dup, i) => (
                      <div key={i} style={{ padding: 20, background: P.bg, border: `1px solid ${P.border}`, borderRadius: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16 }}>{dup.numero}</span>
                            <Badge bg={P.goldLight} color={P.gold}>{dup.count} exemplaires</Badge>
                          </div>
                          <div style={{ fontSize: 12, color: P.textSec, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {dup.ops.map((o, idx) => <span key={o.id}><strong>Copie {idx+1}:</strong> {o.type} ({formatMontant(o.montant)}F) - {getBen(o)}</span>)}
                          </div>
                        </div>
                        <ActionBtn label="Attribuer de nouveaux numéros" icon={I.edit('#fff', 16)} color={P.gold} onClick={() => handleFixDoublon(dup)} disabled={saving} />
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
