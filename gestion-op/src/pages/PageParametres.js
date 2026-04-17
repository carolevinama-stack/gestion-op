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
  download: (c = '#fff', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  search: (c = P.textMuted, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  calendar: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  source: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
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
  if (isAdmin) { tabs.push({ id: 'utilisateurs', label: 'Utilisateurs', icon: 'users' }); tabs.push({ id: 'maintenance', label: 'Maintenance', icon: 'maintenance' }); }

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
      </div>

      {showSrcModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: '#fff', borderRadius: 16, width: 450, padding: 24 }}><h3 style={{ marginBottom: 16 }}>{editSource ? 'Modifier' : 'Nouvelle'} Source</h3><Label>Sigle</Label><input value={formSrc.sigle} onChange={e => setFormSrc({...formSrc, sigle: e.target.value})} style={iS} /><Label>Nom complet</Label><input value={formSrc.nom} onChange={e => setFormSrc({...formSrc, nom: e.target.value})} style={iS} /><div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}><button onClick={() => setShowSrcModal(false)}>Annuler</button><button onClick={handleSaveSrc}>Valider</button></div></div></div>)}
    </div>
  );
};

// ============================================================
// ONGLET MAINTENANCE
// ============================================================
const TabMaintenance = () => {
  const { projet, sources, exercices, ops, bordereaux } = useAppContext();
  const [tool, setTool] = useState(null); 
  const [saving, setSaving] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const notify = (t, ti, m) => setAlertData({ type: t, title: ti, message: m });
  const ask = (ti, m, onC, sp = false) => setAlertData({ type: 'confirm', title: ti, message: m, onConfirm: onC, showPwd: sp });

  const checkPwd = (cb) => {
    ask("Sécurité", "Mot de passe admin :", (pwd) => {
      if (pwd === (projet?.motDePasseAdmin || 'admin123')) cb();
      else notify("error", "Erreur", "Mot de passe incorrect.");
    }, true);
  };

  const handlePurge = () => { checkPwd(async () => { notify("success", "Prêt", "Fonction de purge déverrouillée."); }); };

  return (
    <div>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />
      {tool === null ? (
        <div style={{ display: 'flex', gap: 24 }}><div onClick={() => setTool('purge')} style={{ padding: 24, border: `1px solid ${P.border}`, borderRadius: 12, cursor: 'pointer' }}>{I.trash(P.red, 24)}<h3>Purge</h3></div></div>
      ) : (
        <div><button onClick={() => setTool(null)}>Retour</button>{tool === 'purge' && <div>Outil de purge sélectionné</div>}</div>
      )}
    </div>
  );
};

export default PageParametres;
