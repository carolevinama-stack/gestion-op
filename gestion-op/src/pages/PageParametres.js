import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
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
  close: (c = P.textMuted, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  arrowLeft: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  alertCircle: (c = P.gold, s = 40) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

// ============================================================
// COMPOSANTS COMMUNS (Définis hors des composants principaux)
// ============================================================
const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.textSec, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</label>
);

const SettingRow = ({ title, desc, children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, padding: '32px 0', borderBottom: `1px solid ${P.border}` }}>
    <div style={{ width: 300, flexShrink: 0 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: P.text }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: P.textSec, lineHeight: 1.5 }}>{desc}</p>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ background: P.card, borderRadius: 12, padding: 24, border: `1px solid ${P.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.03)', maxWidth: 800 }}>{children}</div>
    </div>
  </div>
);

const ActionBtn = ({ label, icon, color, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '10px 24px', background: color, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.6 : 1, transition: 'all .2s' }}>
    {icon}{label}
  </button>
);

const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: .3 }}>{children}</span>
));

const Empty = React.memo(({ text }) => (
  <div style={{ textAlign: 'center', padding: '24px 0', color: P.textMuted }}>
    <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>{text}</p>
  </div>
));

const ModalAlert = ({ data, onClose }) => {
  const [val, setVal] = useState('');
  useEffect(() => { setVal(''); }, [data]); 
  if (!data) return null;
  const isConfirm = data.type === 'confirm';
  const color = data.type === 'error' ? P.red : isConfirm ? P.gold : P.greenDark;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 400, boxShadow: '0 20px 50px rgba(0,0,0,.2)', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{data.type === 'error' ? I.alertCircle(P.red, 48) : I.alertCircle(color, 48)}</div>
        <h3 style={{ color: P.text, margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>{data.title}</h3>
        <p style={{ color: P.textSec, fontSize: 14, marginBottom: 24, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{data.message}</p>
        {(data.showInput || data.showPwd) && (
          <div style={{ marginBottom: 24, textAlign: 'left' }}>
            {data.inputLabel && <Label>{data.inputLabel}</Label>}
            <input type={data.showPwd ? "password" : "text"} autoFocus value={val} onChange={e => setVal(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: `2px solid ${P.border}`, boxSizing: 'border-box', fontSize: 14, outline: 'none' }} placeholder={data.showPwd ? "Mot de passe administrateur" : "Saisissez ici..."} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {isConfirm && <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${P.border}`, background: '#f9f9f9', cursor: 'pointer', fontWeight: 700, color: P.textSec }}>Annuler</button>}
          <button onClick={() => { if (isConfirm && (data.showInput || data.showPwd) && !val) return; const confirmFn = data.onConfirm; const fv = val; onClose(); if (isConfirm && confirmFn) setTimeout(() => confirmFn(fv), 150); }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: color, color: 'white', cursor: 'pointer', fontWeight: 700 }}>{isConfirm ? 'Confirmer' : 'Compris'}</button>
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
  const tabs = [{ id: 'infos', label: 'Infos & Structure', icon: 'info' }];
  if (isAdmin) { 
    tabs.push({ id: 'utilisateurs', label: 'Utilisateurs', icon: 'users' }); 
    tabs.push({ id: 'maintenance', label: 'Maintenance', icon: 'maintenance' }); 
  }

  return (
    <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 800, color: P.greenDark, margin: 0 }}>Paramètres</h1></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `2px solid ${P.border}`, paddingBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (<div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 18px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, background: isActive ? P.greenDark : 'transparent', color: isActive ? '#fff' : P.textSec }}>{I[tab.icon](isActive ? '#fff' : P.textSec, 16)}{tab.label}</div>);
        })}
      </div>
      {activeTab === 'infos' && <TabInfos />}
      {activeTab === 'maintenance' && isAdmin && <TabMaintenance />}
      {activeTab === 'utilisateurs' && isAdmin && <PageAdmin />}
    </div>
  );
};

// ============================================================
// ONGLET INFOS
// ============================================================
const TabInfos = () => {
  const { projet, setProjet, sources, setSources, exercices, setExercices, ops, budgets } = useAppContext();
  const [alertData, setAlertData] = useState(null);
  const notify = (type, title, msg) => setAlertData({ type, title, message: msg });
  const ask = (title, msg, onConfirm, showPwd = false) => setAlertData({ type: 'confirm', title, message: msg, onConfirm, showPwd });

  const [formProj, setFormProj] = useState({ pays: "", devise: "", ministere: "", nomProjet: "", sigle: "", codeImputation: "", nbCaracteresLigne: 4, coordonnateur: "", titreCoordonnateur: "", nbExemplairesCF: 4, nbExemplairesAC: 2, adminPassword: "" });
  const [savingProj, setSavingProj] = useState(false);
  const [savedProj, setSavedProj] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSrcModal, setShowSrcModal] = useState(false);
  const [editSource, setEditSource] = useState(null);
  const [formSrc, setFormSrc] = useState({ nom: '', sigle: '', couleur: '#1B6B2E' }); 
  const [showExModal, setShowExModal] = useState(false);
  const [formEx, setFormEx] = useState({ annee: new Date().getFullYear(), actif: true });

  useEffect(() => {
    if (projet) {
      setFormProj({ pays: "République de Côte d'Ivoire", devise: "Union – Discipline – Travail", nbExemplairesCF: 4, nbExemplairesAC: 2, nbCaracteresLigne: 4, ...projet });
      setConfirmPassword(projet.adminPassword || '');
    }
  }, [projet]);

  const handleSaveProjet = async () => {
    if (formProj.adminPassword && formProj.adminPassword !== confirmPassword) { notify('error', 'Erreur de saisie', 'Les mots de passe ne correspondent pas.'); return; }
    setSavingProj(true);
    try { await setDoc(doc(db, 'parametres', 'projet'), formProj); setProjet(formProj); setSavedProj(true); setTimeout(() => setSavedProj(false), 3000); } 
    catch (e) { notify('error', 'Erreur', 'Impossible de sauvegarder.'); }
    setSavingProj(false);
  };

  const openNewSrc = () => { setFormSrc({ nom: '', sigle: '', couleur: '#1B6B2E' }); setEditSource(null); setShowSrcModal(true); };
  const openEditSrc = (s) => { setFormSrc(s); setEditSource(s); setShowSrcModal(true); };
  const handleSaveSrc = async () => {
    if (!formSrc.nom || !formSrc.sigle) return notify('error', 'Champs requis', 'Sigle et Détails obligatoires.');
    try {
      if (editSource) { await updateDoc(doc(db, 'sources', editSource.id), formSrc); setSources(sources.map(s => s.id === editSource.id ? { ...s, ...formSrc } : s)); } 
      else { const dr = await addDoc(collection(db, 'sources'), formSrc); setSources([...sources, { id: dr.id, ...formSrc }]); }
      setShowSrcModal(false);
    } catch (e) { notify('error', 'Erreur', 'Impossible de sauvegarder la source.'); }
  };

  const handleSaveEx = async () => {
    if (!formEx.annee) return notify('error', 'Saisie', "Année requise.");
    try {
      if (formEx.actif) { for (const ex of exercices.filter(e => e.actif)) await updateDoc(doc(db, 'exercices', ex.id), { actif: false }); }
      const dr = await addDoc(collection(db, 'exercices'), formEx);
      const nx = exercices.map(e => formEx.actif ? { ...e, actif: false } : e);
      setExercices([{ id: dr.id, ...formEx }, ...nx].sort((a, b) => b.annee - a.annee));
      setShowExModal(false);
    } catch (e) { notify('error', 'Erreur', 'Impossible de sauvegarder.'); }
  };

  const setActifEx = async (ex) => {
    ask('Changement d\'exercice', `Basculer l'application sur l'exercice budgétaire ${ex.annee} ?`, async () => {
      try { for (const e of exercices) await updateDoc(doc(db, 'exercices', e.id), { actif: e.id === ex.id }); setExercices(exercices.map(e => ({ ...e, actif: e.id === ex.id }))); } 
      catch (error) { notify('error', 'Erreur', 'Impossible d\'activer l\'exercice.'); }
    });
  };

  const handleDeleteEx = async (ex) => {
    const isUsed = (ops && ops.some(o => o.exerciceId === ex.id)) || (budgets && budgets.some(b => b.exerciceId === ex.id));
    if (isUsed) return notify('error', 'Sécurité activée', `Impossible de supprimer l'exercice ${ex.annee}.\nDes données y sont rattachées.`);
    ask('Suppression Exercice', `Êtes-vous sûr de vouloir supprimer définitivement l'exercice ${ex.annee} ?`, async () => {
      try { await deleteDoc(doc(db, 'exercices', ex.id)); setExercices(exercices.filter(e => e.id !== ex.id)); } catch (error) { notify('error', 'Erreur', 'Impossible de supprimer l\'exercice.'); }
    });
  };

  const handleDeleteSrc = async (source) => {
    const isUsed = (ops && ops.some(o => o.sourceId === source.id)) || (budgets && budgets.some(b => b.sourceId === source.id));
    if (isUsed) return notify('error', 'Sécurité activée', `Impossible de supprimer la source "${source.sigle}".\nDes données y sont rattachées.`);
    ask('Suppression Source', `Êtes-vous sûr de vouloir supprimer définitivement la source "${source.sigle}" ?`, async () => {
      try { await deleteDoc(doc(db, 'sources', source.id)); setSources(sources.filter(s => s.id !== source.id)); } catch (error) { notify('error', 'Erreur', 'Impossible de supprimer la source.'); }
    });
  };

  const iS = { ...styles.input, marginBottom: 0, borderRadius: 8, fontSize: 13, padding: '10px 14px', width: '100%', background: '#FAFAF8' };

  return (
    <div>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <SettingRow title="Identité du Projet" desc="Entêtes des bordereaux.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
            <div style={{ gridColumn: 'span 12' }}><Label>Nom complet du projet</Label><input value={formProj.nomProjet || ''} onChange={e => setFormProj({...formProj, nomProjet: e.target.value})} style={iS} /></div>
            <div style={{ gridColumn: 'span 12' }}><Label>Ministère de tutelle</Label><input value={formProj.ministere || ''} onChange={e => setFormProj({...formProj, ministere: e.target.value})} style={iS} /></div>
            <div style={{ gridColumn: 'span 4' }}><Label>Sigle officiel</Label><input value={formProj.sigle || ''} onChange={e => setFormProj({...formProj, sigle: e.target.value})} style={iS} /></div>
            <div style={{ gridColumn: 'span 4' }}><Label>Pays</Label><input value={formProj.pays || ''} onChange={e => setFormProj({...formProj, pays: e.target.value})} style={iS} /></div>
            <div style={{ gridColumn: 'span 4' }}><Label>Devise Nationale</Label><input value={formProj.devise || ''} onChange={e => setFormProj({...formProj, devise: e.target.value})} style={iS} /></div>
          </div>
        </SettingRow>
        <SettingRow title="Signataire & Technique" desc="Signataire et tirages.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
            <div style={{ gridColumn: 'span 6' }}><Label>Nom du Signataire</Label><input value={formProj.coordonnateur || ''} onChange={e => setFormProj({...formProj, coordonnateur: e.target.value})} style={iS} /></div>
            <div style={{ gridColumn: 'span 6' }}><Label>Titre (Bas de page)</Label><input value={formProj.titreCoordonnateur || ''} onChange={e => setFormProj({...formProj, titreCoordonnateur: e.target.value})} style={iS} /></div>
            <div style={{ gridColumn: 'span 6' }}><Label>Préfixe Budgétaire</Label><input value={formProj.codeImputation || ''} onChange={e => setFormProj({...formProj, codeImputation: e.target.value})} style={iS} /></div>
            <div style={{ gridColumn: 'span 6' }}><Label>Format Ligne</Label><select value={formProj.nbCaracteresLigne || 4} onChange={e => setFormProj({...formProj, nbCaracteresLigne: parseInt(e.target.value)})} style={iS}><option value={4}>4 chiffres</option><option value={6}>6 chiffres</option></select></div>
            <div style={{ gridColumn: 'span 3' }}><Label>Tirages CF</Label><input type="number" value={formProj.nbExemplairesCF ?? 4} onChange={e => setFormProj({...formProj, nbExemplairesCF: parseInt(e.target.value) || 4})} style={{...iS, textAlign: 'center'}} /></div>
            <div style={{ gridColumn: 'span 3' }}><Label>Tirages AC</Label><input type="number" value={formProj.nbExemplairesAC ?? 2} onChange={e => setFormProj({...formProj, nbExemplairesAC: parseInt(e.target.value) || 2})} style={{...iS, textAlign: 'center'}} /></div>
          </div>
        </SettingRow>
        <SettingRow title="Sécurité" desc="Mot de passe admin.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
            <div style={{ gridColumn: 'span 6' }}><Label>Mot de passe</Label><div style={{ position: 'relative' }}><input type={showPassword ? 'text' : 'password'} value={formProj.adminPassword || ''} onChange={e => setFormProj({...formProj, adminPassword: e.target.value})} style={{ ...iS, paddingRight: 40 }} /><button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>{showPassword ? I.eyeOff(P.textSec, 18) : I.eye(P.textSec, 18)}</button></div></div>
            <div style={{ gridColumn: 'span 6' }}><Label>Confirmation</Label><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={iS} /></div>
          </div>
        </SettingRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 0' }}><button onClick={handleSaveProjet} disabled={savingProj} style={{ padding: '12px 28px', background: P.greenDark, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800 }}>{savingProj ? "Enregistrement..." : "Enregistrer"}</button></div>

        <SettingRow title="Sources de financement" desc="Gérez les bailleurs.">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><ActionBtn label="Nouvelle source" icon={I.plus()} color={P.greenDark} onClick={openNewSrc} /></div>
          {sources.length === 0 ? <Empty text="Aucune source" /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={{ ...styles.th, padding: '12px 16px', background: P.bg, color: P.textSec }}>Sigle</th><th style={{ ...styles.th, padding: '12px 16px', background: P.bg, color: P.textSec }}>Nom</th><th style={{ ...styles.th, padding: '12px 16px', background: P.bg, color: P.textSec, textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>{sources.map(s => (<tr key={s.id} style={{ borderBottom: `1px solid ${P.border}` }}><td style={{ padding: '16px', fontWeight: 800 }}><div style={{display:'flex', alignItems:'center', gap:10}}><div style={{width:12, height:12, borderRadius:'50%', background: s.couleur}}/>{s.sigle}</div></td><td style={{ padding: '16px' }}>{s.nom}</td><td style={{ padding: '16px', textAlign: 'right' }}><button onClick={() => openEditSrc(s)} style={{ marginRight: 8, background:'none', border:'none', cursor:'pointer' }}>{I.edit(P.textSec, 14)}</button><button onClick={() => handleDeleteSrc(s)} style={{ background:'none', border:'none', cursor:'pointer' }}>{I.trash(P.red, 14)}</button></td></tr>))}</tbody>
            </table>
          )}
        </SettingRow>

        <SettingRow title="Exercices budgétaires" desc="Activer clôture le précédent.">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><ActionBtn label="Nouvel exercice" icon={I.plus()} color={P.greenDark} onClick={() => { setFormEx({ annee: new Date().getFullYear() + 1, actif: false }); setShowExModal(true); }} /></div>
          {exercices.length === 0 ? <Empty text="Aucun exercice" /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={{ ...styles.th, padding: '12px 16px', background: P.bg, color: P.textSec }}>Année</th><th style={{ ...styles.th, padding: '12px 16px', background: P.bg, color: P.textSec }}>Statut</th><th style={{ ...styles.th, padding: '12px 16px', background: P.bg, color: P.textSec, textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>{exercices.map(ex => (<tr key={ex.id} style={{ borderBottom: `1px solid ${P.border}`, background: ex.actif ? P.greenLight : 'transparent' }}><td style={{ padding: '16px', fontWeight: 800, fontSize: 16, color: ex.actif ? P.greenDark : P.text }}>{ex.annee}</td><td style={{ padding: '16px' }}>{ex.actif ? <Badge bg={P.greenDark} color="#fff">Actif</Badge> : <span style={{color:P.textMuted}}>Clôturé</span>}</td><td style={{ padding: '16px', textAlign: 'right' }}>{!ex.actif && <button onClick={() => setActifEx(ex)} style={{ marginRight: 8, padding: '6px 12px', borderRadius:6, border:`1px solid ${P.border}`, cursor:'pointer' }}>Activer</button>}{!ex.actif && <button onClick={() => handleDeleteEx(ex)} style={{ background:'none', border:'none', cursor:'pointer' }}>{I.trash(P.red, 14)}</button>}</td></tr>))}</tbody>
            </table>
          )}
        </SettingRow>
      </div>

      {showSrcModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: '#fff', borderRadius: 16, width: 450, padding: 24 }}><h3>{editSource ? 'Modifier' : 'Nouvelle'} Source</h3><Label>Sigle</Label><input value={formSrc.sigle} onChange={e => setFormSrc({...formSrc, sigle: e.target.value})} style={iS} /><Label>Nom complet</Label><input value={formSrc.nom} onChange={e => setFormSrc({...formSrc, nom: e.target.value})} style={iS} /><div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}><button onClick={() => setShowSrcModal(false)}>Annuler</button><button onClick={handleSaveSrc}>Valider</button></div></div></div>)}
      {showExModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: '#fff', borderRadius: 16, width: 350, padding: 24 }}><h3>Nouvel exercice</h3><Label>Année</Label><input type="number" value={formEx.annee} onChange={e => setFormEx({...formEx, annee: parseInt(e.target.value)})} style={iS} /><label><input type="checkbox" checked={formEx.actif} onChange={e => setFormEx({...formEx, actif: e.target.checked})} /> Actif</label><div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}><button onClick={() => setShowExModal(false)}>Annuler</button><button onClick={handleSaveEx}>Créer</button></div></div></div>)}
    </div>
  );
};

// ============================================================
// ONGLET MAINTENANCE (VERSION UNIQUE ET SÉCURISÉE)
// ============================================================
const TabMaintenance = () => {
  const { projet, sources, exercices, ops, bordereaux, beneficiaires, budgets } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [alertData, setAlertData] = useState(null);
  
  const notify = (type, title, message) => setAlertData({ type, title, message });
  const ask = (title, message, onConfirm, showPwd = false) => setAlertData({ type: 'confirm', title, message, onConfirm, showPwd });

  const checkPwd = (cb) => {
    ask("Sécurité requise", "Saisissez le mot de passe administrateur :", (pwd) => {
      if (pwd === (projet?.adminPassword || 'admin123')) cb();
      else notify("error", "Erreur", "Mot de passe incorrect.");
    }, true);
  };

  const handleExportData = () => {
    try {
      const dataToSave = {
        dateExport: new Date().toISOString(),
        projet, sources, exercices, beneficiaires, budgets, ops, bordereaux
      };
      const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SAUVEGARDE_BASE_PIF2_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("success", "Sauvegarde", "Fichier généré avec succès.");
    } catch (e) {
      notify("error", "Erreur", "Échec de l'exportation.");
    }
  };

  const handleRecalerCompteurs = () => {
    checkPwd(async () => {
      setSaving(true);
      try {
        const batch = writeBatch(db);
        let countFixed = 0;
        for (const ex of exercices) {
          for (const src of sources) {
            const opsExistants = ops.filter(o => o.sourceId === src.id && o.exerciceId === ex.id && o.statut !== 'SUPPRIME');
            let maxNum = 0;
            opsExistants.forEach(o => {
              const match = (o.numero || '').match(/N°(\d+)\//);
              if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
            });
            const counterRef = doc(db, 'compteurs', `op_${src.id}_${ex.id}`);
            batch.set(counterRef, { count: maxNum, updatedAt: new Date().toISOString() }, { merge: true });
            countFixed++;
          }
        }
        await batch.commit();
        notify("success", "Réussite", "Les compteurs ont été recalés.");
      } catch (e) {
        notify("error", "Erreur", "Problème de synchronisation.");
      }
      setSaving(false);
    });
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: P.text }}>Maintenance & Sécurité</h2>
        <p style={{ fontSize: 14, color: P.textSec }}>Gérez vos sauvegardes et les numéros de série.</p>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div onClick={handleExportData} style={{ flex: 1, minWidth: 280, padding: 30, border: `1px solid ${P.border}`, borderRadius: 16, cursor: 'pointer', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: P.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={P.greenDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: P.greenDark }}>Sauvegarder la base</h3>
          <p style={{ margin: 0, fontSize: 13, color: P.textSec, lineHeight: 1.5 }}>Télécharger une copie de sécurité (Format JSON).</p>
        </div>
        <div onClick={handleRecalerCompteurs} style={{ flex: 1, minWidth: 280, padding: 30, border: `1px solid ${P.border}`, borderRadius: 16, cursor: 'pointer', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: P.goldLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={P.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: P.gold }}>Recaler les numéros</h3>
          <p style={{ margin: 0, fontSize: 13, color: P.textSec, lineHeight: 1.5 }}>Remettre à jour les compteurs selon les OP existants.</p>
        </div>
      </div>
      {saving && <div style={{ marginTop: 24, textAlign: 'center', color: P.gold, fontWeight: 700 }}>Synchronisation en cours...</div>}
    </div>
  );
};

export default PageParametres;
