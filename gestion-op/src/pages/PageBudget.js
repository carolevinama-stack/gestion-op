import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatMontant, exportToCSV } from '../utils/formatters';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== PALETTE ====================
const P = {
  bg: '#F6F4F1', card: '#FFFFFF', border: '#E8E4DF',
  green: '#2E9940', greenLight: '#E8F5E9', greenBorder: '#C8E6C9',
  orange: '#D4722A', orangeLight: '#FFF3E0',
  gold: '#C5961F', goldLight: '#FFFDE7',
  red: '#C43E3E', redLight: '#FFEBEE',
  blue: '#3B5998', blueLight: '#E3F2FD',
  text: '#2C2C2C', textSec: '#6c757d', textMuted: '#adb5bd',
};

// ==================== ICONS SVG ====================
const Icon = {
  wallet: (color = P.green, size = 20) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  plus: (color = 'white', size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: (color = P.orange, size = 15) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (color = P.red, size = 15) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  lock: (color = P.orange, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  filePlus: (color = 'white', size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  download: (color = P.blue, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  check: (color = 'white', size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: (color = P.textSec, size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  calendar: (color = P.textSec, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  history: (color = P.textSec, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  alert: (color = P.gold, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  barChart: (color = P.textMuted, size = 40) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  search: (color = P.textMuted, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  upload: (color = P.blue, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  gear: (color = P.textSec, size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

// ==================== TOAST ====================
const TOAST_STYLES = {
  success: { bg: 'linear-gradient(135deg, #f0faf5 0%, #fff 100%)', iconBg: P.greenLight, titleColor: P.green },
  error: { bg: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', iconBg: P.redLight, titleColor: P.red },
  warning: { bg: 'linear-gradient(135deg, #fffbf0 0%, #fff 100%)', iconBg: P.orangeLight, titleColor: P.gold },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
};
const ToastNotif = ({ toast, onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  useEffect(() => { const t1 = setTimeout(() => setLeaving(true), 3500); const t2 = setTimeout(onDone, 3900); return () => { clearTimeout(t1); clearTimeout(t2); }; }, [onDone]);
  return (
    <div style={{ background: s.bg, borderRadius: 14, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 320, maxWidth: 420, pointerEvents: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ToastIcon type={toast.type} /></div>
      <div><div style={{ fontSize: 14, fontWeight: 700, color: s.titleColor, marginBottom: 2 }}>{toast.title}</div>{toast.message && <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{toast.message}</div>}</div>
    </div>
  );
};

// ==================== PAGE BUDGET ====================
const PageBudget = () => {
  const { sources, exerciceActif, exercices, budgets, setBudgets, ops, lignesBudgetaires, activeBudgetSource, setActiveBudgetSource, setCurrentPage, setHistoriqueParams } = useAppContext();
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
  const [nomRevision, setNomRevision] = useState('');
  const [dateNotification, setDateNotification] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  const PASSWORD_CORRECTION = 'admin';

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => setToasts(prev => prev.filter(t => t.uid !== uid)), []);

  const currentExerciceId = showAnterieur ? selectedExercice : exerciceActif?.id;
  const currentExerciceObj = exercices.find(e => e.id === currentExerciceId);
  const currentSourceObj = sources.find(s => s.id === activeSource);
  const accent = currentSourceObj?.couleur || P.green;

  const allBudgetsForSourceExercice = budgets
    .filter(b => b.sourceId === activeSource && b.exerciceId === currentExerciceId)
    .sort((a, b) => (b.version || 1) - (a.version || 1));

  const currentBudget = selectedVersion
    ? allBudgetsForSourceExercice.find(b => b.id === selectedVersion)
    : allBudgetsForSourceExercice[0];

  const latestVersion = allBudgetsForSourceExercice[0];
  const isLatestVersion = !selectedVersion || selectedVersion === latestVersion?.id;

  const getEngagementLigne = (ligneCode) => {
    return ops
      .filter(op =>
        op.sourceId === activeSource &&
        op.exerciceId === currentExerciceId &&
        op.ligneBudgetaire === ligneCode &&
        ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
        !['REJETE', 'REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut)
      )
      .reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  const openCreateModal = () => { setBudgetLignes([]); setSelectedLigne(''); setNomRevision('Budget Primitif'); setDateNotification(new Date().toISOString().split('T')[0]); setShowModal(true); };
  const openCorrectionModal = () => { setPassword(''); setShowPasswordModal(true); };

  const verifyPasswordAndEdit = () => {
    if (password === PASSWORD_CORRECTION) { setShowPasswordModal(false); setBudgetLignes(currentBudget.lignes.map(l => ({ ...l }))); setSelectedLigne(''); setShowModal(true); }
    else { showToast('error', 'Mot de passe incorrect'); }
  };

  const openRevisionModal = () => { setMotifRevision(''); setNomRevision(''); setDateNotification(''); setShowRevisionModal(true); };

  const createRevision = async () => {
    if (!nomRevision.trim()) { showToast('error', 'Champ obligatoire', 'Veuillez nommer cette révision'); return; }
    if (!dateNotification) { showToast('error', 'Champ obligatoire', 'Veuillez renseigner la date de validation'); return; }
    setSaving(true);
    try {
      const newVersion = (latestVersion?.version || 1) + 1;
      const revisionData = { sourceId: activeSource, exerciceId: currentExerciceId, version: newVersion, nomVersion: nomRevision.trim(), dateNotification, lignes: latestVersion.lignes.map(l => ({ ...l })), motifRevision: motifRevision.trim() || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, 'budgets'), revisionData);
      setBudgets([...budgets, { id: docRef.id, ...revisionData }]);
      setShowRevisionModal(false);
      setBudgetLignes(revisionData.lignes); setSelectedLigne(''); setSelectedVersion(docRef.id); setShowModal(true);
    } catch (error) { console.error('Erreur:', error); showToast('error', 'Erreur', 'Erreur lors de la création'); }
    setSaving(false);
  };

  const addLigne = () => {
    if (!selectedLigne) return;
    const ligne = lignesBudgetaires.find(l => l.code === selectedLigne);
    if (!ligne) return;
    if (budgetLignes.find(l => l.code === ligne.code)) { showToast('warning', 'Doublon', 'Cette ligne existe déjà'); return; }
    setBudgetLignes([...budgetLignes, { code: ligne.code, libelle: ligne.libelle, dotation: 0 }]); setSelectedLigne('');
  };

  const removeLigne = (code) => {
    const engagement = getEngagementLigne(code);
    if (engagement > 0) { showToast('error', 'Suppression impossible', `Engagements de ${formatMontant(engagement)} FCFA`); return; }
    setBudgetLignes(budgetLignes.filter(l => l.code !== code));
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) { showToast('error', 'Fichier vide', 'Le fichier ne contient pas de données.'); return; }

      // Détecter la ligne d'en-tête (chercher "code" ou "dotation")
      let startRow = 0;
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const cells = (rows[i] || []).map(c => String(c || '').toLowerCase().trim());
        if (cells.some(c => c.includes('code') || c.includes('ligne') || c.includes('rubrique'))) { startRow = i + 1; break; }
      }

      // Détecter les colonnes code et dotation
      const header = (rows[startRow > 0 ? startRow - 1 : 0] || []).map(c => String(c || '').toLowerCase().trim());
      let colCode = header.findIndex(h => h.includes('code') || h.includes('ligne') || h.includes('rubrique'));
      let colDot = header.findIndex(h => h.includes('dotation') || h.includes('montant') || h.includes('budget') || h.includes('crédit'));
      // Fallback : colonne 0 = code, colonne 1 = dotation
      if (colCode < 0) colCode = 0;
      if (colDot < 0) colDot = colCode === 0 ? 1 : 0;

      const parsed = [];
      const errors = [];

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const rawCode = String(row[colCode] || '').trim();
        const rawDot = row[colDot];
        if (!rawCode) continue;

        // Chercher la ligne budgétaire correspondante
        const lb = lignesBudgetaires.find(l =>
          l.code === rawCode ||
          l.code === rawCode.replace(/\./g, '') ||
          l.code.replace(/\./g, '') === rawCode.replace(/\./g, '')
        );

        const dotation = parseInt(String(rawDot).replace(/[^\d-]/g, '')) || 0;

        if (!lb) {
          errors.push(`Ligne ${i + 1} : code "${rawCode}" introuvable dans les lignes budgétaires`);
        } else {
          // Vérifier doublon
          if (!parsed.find(p => p.code === lb.code)) {
            parsed.push({ code: lb.code, libelle: lb.libelle, dotation });
          } else {
            errors.push(`Ligne ${i + 1} : code "${rawCode}" en doublon (ignoré)`);
          }
        }
      }

      if (parsed.length === 0) {
        showToast('error', 'Aucune ligne reconnue', errors.length > 0 ? errors[0] : 'Vérifiez le format du fichier.');
        return;
      }

      setImportData(parsed);
      setImportErrors(errors);
      setShowImportModal(true);
    } catch (e) {
      console.error('Erreur import:', e);
      showToast('error', 'Erreur de lecture', 'Le fichier Excel est invalide ou corrompu.');
    }
  };

  const confirmImport = () => {
    setBudgetLignes(importData);
    setShowImportModal(false);
    setImportData([]);
    setImportErrors([]);
    setShowModal(true);
    showToast('success', 'Budget importé', `${importData.length} ligne(s) chargée(s)`);
  };

  const updateDotation = (code, dotation) => setBudgetLignes(budgetLignes.map(l => l.code === code ? { ...l, dotation: parseInt(dotation) || 0 } : l));

  const handleSave = async () => {
    if (budgetLignes.length === 0) { showToast('error', 'Budget vide', 'Ajoutez au moins une ligne'); return; }
    const lignesDepassees = budgetLignes.filter(l => { const eng = getEngagementLigne(l.code); return eng > 0 && (l.dotation || 0) < eng; });
    if (lignesDepassees.length > 0) { showToast('error', 'Dotation insuffisante', `${lignesDepassees.length} ligne(s) sous les engagements`); return; }
    setSaving(true);
    try {
      const budgetData = { sourceId: activeSource, exerciceId: currentExerciceId, lignes: budgetLignes, updatedAt: new Date().toISOString() };
      if (currentBudget && isLatestVersion) { await updateDoc(doc(db, 'budgets', currentBudget.id), budgetData); setBudgets(budgets.map(b => b.id === currentBudget.id ? { ...b, ...budgetData } : b)); }
      else if (!currentBudget) { budgetData.version = 1; budgetData.nomVersion = nomRevision.trim() || 'Budget Primitif'; budgetData.dateNotification = dateNotification || new Date().toISOString().split('T')[0]; budgetData.createdAt = new Date().toISOString(); const docRef = await addDoc(collection(db, 'budgets'), budgetData); setBudgets([...budgets, { id: docRef.id, ...budgetData }]); }
      setShowModal(false); setSelectedVersion(null); showToast('success', 'Budget enregistré');
    } catch (error) { console.error('Erreur:', error); showToast('error', 'Erreur', 'Erreur lors de la sauvegarde'); }
    setSaving(false);
  };

  const handleDeleteBudget = async () => {
    if (!currentBudget) return;
    const totaux = getTotaux(currentBudget);
    if (totaux.engagement > 0) { showToast('error', 'Suppression impossible', `Ce budget a ${formatMontant(totaux.engagement)} FCFA d'engagements. Supprimez d'abord les OP liés.`); return; }
    const password = window.prompt('Mot de passe requis pour supprimer :');
    if (password !== PASSWORD_CORRECTION) { if (password !== null) showToast('error', 'Mot de passe incorrect'); return; }
    if (!window.confirm(`Supprimer définitivement "${getVersionLabel(currentBudget)}" ?`)) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'budgets', currentBudget.id));
      setBudgets(budgets.filter(b => b.id !== currentBudget.id));
      setSelectedVersion(null); setShowModal(false);
      showToast('success', 'Budget supprimé');
    } catch (error) { console.error('Erreur:', error); showToast('error', 'Erreur', 'Erreur lors de la suppression'); }
    setSaving(false);
  };

  const getTotaux = (budget) => {
    if (!budget?.lignes) return { dotation: 0, engagement: 0, disponible: 0 };
    let totalDotation = 0, totalEngagement = 0;
    budget.lignes.forEach(l => { totalDotation += l.dotation || 0; totalEngagement += getEngagementLigne(l.code); });
    return { dotation: totalDotation, engagement: totalEngagement, disponible: totalDotation - totalEngagement };
  };

  const totaux = getTotaux(currentBudget);
  const lignesDisponibles = lignesBudgetaires.filter(l => !budgetLignes.find(bl => bl.code === l.code));

  const getVersionLabel = (budget) => {
    if (!budget) return '';
    if (budget.nomVersion) return budget.nomVersion;
    return budget.version === 1 ? 'Budget Primitif' : `V${budget.version}`;
  };

  const exportSuiviBudgetaire = () => {
    if (!currentBudget?.lignes?.length) return;
    const now = new Date().toLocaleDateString('fr-FR');
    let csv = `SUIVI BUDGETAIRE - ${currentSourceObj?.nom || ''}\nExercice: ${currentExerciceObj?.annee || ''}\nVersion: ${getVersionLabel(currentBudget)}\nDate d'export: ${now}\n\nCode;Libellé;Dotation;Engagements;Disponible;Taux (%)\n`;
    currentBudget.lignes.forEach(l => { const eng = getEngagementLigne(l.code), disp = (l.dotation || 0) - eng, taux = l.dotation > 0 ? ((eng / l.dotation) * 100).toFixed(1) : '0'; csv += `${l.code};${l.libelle};${l.dotation || 0};${eng};${disp};${taux}\n`; });
    csv += `\nTOTAL;;${totaux.dotation};${totaux.engagement};${totaux.disponible};${totaux.dotation > 0 ? ((totaux.engagement / totaux.dotation) * 100).toFixed(1) : '0'}\n`;
    exportToCSV(csv, `Suivi_Budget_${currentSourceObj?.sigle || 'Source'}_${currentExerciceObj?.annee || ''}_v${currentBudget.version || 1}.csv`);
  };

  // Styles
  const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textSec, letterSpacing: 0.5, textTransform: 'uppercase', background: '#FAFAF8' };
  const tdStyle = { padding: '12px 16px', borderBottom: `1px solid ${P.border}`, fontSize: 14 };
  const inputStyle = { padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0); } }
        @keyframes toastOut { from { opacity:1; } to { opacity:0; transform: translateX(40px); } }
        .bud-row:hover { background: ${P.greenLight} !important; }
        .bud-btn { border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; transition: all 0.15s; }
        .bud-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      `}</style>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => <ToastNotif key={t.uid} toast={t} onDone={() => removeToast(t.uid)} />)}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: P.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.wallet(P.green)}</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: P.text }}>Budget</h1>
        </div>
        <button onClick={() => setCurrentPage('lignes')} title="Lignes budgétaires"
          style={{ width: 44, height: 44, borderRadius: 12, background: P.bg, border: `1.5px solid ${P.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {Icon.gear(P.textSec, 22)}
        </button>
      </div>

      {/* Sources */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {sources.length === 0 ? (
          <div style={{ color: P.textSec, fontSize: 14 }}>Aucune source configurée. <span style={{ color: P.green, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Configurer</span></div>
        ) : sources.map(source => {
          const isActive = activeSource === source.id;
          return (
            <div key={source.id} onClick={() => { setActiveSource(source.id); setSelectedVersion(null); }}
              style={{ padding: '12px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.2s', background: isActive ? source.couleur : 'white', color: isActive ? 'white' : P.text, border: isActive ? `2px solid ${source.couleur}` : `2px solid ${P.border}`, boxShadow: isActive ? `0 4px 12px ${source.couleur}33` : 'none' }}>
              {source.sigle || source.nom}
            </div>
          );
        })}
      </div>

      {sources.length > 0 && activeSource && (
        <>
          {/* Exercice + Version + Actions */}
          <div style={{ background: P.card, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 13, color: P.textSec }}>Exercice : </span>
                  <strong style={{ fontSize: 18, color: accent }}>{currentExerciceObj?.annee || 'Non défini'}</strong>
                  {!showAnterieur && exerciceActif && <span style={{ background: P.greenLight, color: P.green, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginLeft: 8 }}>Actif</span>}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: P.textSec }}>
                  <input type="checkbox" checked={showAnterieur} onChange={(e) => { setShowAnterieur(e.target.checked); if (!e.target.checked) setSelectedExercice(exerciceActif?.id); setSelectedVersion(null); }} style={{ accentColor: accent }} />
                  Exercices antérieurs
                </label>
                {showAnterieur && (
                  <select value={selectedExercice || ''} onChange={(e) => { setSelectedExercice(e.target.value); setSelectedVersion(null); }}
                    style={{ ...inputStyle, width: 'auto', padding: '8px 12px' }}>
                    {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>)}
                  </select>
                )}
              </div>
              {!showAnterieur && exerciceActif && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {!currentBudget ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="bud-btn" onClick={openCreateModal} style={{ background: accent, color: 'white', padding: '10px 18px' }}>{Icon.plus('white', 14)} Créer le budget initial</button>
                      <label className="bud-btn" style={{ background: P.blueLight || '#E3F2FD', color: P.blue || '#1976D2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icon.upload(P.blue || '#1976D2', 14)} Importer Excel<input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ''; }} /></label>
                    </div>
                  ) : (
                    <>
                      <button className="bud-btn" onClick={openCorrectionModal} style={{ background: P.orangeLight, color: P.orange }}>{Icon.lock(P.orange, 14)} Correction</button>
                      <button className="bud-btn" onClick={openRevisionModal} style={{ background: accent, color: 'white' }}>{Icon.filePlus('white', 14)} Nouvelle révision</button>
                      <label className="bud-btn" style={{ background: P.blueLight || '#E3F2FD', color: P.blue || '#1976D2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icon.upload(P.blue || '#1976D2', 14)} Importer<input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ''; }} /></label>
                      <button className="bud-btn" onClick={handleDeleteBudget} style={{ background: P.redLight, color: P.red }}>{Icon.trash(P.red, 14)} Supprimer</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {currentBudget && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: accent, color: 'white', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{getVersionLabel(currentBudget)}</span>
                  {currentBudget.dateNotification && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: P.textSec }}>{Icon.calendar()} {currentBudget.dateNotification}</span>}
                  {!isLatestVersion && <span style={{ background: P.redLight, color: P.red, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>{Icon.lock(P.red, 12)} Archivée</span>}
                  {currentBudget.motifRevision && <span style={{ fontSize: 12, color: P.textSec, fontStyle: 'italic' }}>"{currentBudget.motifRevision}"</span>}
                </div>
                {allBudgetsForSourceExercice.length > 1 && (
                  <button className="bud-btn" onClick={() => { setHistoriqueParams({ sourceId: activeSource, exerciceId: currentExerciceId }); setCurrentPage('historique'); }}
                    style={{ background: P.bg, color: P.textSec, border: `1px solid ${P.border}` }}>
                    {Icon.history()} Historique ({allBudgetsForSourceExercice.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Dotation totale', value: totaux.dotation, color: accent, icon: Icon.wallet(accent, 18) },
              { label: 'Engagements', value: totaux.engagement, color: P.gold, icon: Icon.edit(P.gold, 18) },
              { label: 'Disponible', value: totaux.disponible, color: totaux.disponible >= 0 ? P.green : P.red, icon: Icon.check(totaux.disponible >= 0 ? P.green : P.red, 18) },
            ].map((stat, i) => (
              <div key={i} style={{ background: P.card, borderRadius: 12, padding: '20px 24px', border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: P.textSec, marginBottom: 8 }}>{stat.icon} {stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'monospace' }}>{formatMontant(stat.value)}</div>
              </div>
            ))}
          </div>

          {/* Tableau budget */}
          <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>Lignes budgétaires — {currentSourceObj?.nom} ({currentExerciceObj?.annee})</div>
              {currentBudget?.lignes?.length > 0 && (
                <button className="bud-btn" onClick={exportSuiviBudgetaire} style={{ background: P.blueLight, color: P.blue }}>{Icon.download(P.blue, 14)} Exporter</button>
              )}
            </div>

            {!currentBudget?.lignes?.length ? (
              <div style={{ textAlign: 'center', padding: 60, color: P.textMuted }}>
                {Icon.barChart()}
                <p style={{ marginTop: 12, fontSize: 14 }}>Aucun budget défini</p>
                {lignesBudgetaires.length === 0 && <p style={{ fontSize: 13, color: P.textMuted, marginTop: 8 }}>Ajoutez d'abord vos lignes via le bouton {Icon.gear(P.textMuted, 14)} en haut</p>}
                {!showAnterieur && exerciceActif && lignesBudgetaires.length > 0 && (
                  <button className="bud-btn" onClick={openCreateModal} style={{ background: accent, color: 'white', marginTop: 16, padding: '10px 20px' }}>{Icon.plus('white', 14)} Créer le budget initial</button>
                )}
              </div>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={thStyle}>Code</th><th style={thStyle}>Libellé</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Dotation</th><th style={{ ...thStyle, textAlign: 'right' }}>Engagements</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Disponible</th><th style={{ ...thStyle, textAlign: 'center' }}>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBudget.lignes.map(ligne => {
                      const engagement = getEngagementLigne(ligne.code);
                      const disponible = (ligne.dotation || 0) - engagement;
                      const taux = ligne.dotation > 0 ? ((engagement / ligne.dotation) * 100).toFixed(1) : 0;
                      return (
                        <tr key={ligne.code} className="bud-row" style={{ transition: 'background 0.15s' }}>
                          <td style={tdStyle}><code style={{ background: accent, color: 'white', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{ligne.code}</code></td>
                          <td style={{ ...tdStyle, fontSize: 13 }}>{ligne.libelle}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(ligne.dotation)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: P.gold, fontWeight: 600 }}>{formatMontant(engagement)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: disponible >= 0 ? P.green : P.red }}>{formatMontant(disponible)}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{ background: taux >= 100 ? P.redLight : taux >= 80 ? P.orangeLight : P.greenLight, color: taux >= 100 ? P.red : taux >= 80 ? P.orange : P.green, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{taux}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#FAFAF8' }}>
                      <td colSpan={2} style={{ ...tdStyle, fontWeight: 800, fontSize: 13 }}>TOTAL</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{formatMontant(totaux.dotation)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: P.gold, fontWeight: 800 }}>{formatMontant(totaux.engagement)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: totaux.disponible >= 0 ? P.green : P.red }}>{formatMontant(totaux.disponible)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ background: P.blueLight, color: P.blue, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{totaux.dotation > 0 ? ((totaux.engagement / totaux.dotation) * 100).toFixed(1) : 0}%</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== MODAL CRÉATION / MODIFICATION ==================== */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 820, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${P.border}`, background: accent, borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {currentBudget ? Icon.edit('white', 18) : Icon.plus('white', 18)}
                <span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>
                  {currentBudget ? `Modifier — ${getVersionLabel(currentBudget)}` : 'Créer le budget initial'} — {currentSourceObj?.nom} ({currentExerciceObj?.annee})
                </span>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedVersion(null); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>{Icon.x('white')}</button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {!currentBudget && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>NOM DE LA RÉVISION *</label><input type="text" value={nomRevision} onChange={e => setNomRevision(e.target.value)} placeholder="Budget Primitif" style={{ ...inputStyle, background: P.goldLight, borderColor: `${accent}40` }} /></div>
                  <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>DATE DE VALIDATION *</label><input type="date" value={dateNotification} onChange={e => setDateNotification(e.target.value)} style={{ ...inputStyle, background: P.goldLight, borderColor: `${accent}40` }} /></div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 8, color: P.textSec }}>{Icon.search(P.textSec)} AJOUTER UNE LIGNE</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <Autocomplete options={lignesDisponibles.map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}`, searchFields: [l.code, l.libelle] }))}
                      value={selectedLigne ? lignesDisponibles.filter(x => x.code === selectedLigne).map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}` }))[0] || null : null}
                      onChange={(option) => setSelectedLigne(option?.value || '')} placeholder="Rechercher par code ou libellé..." noOptionsMessage="Aucune ligne disponible" accentColor={accent} />
                  </div>
                  <button className="bud-btn" onClick={addLigne} disabled={!selectedLigne} style={{ background: accent, color: 'white', opacity: selectedLigne ? 1 : 0.4, padding: '10px 18px' }}>{Icon.plus('white', 14)} Ajouter</button>
                </div>
                {lignesBudgetaires.length === 0 && (
                  <p style={{ fontSize: 12, color: P.red, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Icon.alert(P.red, 14)} Aucune ligne. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setShowModal(false); setCurrentPage('lignes'); }}>Gérer les lignes</span>
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: P.textSec }}>LIGNES DU BUDGET ({budgetLignes.length})</label>
                {budgetLignes.length === 0 ? (
                  <div style={{ padding: 32, background: P.bg, borderRadius: 10, textAlign: 'center', color: P.textMuted, fontSize: 13 }}>Sélectionnez une ligne ci-dessus.</div>
                ) : (
                  <div style={{ background: P.bg, borderRadius: 10, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0 }}>
                        <tr><th style={{ ...thStyle, width: 100 }}>Code</th><th style={thStyle}>Libellé</th><th style={{ ...thStyle, width: 180 }}>Dotation (FCFA)</th><th style={{ ...thStyle, width: 120, textAlign: 'right' }}>Engagé</th><th style={{ ...thStyle, width: 50 }}></th></tr>
                      </thead>
                      <tbody>
                        {budgetLignes.map(ligne => {
                          const engagement = getEngagementLigne(ligne.code);
                          return (
                            <tr key={ligne.code} style={{ background: 'white' }}>
                              <td style={tdStyle}><code style={{ background: accent, color: 'white', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{ligne.code}</code></td>
                              <td style={{ ...tdStyle, fontSize: 13 }}>{ligne.libelle}</td>
                              <td style={tdStyle}><MontantInput value={ligne.dotation || ''} onChange={(val) => updateDotation(ligne.code, val)} placeholder="0" style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${P.border}`, borderRadius: 6, fontFamily: 'monospace', textAlign: 'right', fontSize: 14, boxSizing: 'border-box', background: P.goldLight }} /></td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: engagement > 0 ? P.gold : P.textMuted, fontSize: 13, fontWeight: 600 }}>{formatMontant(engagement)}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <button className="bud-btn" onClick={() => removeLigne(ligne.code)} style={{ background: engagement > 0 ? '#f5f5f5' : P.redLight, color: engagement > 0 ? P.textMuted : P.red, padding: '4px 8px', cursor: engagement > 0 ? 'not-allowed' : 'pointer' }}>{Icon.trash(engagement > 0 ? P.textMuted : P.red, 13)}</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#FAFAF8' }}>
                          <td colSpan={2} style={{ ...tdStyle, fontWeight: 800, fontSize: 12 }}>TOTAL</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 800, textAlign: 'right', paddingRight: 16 }}>{formatMontant(budgetLignes.reduce((s, l) => s + (l.dotation || 0), 0))}</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', color: P.gold, textAlign: 'right', fontWeight: 700 }}>{formatMontant(budgetLignes.reduce((s, l) => s + getEngagementLigne(l.code), 0))}</td>
                          <td style={tdStyle}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 28px 24px', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="bud-btn" onClick={() => { setShowModal(false); setSelectedVersion(null); }} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
              <button className="bud-btn" onClick={handleSave} disabled={saving || budgetLignes.length === 0} style={{ background: accent, color: 'white', padding: '10px 24px', opacity: saving || budgetLignes.length === 0 ? 0.5 : 1 }}>{Icon.check('white', 14)} {saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL MOT DE PASSE ==================== */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', background: P.orange, display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0' }}>{Icon.lock('white', 18)}<span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Correction du budget</span></div>
            <div style={{ padding: '24px 28px' }}>
              <p style={{ marginBottom: 16, color: P.textSec, fontSize: 13, lineHeight: 1.5 }}>Cette action nécessite un mot de passe administrateur.</p>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>MOT DE PASSE</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyPasswordAndEdit()} placeholder="Entrez le mot de passe" style={{ ...inputStyle, background: P.goldLight }} autoFocus />
            </div>
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
              <button className="bud-btn" onClick={() => setShowPasswordModal(false)} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
              <button className="bud-btn" onClick={verifyPasswordAndEdit} style={{ background: P.orange, color: 'white', padding: '10px 20px' }}>{Icon.check('white', 14)} Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL IMPORT ==================== */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 600, maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 28px', background: P.blue || '#1976D2', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0', flexShrink: 0 }}>{Icon.upload('white', 18)}<span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Import Excel — Aperçu</span></div>
            <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>
              <div style={{ background: P.greenLight, padding: 14, borderRadius: 10, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                {Icon.check(P.green, 16)}
                <span style={{ fontSize: 13, fontWeight: 600, color: P.green }}>{importData.length} ligne(s) reconnue(s)</span>
                <span style={{ fontSize: 13, color: P.textSec, marginLeft: 'auto' }}>Total : <strong style={{ color: accent }}>{formatMontant(importData.reduce((s, l) => s + (l.dotation || 0), 0))} FCFA</strong></span>
              </div>
              {importErrors.length > 0 && (
                <div style={{ background: P.orangeLight, padding: 14, borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>{Icon.alert(P.orange, 16)}<span style={{ fontSize: 12, fontWeight: 700, color: P.orange }}>{importErrors.length} avertissement(s)</span></div>
                  {importErrors.map((err, i) => <div key={i} style={{ fontSize: 11, color: P.textSec, padding: '3px 0', borderTop: i > 0 ? `1px solid ${P.border}` : 'none' }}>{err}</div>)}
                </div>
              )}
              <div style={{ border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#FAFAF8' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: P.textSec, textTransform: 'uppercase', letterSpacing: .5 }}>CODE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: P.textSec, textTransform: 'uppercase', letterSpacing: .5 }}>LIBELLÉ</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: P.textSec, textTransform: 'uppercase', letterSpacing: .5 }}>DOTATION</th>
                  </tr></thead>
                  <tbody>{importData.map((l, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${P.border}` }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>{l.code}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: P.text }}>{l.libelle}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: accent }}>{formatMontant(l.dotation)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: P.textMuted, marginTop: 12, lineHeight: 1.5 }}>Les lignes importées remplaceront le formulaire de budget actuel. Vous pourrez encore modifier les dotations avant d'enregistrer.</p>
            </div>
            <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}`, flexShrink: 0 }}>
              <button className="bud-btn" onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
              <button className="bud-btn" onClick={confirmImport} style={{ background: P.blue || '#1976D2', color: 'white', padding: '10px 20px' }}>{Icon.check('white', 14)} Confirmer l'import</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL RÉVISION ==================== */}
      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', background: accent, display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0' }}>{Icon.filePlus('white', 18)}<span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Nouvelle révision budgétaire</span></div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ background: P.orangeLight, padding: 16, borderRadius: 10, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {Icon.alert(P.orange)}
                <div><strong style={{ color: P.orange, fontSize: 13 }}>Information importante</strong><p style={{ margin: '6px 0 0', fontSize: 12, color: P.textSec, lineHeight: 1.5 }}>Une v{(latestVersion?.version || 1) + 1} sera créée. La version actuelle ({getVersionLabel(latestVersion)}) sera archivée.</p></div>
              </div>
              <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>NOM DE LA RÉVISION *</label><input type="text" value={nomRevision} onChange={(e) => setNomRevision(e.target.value)} placeholder="Ex: Budget Révisé 1..." style={{ ...inputStyle, background: P.goldLight }} autoFocus /></div>
              <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>DATE DE VALIDATION *</label><input type="date" value={dateNotification} onChange={(e) => setDateNotification(e.target.value)} style={{ ...inputStyle, background: P.goldLight }} /></div>
              <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>MOTIF <span style={{ fontWeight: 400, color: P.textMuted }}>(optionnel)</span></label><textarea value={motifRevision} onChange={(e) => setMotifRevision(e.target.value)} placeholder="Ex: Augmentation suite avenant..." style={{ ...inputStyle, minHeight: 60, resize: 'vertical', background: P.goldLight }} /></div>
            </div>
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
              <button className="bud-btn" onClick={() => setShowRevisionModal(false)} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
              <button className="bud-btn" onClick={createRevision} disabled={saving || !nomRevision.trim() || !dateNotification} style={{ background: accent, color: 'white', padding: '10px 20px', opacity: saving || !nomRevision.trim() || !dateNotification ? 0.5 : 1 }}>{Icon.check('white', 14)} {saving ? 'Création...' : 'Créer la révision'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PageBudget;
