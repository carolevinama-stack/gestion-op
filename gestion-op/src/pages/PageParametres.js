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
  project: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
  source: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  calendar: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  users: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  maintenance: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
  check: (c = '#fff', s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  plus: (c = '#fff', s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  trash: (c = P.red, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  edit: (c = P.textSec, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  eye: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeOff: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  close: (c = P.textMuted, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  fileText: (c = P.textMuted, s = 40) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
};

// ============================================================
// COMPOSANTS COMMUNS
// ============================================================
const SectionTitle = ({ title }) => (
  <h3 style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${P.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
    {title}
  </h3>
);

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.textSec, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
    {children}
  </label>
);

const ActionBtn = ({ label, icon, color, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '10px 20px', background: color, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1, transition: 'all .2s' }}>
    {icon}{label}
  </button>
);

// AJOUT DES COMPOSANTS MANQUANTS POUR VERCEL
const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: .3 }}>{children}</span>
));

const Empty = React.memo(({ text }) => (
  <div style={{ textAlign: 'center', padding: 40, color: P.textMuted }}>
    <div style={{ marginBottom: 12, opacity: .5 }}>{I.fileText(P.textMuted, 40)}</div>
    <p style={{ fontSize: 14, margin: 0 }}>{text}</p>
  </div>
));


// ============================================================
// PAGE PARAMÈTRES
// ============================================================
const PageParametres = () => {
  const { userProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState('projet');
  const isAdmin = ['ADMIN'].includes(userProfile?.role);

  const tabs = [
    { id: 'projet', label: 'Projet', icon: 'project' },
    { id: 'sources', label: 'Sources', icon: 'source' },
    { id: 'exercices', label: 'Exercices', icon: 'calendar' },
  ];
  if (isAdmin) tabs.push({ id: 'utilisateurs', label: 'Utilisateurs', icon: 'users' });
  if (isAdmin) tabs.push({ id: 'maintenance', label: 'Maintenance', icon: 'maintenance' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: P.greenDark, margin: 0 }}>Paramètres</h1>
      </div>
      
      {/* Onglets */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: `2px solid ${P.border}`, paddingBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: isActive ? P.greenDark : 'transparent',
                color: isActive ? '#fff' : P.textSec,
              }}
            >
              {I[tab.icon](isActive ? '#fff' : P.textSec, 16)}
              {tab.label}
            </div>
          );
        })}
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

// ============================================================
// ONGLET PROJET
// ============================================================
const TabProjet = () => {
  const { projet, setProjet } = useAppContext();
  const [form, setForm] = useState(projet || {
    pays: 'République de Côte d\'Ivoire', devise: 'Union – Discipline – Travail', ministere: '', nomProjet: '',
    sigle: '', codeImputation: '', nbCaracteresLigne: 4, coordonnateur: '', titreCoordonnateur: '',
    nbExemplairesCF: 4, nbExemplairesAC: 2, adminPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (projet) {
      setForm({
        pays: 'République de Côte d\'Ivoire', devise: 'Union – Discipline – Travail', nbExemplairesCF: 4, nbExemplairesAC: 2, nbCaracteresLigne: 4,
        ...projet
      });
      setConfirmPassword(projet.adminPassword || '');
    }
  }, [projet]);

  const handleSave = async () => {
    if (form.adminPassword && form.adminPassword !== confirmPassword) { alert('Les mots de passe ne correspondent pas'); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, 'parametres', 'projet'), form);
      setProjet(form);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (error) { console.error('Erreur sauvegarde:', error); alert('Erreur lors de la sauvegarde'); }
    setSaving(false);
  };

  const cardStyle = { ...styles.card, background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, marginBottom: 20 };
  const inputStyle = { ...styles.input, marginBottom: 0, borderRadius: 8 };

  return (
    <div>
      <div style={cardStyle}>
        <SectionTitle title="Informations générales" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div><Label>Pays</Label><input value={form.pays || ''} onChange={e => setForm({...form, pays: e.target.value})} style={inputStyle} /></div>
          <div><Label>Devise nationale</Label><input value={form.devise || ''} onChange={e => setForm({...form, devise: e.target.value})} style={inputStyle} /></div>
          <div style={{ gridColumn: '1 / -1' }}><Label>Ministère de tutelle</Label><input value={form.ministere || ''} onChange={e => setForm({...form, ministere: e.target.value})} style={inputStyle} placeholder="Ex: Ministère des Eaux et Forêts" /></div>
          <div style={{ gridColumn: '1 / -1' }}><Label>Nom complet du projet</Label><input value={form.nomProjet || ''} onChange={e => setForm({...form, nomProjet: e.target.value})} style={inputStyle} placeholder="Ex: Projet d'Investissement Forestier 2" /></div>
          <div><Label>Sigle du projet</Label><input value={form.sigle || ''} onChange={e => setForm({...form, sigle: e.target.value})} style={inputStyle} placeholder="Ex: PIF2" /></div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionTitle title="Configuration technique" />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div><Label>Code imputation budgétaire (préfixe)</Label><input value={form.codeImputation || ''} onChange={e => setForm({...form, codeImputation: e.target.value})} style={inputStyle} placeholder="Ex: 345 90042200006 90 11409374" /></div>
          <div><Label>Nb caractères ligne budgétaire</Label>
            <select value={form.nbCaracteresLigne || 4} onChange={e => setForm({...form, nbCaracteresLigne: parseInt(e.target.value)})} style={inputStyle}>
              <option value={4}>4 caractères</option>
              <option value={6}>6 caractères</option>
            </select>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionTitle title="Responsable / Signataire" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div><Label>Nom du Coordonnateur/trice</Label><input value={form.coordonnateur || ''} onChange={e => setForm({...form, coordonnateur: e.target.value})} style={inputStyle} placeholder="Ex: ABE-KOFFI Thérèse" /></div>
          <div><Label>Titre officiel</Label><input value={form.titreCoordonnateur || ''} onChange={e => setForm({...form, titreCoordonnateur: e.target.value})} style={inputStyle} placeholder="Ex: LA COORDONNATRICE DU PIF 2" /></div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionTitle title="Configuration impressions" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div><Label>Nombre d'exemplaires pour le CF</Label><input type="number" min="1" value={form.nbExemplairesCF ?? 4} onChange={e => setForm({...form, nbExemplairesCF: parseInt(e.target.value) || 4})} style={inputStyle} /></div>
          <div><Label>Nombre d'exemplaires pour l'AC</Label><input type="number" min="1" value={form.nbExemplairesAC ?? 2} onChange={e => setForm({...form, nbExemplairesAC: parseInt(e.target.value) || 2})} style={inputStyle} /></div>
        </div>
      </div>

      <div style={{ ...cardStyle, background: P.goldLight, border: `1px solid ${P.goldBorder}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: P.gold, marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${P.goldBorder}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sécurité administrative</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
          <div>
            <Label>Mot de passe administrateur</Label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={form.adminPassword || ''} onChange={e => setForm({...form, adminPassword: e.target.value})} style={{ ...inputStyle, paddingRight: 40 }} placeholder="Définir un mot de passe sécurisé" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPassword ? I.eyeOff() : I.eye()}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirmer le mot de passe</Label>
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Confirmer le mot de passe" />
            <div style={{ marginTop: 6, minHeight: 16 }}>
              {form.adminPassword && confirmPassword && form.adminPassword !== confirmPassword && <span style={{ color: P.red, fontSize: 11, fontWeight: 600 }}>Les mots de passe ne correspondent pas</span>}
              {form.adminPassword && confirmPassword && form.adminPassword === confirmPassword && <span style={{ color: P.green, fontSize: 11, fontWeight: 600 }}>Mots de passe identiques</span>}
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8, fontSize: 12, color: P.textSec, border: `1px dashed ${P.goldBorder}` }}>
          <strong style={{ color: P.gold }}>Ce mot de passe protège les actions sensibles :</strong> Modification/Suppression d'OP, révision budgétaire, purge de la base de données.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 30 }}>
        {saved && <span style={{ color: P.green, fontWeight: 700, fontSize: 13 }}>Sauvegarde réussie !</span>}
        <ActionBtn label="Enregistrer les paramètres" icon={I.check()} color={P.greenDark} onClick={handleSave} disabled={saving} />
      </div>
    </div>
  );
};

// ============================================================
// ONGLET SOURCES
// ============================================================
const TabSources = () => {
  const { sources, setSources } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [editSource, setEditSource] = useState(null);
  const [form, setForm] = useState({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#1B6B2E' });

  const openNew = () => { setForm({ nom: '', sigle: '', description: '', compteDebiter: 'BAILLEUR', couleur: '#1B6B2E' }); setEditSource(null); setShowModal(true); };
  const openEdit = (source) => { setForm(source); setEditSource(source); setShowModal(true); };

  const handleSave = async () => {
    if (!form.nom || !form.sigle) { alert('Le nom et le sigle sont obligatoires'); return; }
    try {
      if (editSource) {
        await updateDoc(doc(db, 'sources', editSource.id), form);
        setSources(sources.map(s => s.id === editSource.id ? { ...s, ...form } : s));
      } else {
        const docRef = await addDoc(collection(db, 'sources'), form);
        setSources([...sources, { id: docRef.id, ...form }]);
      }
      setShowModal(false);
    } catch (error) { console.error('Erreur:', error); alert('Erreur lors de la sauvegarde'); }
  };

  const handleDelete = async (source) => {
    if (!window.confirm(`Supprimer la source "${source.nom}" ?`)) return;
    try { await deleteDoc(doc(db, 'sources', source.id)); setSources(sources.filter(s => s.id !== source.id)); } 
    catch (error) { console.error('Erreur:', error); alert('Erreur lors de la suppression'); }
  };

  const thStyle = { ...styles.th, fontSize: 11, color: P.textSec, textTransform: 'uppercase', padding: '12px 16px', background: '#FAFAF8' };
  const inputStyle = { ...styles.input, marginBottom: 0, borderRadius: 8 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: P.textSec, margin: 0, fontSize: 13, fontWeight: 600 }}>{sources.length} source(s) configurée(s)</p>
        <ActionBtn label="Nouvelle source" icon={I.plus()} color={P.greenDark} onClick={openNew} />
      </div>

      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
        {sources.length === 0 ? (
          <Empty text="Aucune source de financement configurée." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Nom de la source</th>
                <th style={thStyle}>Sigle</th>
                <th style={thStyle}>Compte à débiter</th>
                <th style={thStyle}>Couleur</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{source.nom}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace' }}>{source.sigle}</td>
                  <td style={{ padding: '12px 16px' }}><Badge bg={source.compteDebiter === 'BAILLEUR' ? P.greenLight : P.goldLight} color={source.compteDebiter === 'BAILLEUR' ? P.greenDark : P.gold}>{source.compteDebiter}</Badge></td>
                  <td style={{ padding: '12px 16px' }}><div style={{ width: 24, height: 24, borderRadius: 6, background: source.couleur, border: `1px solid ${P.border}` }}></div></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(source)} style={{ background: P.greenLight, border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }} title="Modifier">{I.edit(P.greenDark)}</button>
                      <button onClick={() => handleDelete(source)} style={{ background: P.redLight, border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }} title="Supprimer">{I.trash()}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(3px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 500, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: P.greenDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 16 }}>{editSource ? 'Modifier la source' : 'Nouvelle source'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{I.close('#fff')}</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <Label>Nom complet *</Label>
                <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} style={inputStyle} placeholder="Ex: Association Internationale de Développement" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div><Label>Sigle *</Label><input value={form.sigle} onChange={e => setForm({...form, sigle: e.target.value})} style={inputStyle} placeholder="Ex: IDA" /></div>
                <div><Label>Compte à débiter</Label>
                  <select value={form.compteDebiter} onChange={e => setForm({...form, compteDebiter: e.target.value})} style={inputStyle}>
                    <option value="BAILLEUR">BAILLEUR</option>
                    <option value="TRESOR">TRÉSOR</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Label>Description (pour les documents)</Label>
                <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Ex: Financement Groupe Banque Mondiale..." />
              </div>
              <div>
                <Label>Couleur d'identification</Label>
                <input type="color" value={form.couleur} onChange={e => setForm({...form, couleur: e.target.value})} style={{ width: 100, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', background: '#FAFAF8', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <ActionBtn label="Enregistrer" icon={I.check()} color={P.greenDark} onClick={handleSave} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// ONGLET EXERCICES
// ============================================================
const TabExercices = () => {
  const { exercices, setExercices } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ annee: new Date().getFullYear(), actif: true });

  const handleSave = async () => {
    try {
      if (form.actif) {
        for (const ex of exercices.filter(e => e.actif)) { await updateDoc(doc(db, 'exercices', ex.id), { actif: false }); }
      }
      const docRef = await addDoc(collection(db, 'exercices'), form);
      const newExercices = exercices.map(e => form.actif ? { ...e, actif: false } : e);
      setExercices([{ id: docRef.id, ...form }, ...newExercices].sort((a, b) => b.annee - a.annee));
      setShowModal(false);
    } catch (error) { console.error('Erreur:', error); alert('Erreur lors de la sauvegarde'); }
  };

  const setActif = async (exercice) => {
    try {
      for (const ex of exercices) { await updateDoc(doc(db, 'exercices', ex.id), { actif: ex.id === exercice.id }); }
      setExercices(exercices.map(e => ({ ...e, actif: e.id === exercice.id })));
    } catch (error) { console.error('Erreur:', error); }
  };

  const thStyle = { ...styles.th, fontSize: 11, color: P.textSec, textTransform: 'uppercase', padding: '12px 16px', background: '#FAFAF8' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: P.textSec, margin: 0, fontSize: 13, fontWeight: 600 }}>{exercices.length} exercice(s) budgétaire(s)</p>
        <ActionBtn label="Nouvel exercice" icon={I.plus()} color={P.greenDark} onClick={() => { setForm({ annee: new Date().getFullYear() + 1, actif: false }); setShowModal(true); }} />
      </div>

      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden', maxWidth: 600 }}>
        {exercices.length === 0 ? (
          <Empty text="Aucun exercice défini." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Année</th>
                <th style={thStyle}>Statut</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exercices.map(ex => (
                <tr key={ex.id} style={{ borderBottom: `1px solid ${P.border}`, background: ex.actif ? P.greenLight : 'transparent' }}>
                  <td style={{ padding: '16px', fontSize: 16, fontWeight: 800, color: ex.actif ? P.greenDark : P.text }}>{ex.annee}</td>
                  <td style={{ padding: '16px' }}><Badge bg={ex.actif ? P.greenDark : P.border} color={ex.actif ? '#fff' : P.textSec}>{ex.actif ? 'Exercice Actif' : 'Clôturé'}</Badge></td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {!ex.actif && (
                      <button onClick={() => setActif(ex)} style={{ background: '#fff', border: `1px solid ${P.border}`, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: P.textSec }}>
                        Définir comme actif
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(3px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: P.greenDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 16 }}>Nouvel exercice</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{I.close('#fff')}</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <Label>Année</Label>
                <input type="number" value={form.annee} onChange={e => setForm({...form, annee: parseInt(e.target.value)})} style={{ ...styles.input, marginBottom: 0, borderRadius: 8 }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: P.bg, padding: 12, borderRadius: 8 }}>
                <input type="checkbox" checked={form.actif} onChange={e => setForm({...form, actif: e.target.checked})} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Définir comme exercice actif</span>
              </label>
            </div>
            <div style={{ padding: '16px 24px', background: '#FAFAF8', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <ActionBtn label="Créer" icon={I.check()} color={P.greenDark} onClick={handleSave} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ============================================================
// ONGLET MAINTENANCE (ADMIN ONLY) - Logique Intégrale Conservée
// ============================================================
const TabMaintenance = () => {
  const { projet, sources, exercices, ops, bordereaux, beneficiaires, setOps, setBordereaux } = useAppContext();
  const [tool, setTool] = useState(null); 
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // States spécifiques aux outils
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

  // 1. PURGE
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
        for (const d of comptSnap.docs) {
          if (d.data().exerciceId === purgeExercice) await deleteDoc(doc(db, 'compteurs', d.id));
        }
      }

      showMsg(`Purge terminée : ${opsToDelete.length} OP et ${btsToDelete.length} bordereaux supprimés.`);
      setPurgeConfirm('');
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  // 2. TÉLÉCHARGER CANEVAS IMPORT
  const handleDownloadCanevas = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const colonnes = ['N° OP', 'Type', 'Bénéficiaire', 'Objet', 'Montant', 'Ligne budgétaire', 'Mode règlement',
      'Date création', 'Statut', 'Date transmission CF', 'N° Bordereau CF', 'Date visa CF',
      'Date transmission AC', 'N° Bordereau AC', 'Date paiement', 'Montant payé', 'Référence paiement',
      'N° OP Provisoire', 'Observation'];

    sources.forEach(src => {
      const data = [colonnes]; 
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = colonnes.map((c) => ({ wch: c.length < 12 ? 15 : c.length + 4 }));
      XLSX.utils.book_append_sheet(wb, ws, src.sigle || src.nom);
    });

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

    const leg = [
      ['Colonne', 'Description', 'Valeurs acceptées', 'Obligatoire'],
      ['N° OP', 'Numéro unique de l\'OP', 'Ex: N°0001/PIF2-IDA/2026', 'OUI'],
      ['Type', 'Type d\'ordre de paiement', 'PROVISOIRE, DEFINITIF, ANNULATION', 'OUI'],
      ['Bénéficiaire', 'Nom exact du bénéficiaire', 'Ex: ENTREPRISE ABC', 'OUI'],
      ['Objet', 'Objet de la dépense', 'Texte libre', 'OUI'],
      ['Montant', 'Montant en FCFA (nombre)', 'Ex: 1500000', 'OUI'],
      ['Ligne budgétaire', 'Libellé exact de la ligne', 'Ex: Biens', 'OUI'],
      ['Mode règlement', 'Mode de paiement', 'VIREMENT, CHEQUE, ESPECES, ORDRE_PAIEMENT', 'OUI'],
      ['Date création', 'Date de création de l\'OP', 'AAAA-MM-JJ', 'OUI'],
      ['Statut', 'Statut actuel de l\'OP', 'CREE, TRANSMIS_CF, VISE_CF, DIFFERE_CF, REJETE_CF, TRANSMIS_AC, PAYE, DIFFERE_AC, REJETE_AC', 'OUI'],
    ];
    const wsLeg = XLSX.utils.aoa_to_sheet(leg);
    wsLeg['!cols'] = [{ wch: 22 }, { wch: 50 }, { wch: 55 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsLeg, 'LÉGENDE');

    XLSX.writeFile(wb, 'Canevas_Import_OP_Complet.xlsx');
    showMsg('Canevas téléchargé !');
  };

  // 3. IMPORT OP
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

            const ben = beneficiaires.find(b => (b.nom || '').toLowerCase().trim() === benNom.toLowerCase());
            if (!ben) { errors.push(`Bénéficiaire introuvable : "${benNom}" (OP ${numero})`); continue; }

            const opData = {
              numero, type: ['PROVISOIRE', 'DEFINITIF', 'ANNULATION'].includes(type) ? type : 'PROVISOIRE',
              sourceId, exerciceId: importExercice,
              beneficiaireId: ben.id, objet, montant, ligneBudgetaire: ligne,
              modeReglement: ['VIREMENT', 'CHEQUE', 'ESPECES', 'ORDRE_PAIEMENT'].includes(mode) ? mode : 'VIREMENT',
              dateCreation: dateCrea || new Date().toISOString().split('T')[0],
              statut: statut || 'CREE',
              dateTransmissionCF: String(row['Date transmission CF'] || '').trim() || null,
              bordereauCF: String(row['N° Bordereau CF'] || '').trim() || null,
              dateVisaCF: String(row['Date visa CF'] || '').trim() || null,
              dateTransmissionAC: String(row['Date transmission AC'] || '').trim() || null,
              bordereauAC: String(row['N° Bordereau AC'] || '').trim() || null,
              datePaiement: String(row['Date paiement'] || '').trim() || null,
              montantPaye: row['Montant payé'] ? parseFloat(String(row['Montant payé']).replace(/\s/g, '').replace(/,/g, '.')) : null,
              referencePaiement: String(row['Référence paiement'] || '').trim() || null,
              opProvisoireNumero: String(row['N° OP Provisoire'] || '').trim() || null,
              opProvisoireId: null,
              observation: String(row['Observation'] || '').trim() || null,
              rib: null, montantTVA: null, tvaRecuperable: false, piecesJustificatives: '',
              importedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'ops'), opData);
            imported++;
          } catch (rowErr) { errors.push(`Erreur ligne : ${rowErr.message}`); }
        }
      }

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

  // 4. RECALER COMPTEURS
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
          await setDoc(doc(db, 'compteurs', compteurId), { count: maxNum, type: typeBT, sourceId: src.id, exerciceId: compteurExercice });
          fixed++;
        }
      }
      showMsg(`${fixed} compteurs recalés pour ${sources.length} source(s).`);
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  // 5. CORRECTION DOUBLONS
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
      const opsToFix = dup.ops.slice(1); 
      const opsEx = ops.filter(o => o.exerciceId === doublonExercice);
      let maxNum = 0;
      opsEx.forEach(o => { const m = (o.numero || '').match(/N°(\d+)\//); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });

      for (const op of opsToFix) {
        maxNum++;
        const newNumero = op.numero.replace(/N°\d+\//, `N°${String(maxNum).padStart(4, '0')}/`);
        await updateDoc(doc(db, 'ops', op.id), { numero: newNumero, updatedAt: new Date().toISOString() });
      }
      showMsg(`${opsToFix.length} doublon(s) corrigé(s) pour ${dup.numero}`);
      handleDetecterDoublons();
    } catch (e) { alert('Erreur : ' + e.message); }
    setSaving(false);
  };

  const cardStyle = { background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, border: `1px solid ${P.border}` };
  
  const btnTool = (id, iconSvg, label, desc, color) => (
    <div key={id} onClick={() => setTool(tool === id ? null : id)}
      style={{ flex: 1, minWidth: 220, padding: 20, borderRadius: 12, border: tool === id ? `2px solid ${color}` : `1px solid ${P.border}`, background: tool === id ? `${color}10` : 'white', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconSvg}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color }}>{label}</div>
      <div style={{ fontSize: 11, color: P.textSec, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: P.text }}>Outils de maintenance</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: P.red, fontWeight: 600 }}>Zone sensible — Mot de passe administrateur requis pour chaque action.</p>
      </div>

      {message && <div style={{ padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, background: message.type === 'success' ? P.greenLight : P.redLight, color: message.type === 'success' ? P.greenDark : P.red, border: `1px solid ${message.type === 'success' ? '#a5d6a7' : '#ef9a9a'}` }}>{message.text}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {btnTool('purge', I.trash(P.red, 20), 'Purge des données', 'Supprimer les OP et bordereaux d\'un exercice.', P.red)}
        {btnTool('import', I.project('#3B6B8A', 20), 'Import Excel', 'Importer massivement des OP depuis un fichier.', '#3B6B8A')}
        {btnTool('compteurs', I.calendar(P.gold, 20), 'Recaler compteurs', 'Corriger la numérotation automatique.', P.gold)}
        {btnTool('doublons', I.source(P.gold, 20), 'Doublons', 'Détecter et renommer les OP avec le même numéro.', P.gold)}
      </div>

      {/* === PURGE === */}
      {tool === 'purge' && (
        <div style={cardStyle}>
          <h3 style={{ color: P.red, margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Purge des données</h3>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" checked={purgeScope === 'exercice'} onChange={() => setPurgeScope('exercice')} /> Par exercice
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="radio" checked={purgeScope === 'tout'} onChange={() => setPurgeScope('tout')} />
              <span style={{ color: P.red, fontWeight: 700 }}>Tout purger </span>
            </label>
          </div>
          {purgeScope === 'exercice' && (
            <select value={purgeExercice} onChange={e => setPurgeExercice(e.target.value)} style={{ ...styles.input, width: 200, marginBottom: 0 }}>
              <option value="">-- Sélectionner l'exercice --</option>
              {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
            </select>
          )}
          <div style={{ marginTop: 20 }}>
            <Label>Tapez SUPPRIMER pour confirmer :</Label>
            <input value={purgeConfirm} onChange={e => setPurgeConfirm(e.target.value)} placeholder="SUPPRIMER" style={{ ...styles.input, width: 200, marginTop: 4, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2, marginBottom: 0 }} />
          </div>
          {purgeScope === 'exercice' && purgeExercice && (
            <div style={{ fontSize: 12, color: P.textSec, marginTop: 12, background: P.bg, padding: '8px 12px', borderRadius: 6, display: 'inline-block' }}>
              {ops.filter(o => o.exerciceId === purgeExercice).length} OP et {bordereaux.filter(b => b.exerciceId === purgeExercice).length} bordereaux à supprimer.
            </div>
          )}
          {purgeScope === 'tout' && (
            <div style={{ fontSize: 12, color: P.red, fontWeight: 700, marginTop: 12, background: P.redLight, padding: '8px 12px', borderRadius: 6, display: 'inline-block' }}>
              ⚠️ {ops.length} OP et {bordereaux.length} bordereaux seront supprimés DÉFINITIVEMENT.
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <ActionBtn label={saving ? "Suppression en cours..." : "Exécuter la purge"} icon={I.trash('#fff')} color={P.red} onClick={handlePurge} disabled={saving || purgeConfirm !== 'SUPPRIMER'} />
          </div>
        </div>
      )}

      {/* === IMPORT === */}
      {tool === 'import' && (
        <div style={cardStyle}>
          <h3 style={{ color: '#3B6B8A', margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Import OP depuis Excel</h3>

          <div style={{ background: P.bg, borderRadius: 10, padding: 16, marginBottom: 16, border: `1px solid ${P.border}` }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: P.text }}>Étape 1 : Télécharger le canevas</p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: P.textSec }}>Le fichier contiendra un onglet par source ({sources.map(s => s.sigle).join(', ')}) + un onglet EXEMPLE + un onglet LÉGENDE.</p>
            <ActionBtn label="Télécharger le canevas Excel" icon={I.download()} color="#3B6B8A" onClick={handleDownloadCanevas} />
          </div>

          <div style={{ background: P.bg, borderRadius: 10, padding: 16, marginBottom: 16, border: `1px solid ${P.border}` }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: P.text }}>Étape 2 : Importer les données</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <Label>Exercice de destination</Label>
                <select value={importExercice} onChange={e => setImportExercice(e.target.value)} style={{ ...styles.input, marginBottom: 0 }}>
                  <option value="">-- Exercice --</option>
                  {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
                </select>
              </div>
              <div>
                <Label>Fichier Excel rempli</Label>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ padding: '8px 0', fontSize: 13, width: '100%' }} />
              </div>
            </div>
          </div>

          {importPreview && (
            <div style={{ background: P.greenLight, borderRadius: 10, padding: 16, marginBottom: 16, border: `1px solid ${P.green}44` }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: P.greenDark }}>Aperçu : {importPreview.total} OP trouvés dans le fichier</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {importPreview.parSource.map((s, i) => (
                  <Badge key={i} bg="#fff" color={P.greenDark}>{s.sigle} : {s.count} OP</Badge>
                ))}
              </div>
            </div>
          )}

          {importPreview && importExercice && (
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <ActionBtn label={saving ? "Import en cours..." : `Valider et Importer ${importPreview.total} OP`} icon={I.check()} color="#3B6B8A" onClick={handleImport} disabled={saving} />
            </div>
          )}
        </div>
      )}

      {/* === COMPTEURS === */}
      {tool === 'compteurs' && (
        <div style={cardStyle}>
          <h3 style={{ color: P.gold, margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Recaler les compteurs de bordereaux</h3>
          <p style={{ fontSize: 12, color: P.textSec, marginBottom: 16 }}>Remet les compteurs en cohérence avec le plus grand numéro de bordereau existant pour chaque source.</p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div>
              <Label>Exercice à recaler</Label>
              <select value={compteurExercice} onChange={e => setCompteurExercice(e.target.value)} style={{ ...styles.input, width: 200, marginBottom: 0 }}>
                <option value="">-- Exercice --</option>
                {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
              </select>
            </div>
            <ActionBtn label={saving ? "Recalage..." : "Lancer le recalage"} icon={I.check()} color={P.gold} onClick={handleRecalerCompteurs} disabled={saving || !compteurExercice} />
          </div>
        </div>
      )}

      {/* === DOUBLONS === */}
      {tool === 'doublons' && (
        <div style={cardStyle}>
          <h3 style={{ color: P.gold, margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Détection des doublons de numéros</h3>
          <p style={{ fontSize: 12, color: P.textSec, marginBottom: 16 }}>Recherche les OP ayant un numéro identique au sein d'un même exercice et permet de renuméroter automatiquement les copies.</p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <Label>Exercice à scanner</Label>
              <select value={doublonExercice} onChange={e => setDoublonExercice(e.target.value)} style={{ ...styles.input, width: 200, marginBottom: 0 }}>
                <option value="">-- Exercice --</option>
                {exercices.map(e => <option key={e.id} value={e.id}>{e.annee}</option>)}
              </select>
            </div>
            <ActionBtn label="Scanner" icon={I.search('#fff')} color={P.gold} onClick={handleDetecterDoublons} disabled={!doublonExercice} />
          </div>
          
          {doublons !== null && (
            doublons.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', background: P.greenLight, color: P.greenDark, borderRadius: 8, fontWeight: 600, fontSize: 13 }}>✓ Aucun numéro en doublon détecté pour cet exercice !</div>
            ) : (
              <div>
                <div style={{ padding: '10px 14px', background: P.redLight, color: P.red, borderRadius: 8, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>⚠️ {doublons.length} numéro(s) utilisé(s) plusieurs fois</div>
                {doublons.map((dup, i) => (
                  <div key={i} style={{ padding: 16, background: '#FAFAF8', border: `1px solid ${P.border}`, borderRadius: 8, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{dup.numero}</span>
                        <Badge bg={P.goldLight} color={P.gold}>{dup.count} exemplaires</Badge>
                      </div>
                      <div style={{ fontSize: 11, color: P.textSec, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dup.ops.map(o => <span key={o.id}>• {o.type} - {formatMontant(o.montant)} F - {getBen(o)}</span>)}
                      </div>
                    </div>
                    <ActionBtn label="Corriger automatiquement" icon={I.edit('#fff')} color={P.gold} onClick={() => handleFixDoublon(dup)} disabled={saving} />
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
