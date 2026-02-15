import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== TOAST SYSTEM ====================
const TOAST_STYLES = {
  success: { bg: 'linear-gradient(135deg, #f0faf5 0%, #fff 100%)', iconBg: '#e8f5e9', iconBorder: '#4caf5020' },
  error: { bg: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', iconBg: '#ffebee', iconBorder: '#f4433620' },
  warning: { bg: 'linear-gradient(135deg, #fffbf0 0%, #fff 100%)', iconBg: '#fff3e0', iconBorder: '#ff980020' },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
};
const ToastNotif = ({ toast, onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3500);
    const t2 = setTimeout(onDone, 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div style={{
      background: s.bg, borderRadius: 14, padding: '16px 22px',
      display: 'flex', alignItems: 'center', gap: 14,
      minWidth: 320, maxWidth: 420,
      boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out'
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', background: s.iconBg,
        border: `1.5px solid ${s.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <ToastIcon type={toast.type} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{toast.title}</div>
        {toast.message && <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{toast.message}</div>}
      </div>
    </div>
  );
};

// ==================== PAGE CONSULTER OP ====================
const PageConsulterOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage } = useAppContext();
  const [activeSource, setActiveSource] = useState(sources[0]?.id || null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editNumero, setEditNumero] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const dropdownRef = useRef(null);
  const modalInputRef = useRef(null);

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  // Modal system (replaces window.prompt / window.confirm)
  const askPassword = useCallback((title) => new Promise((resolve) => {
    setModal({ type: 'password', title, resolve });
  }), []);
  const askConfirm = useCallback((title, message) => new Promise((resolve) => {
    setModal({ type: 'confirm', title, message, resolve });
  }), []);
  const closeModal = useCallback((result) => {
    if (modal?.resolve) modal.resolve(result);
    setModal(null);
  }, [modal]);

  const [form, setForm] = useState({
    type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT',
    objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '',
    montantTVA: '', tvaRecuperable: false, opProvisoireNumero: '', opProvisoireId: ''
  });

  useEffect(() => {
    if (consultOpData && !consultOpData._duplicate) {
      loadOp(consultOpData);
      if (setConsultOpData) setConsultOpData(null);
    }
  }, [consultOpData]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const opsSource = ops
    .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id)
    .sort((a, b) => (a.numero || '').localeCompare(b.numero || ''));

  const opsFiltered = opsSource.filter(op => {
    if (!searchText.trim()) return true;
    const term = searchText.toLowerCase();
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    return (op.numero || '').toLowerCase().includes(term) ||
      (ben?.nom || '').toLowerCase().includes(term) ||
      (ben?.ncc || '').toLowerCase().includes(term) ||
      (op.objet || '').toLowerCase().includes(term) ||
      String(op.montant || '').includes(term);
  });

  const currentIndex = selectedOp ? opsSource.findIndex(op => op.id === selectedOp.id) : -1;

  const goToPrev = () => {
    if (currentIndex > 0) loadOp(opsSource[currentIndex - 1]);
    else if (opsSource.length > 0) loadOp(opsSource[opsSource.length - 1]);
  };
  const goToNext = () => {
    if (currentIndex < opsSource.length - 1) loadOp(opsSource[currentIndex + 1]);
    else if (opsSource.length > 0) loadOp(opsSource[0]);
  };

  const loadOp = (op) => {
    if (!op) return;
    setSelectedOp(op);
    setIsEditMode(false);
    setEditNumero(null);
    setSearchText(op.numero || '');
    setShowDropdown(false);
    if (op.sourceId) setActiveSource(op.sourceId);
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ribs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
    const ribIndex = ribs.findIndex(r => r.numero === (typeof op.rib === 'object' ? op.rib?.numero : op.rib)) || 0;
    setForm({
      type: op.type || 'PROVISOIRE', beneficiaireId: op.beneficiaireId || '',
      ribIndex: ribIndex >= 0 ? ribIndex : 0, modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '', piecesJustificatives: op.piecesJustificatives || '',
      montant: String(op.montant || ''), ligneBudgetaire: op.ligneBudgetaire || '',
      montantTVA: String(op.montantTVA || ''), tvaRecuperable: op.tvaRecuperable || false,
      opProvisoireNumero: op.opProvisoireNumero || '', opProvisoireId: op.opProvisoireId || ''
    });
  };

  const currentSourceObj = sources.find(s => s.id === activeSource);
  const accent = currentSourceObj?.couleur || '#0f4c3a';
  const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);
  const getBeneficiaireRibs = (ben) => {
    if (!ben) return [];
    if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
    if (ben.rib) return [{ banque: '', numero: ben.rib }];
    return [];
  };
  const beneficiaireRibs = getBeneficiaireRibs(selectedBeneficiaire);
  const selectedRib = beneficiaireRibs[form.ribIndex] || beneficiaireRibs[0] || null;

  const currentBudget = budgets
    .filter(b => b.sourceId === activeSource && b.exerciceId === exerciceActif?.id)
    .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
  const selectedLigne = currentBudget?.lignes?.find(l => l.code === form.ligneBudgetaire);

  const getDotation = () => selectedLigne?.dotation || 0;
  const getEngagementsAnterieurs = () => {
    if (!form.ligneBudgetaire) return 0;
    return ops
      .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id && op.ligneBudgetaire === form.ligneBudgetaire && ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) && !['REJETE', 'REJETE_CF', 'REJETE_AC', 'ANNULE'].includes(op.statut))
      .reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  const statutConfig = {
    EN_COURS: { bg: '#e3f2fd', color: '#1565c0', label: 'En cours', icon: '🔵' },
    TRANSMIS_CF: { bg: '#fff3e0', color: '#e65100', label: 'Transmis CF', icon: '📤' },
    DIFFERE_CF: { bg: '#fff8e1', color: '#f9a825', label: 'Différé CF', icon: '⏸️' },
    RETOURNE_CF: { bg: '#e1f5fe', color: '#0277bd', label: 'Retourné CF', icon: '↩️' },
    VISE_CF: { bg: '#e8f5e9', color: '#2e7d32', label: 'Visé CF', icon: '✅' },
    REJETE_CF: { bg: '#ffebee', color: '#c62828', label: 'Rejeté CF', icon: '❌' },
    TRANSMIS_AC: { bg: '#f3e5f5', color: '#7b1fa2', label: 'Transmis AC', icon: '📤' },
    PAYE: { bg: '#e0f2f1', color: '#00695c', label: 'Payé', icon: '💰' },
    REJETE_AC: { bg: '#ffebee', color: '#c62828', label: 'Rejeté AC', icon: '❌' },
    ARCHIVE: { bg: '#eceff1', color: '#546e7a', label: 'Archivé', icon: '📦' }
  };
  const statutInfo = selectedOp ? (statutConfig[selectedOp.statut] || { bg: '#f5f5f5', color: '#666', label: selectedOp.statut || '', icon: '⚪' }) : null;
  const typeColors = { PROVISOIRE: '#ff9800', DIRECT: '#2196f3', DEFINITIF: '#4caf50', ANNULATION: '#f44336' };

  // === ACTIONS ===
  const handleModifier = async () => {
    const pwd = await askPassword('Mot de passe requis pour modifier');
    if (pwd === null) return;
    if (pwd === (projet?.motDePasseAdmin || 'admin123')) {
      setIsEditMode(true);
    } else {
      showToast('error', 'Mot de passe incorrect');
    }
  };

  const handleEnregistrerModif = async () => {
    try {
      if (!selectedOp?.id) return;
      const ben = beneficiaires.find(b => b.id === form.beneficiaireId);
      const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
      const ribSel = benRibs[form.ribIndex || 0];
      const newMontant = parseFloat(form.montant) || selectedOp.montant;
      if (newMontant !== selectedOp.montant) {
        const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
        if (opsSuivants.length > 0) {
          const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
          const diff = newMontant - selectedOp.montant;
          const ok = await askConfirm('Impact montant', `Modification de ${diff > 0 ? '+' : ''}${formatMontant(diff)} F impactera : ${numeros}`);
          if (!ok) return;
        }
      }
      const updates = {
        type: form.type, beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: form.modeReglement === 'VIREMENT' ? (ribSel?.numero || '') : '',
        banque: form.modeReglement === 'VIREMENT' ? (ribSel?.banque || '') : '',
        objet: form.objet, piecesJustificatives: form.piecesJustificatives,
        montant: newMontant, ligneBudgetaire: form.ligneBudgetaire,
        tvaRecuperable: form.tvaRecuperable || false,
        montantTVA: form.tvaRecuperable ? (parseFloat(form.montantTVA) || 0) : 0,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', selectedOp.id), updates);
      const updatedOp = { ...selectedOp, ...updates };
      setOps(ops.map(o => o.id === selectedOp.id ? updatedOp : o));
      setSelectedOp(updatedOp);
      setIsEditMode(false);
      showToast('success', 'OP modifié avec succès', selectedOp.numero);
    } catch (error) {
      showToast('error', 'Erreur', error.message);
    }
  };

  const handleSupprimer = async () => {
    if (!selectedOp) return;
    const pwd = await askPassword('Mot de passe requis pour supprimer');
    if (pwd === null) return;
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      showToast('error', 'Mot de passe incorrect');
      return;
    }
    const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
    let confirmTitle = 'Confirmer la suppression';
    let confirmMsg = `Supprimer l'OP ${selectedOp.numero} ?`;
    if (opsSuivants.length > 0) {
      const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
      confirmTitle = '⚠️ Impact sur d\'autres OP';
      confirmMsg = `La suppression impactera : ${numeros}`;
    }
    const ok = await askConfirm(confirmTitle, confirmMsg);
    if (ok) {
      try {
        await deleteDoc(doc(db, 'ops', selectedOp.id));
        setOps(ops.filter(o => o.id !== selectedOp.id));
        showToast('success', 'OP supprimé', selectedOp.numero);
        setSelectedOp(null);
        setSearchText('');
      } catch (error) {
        showToast('error', 'Erreur', error.message);
      }
    }
  };

  const handleDupliquer = () => {
    if (!selectedOp) return;
    setConsultOpData({ ...selectedOp, _duplicate: true });
    setCurrentPage('nouvelOp');
  };

  const handleStartEditNumero = async () => {
    const pwd = await askPassword('Mot de passe admin requis');
    if (pwd === null) return;
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      showToast('error', 'Mot de passe incorrect');
      return;
    }
    setEditNumero(selectedOp.numero || '');
  };

  const handleSaveNumero = async () => {
    if (!selectedOp || editNumero === null) return;
    const newNum = editNumero.trim();
    if (!newNum) { showToast('error', 'Numéro vide', 'Le numéro ne peut pas être vide'); return; }
    if (newNum === selectedOp.numero) { setEditNumero(null); return; }
    const doublon = ops.find(o => o.numero === newNum && o.id !== selectedOp.id);
    if (doublon) { showToast('error', 'Doublon', `Ce numéro existe déjà : ${newNum}`); return; }
    try {
      const oldNum = selectedOp.numero;
      await updateDoc(doc(db, 'ops', selectedOp.id), { numero: newNum, updatedAt: new Date().toISOString() });
      const linked = ops.filter(o => o.opProvisoireNumero === oldNum);
      for (const lo of linked) {
        await updateDoc(doc(db, 'ops', lo.id), { opProvisoireNumero: newNum, updatedAt: new Date().toISOString() });
      }
      setOps(prev => prev.map(o => {
        if (o.id === selectedOp.id) return { ...o, numero: newNum };
        if (o.opProvisoireNumero === oldNum) return { ...o, opProvisoireNumero: newNum };
        return o;
      }));
      setSelectedOp(prev => ({ ...prev, numero: newNum }));
      setSearchText(newNum);
      setEditNumero(null);
      showToast('success', 'Numéro modifié', `${oldNum} → ${newNum}`);
    } catch (e) { showToast('error', 'Erreur', e.message); }
  };

  // === IMPRESSION === (identique à l'original)
  const handlePrint = () => {
    if (!selectedOp) return;
    const ben = selectedBeneficiaire;
    const src = currentSourceObj;
    const engagementActuel = selectedOp.montant || 0;
    const engagementsCumules = getEngagementsAnterieurs();
    const isBailleur = src?.sigle?.includes('IDA') || src?.sigle?.includes('BAD') || src?.sigle?.includes('UE');
    const isTresor = src?.sigle?.includes('BN') || src?.sigle?.includes('TRESOR') || src?.sigle?.includes('ETAT');
    const codeImputationComplet = (src?.codeImputation || '') + ' ' + (selectedOp.ligneBudgetaire || '');
    const ribDisplay = selectedRib ? (typeof selectedRib === 'object' ? selectedRib.numero : selectedRib) : '';
    const banqueDisplay = selectedRib && typeof selectedRib === 'object' ? selectedRib.banque : '';
    const printContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OP ${selectedOp.numero}</title><style>@page{size:A4;margin:10mm}@media print{.toolbar{display:none!important}body{background:#fff!important;padding:0!important}.page-container{box-shadow:none!important;margin:0!important;width:100%!important}}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Century Gothic','Trebuchet MS',sans-serif;font-size:11px;line-height:1.4;background:#e0e0e0}.toolbar{background:#1a1a2e;padding:12px 20px;display:flex;gap:12px;align-items:center;position:sticky;top:0;z-index:100}.toolbar button{padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}.btn-print{background:#2196F3;color:#fff}.btn-pdf{background:#4CAF50;color:#fff}.toolbar-title{color:#fff;font-size:14px;margin-left:auto}.page-container{width:210mm;min-height:297mm;margin:20px auto;background:#fff;padding:8mm;box-shadow:0 2px 10px rgba(0,0,0,0.3)}.inner-frame{border:2px solid #000}.header{display:flex;border-bottom:1px solid #000}.header-logo{width:22%;padding:8px;display:flex;align-items:center;justify-content:center;border-right:1px solid #000}.header-logo img{max-height:75px;max-width:100%}.header-center{width:56%;padding:6px;text-align:center;border-right:1px solid #000}.header-center .republic{font-weight:bold;font-size:11px}.header-center .sep{font-size:8px;letter-spacing:0.5px;color:#333}.header-center .ministry{font-style:italic;font-size:10px}.header-center .project{font-weight:bold;font-size:10px}.header-right{width:22%;padding:8px;font-size:10px;text-align:right}.op-title-section{text-align:center;padding:6px 10px;border-bottom:1px solid #000}.exercice-type-line{display:flex;justify-content:space-between;align-items:center}.exercice-type-line>div:first-child{width:25%;text-align:left;font-size:11px}.exercice-type-line>div:nth-child(2){width:50%;text-align:center}.exercice-type-line>div:last-child{width:25%;text-align:right}.op-title{font-weight:bold;text-decoration:underline;font-size:11px}.op-numero{font-size:10px;margin-top:2px}.body-content{padding:12px 15px;border-bottom:1px solid #000}.type-red{color:#c00;font-weight:bold;font-style:italic}.field{margin-bottom:8px}.field-title{text-decoration:underline;font-size:10px;margin-bottom:6px}.field-value{font-weight:bold}.field-large{margin:15px 0;min-height:45px;line-height:1.6;word-wrap:break-word}.checkbox-line{display:flex;align-items:center;margin-bottom:8px}.checkbox-label{min-width:230px}.checkbox-options{display:flex;gap:50px}.check-item{display:flex;align-items:center;gap:6px}.box{width:18px;height:14px;border:1px solid #000;display:inline-flex;align-items:center;justify-content:center;font-size:10px}.budget-section{margin-top:15px}.budget-row{display:flex;align-items:center;margin-bottom:8px}.budget-row .col-left{width:33.33%}.budget-row .col-center{width:33.33%}.budget-row .col-right{width:33.33%}.value-box{border:1px solid #000;padding:4px 10px;text-align:right;font-weight:bold;white-space:nowrap;font-size:10px}.budget-table{width:100%;border-collapse:collapse}.budget-table td{border:1px solid #000;padding:4px 8px;font-size:10px}.budget-table .col-letter{width:4%;text-align:center;font-weight:bold}.budget-table .col-label{width:29.33%}.budget-table .col-amount{width:33.33%;text-align:right;padding-right:10px}.budget-table .col-empty{width:33.33%;border:none}.signatures-section{display:flex;border-bottom:1px solid #000}.sig-box{width:33.33%;min-height:160px;display:flex;flex-direction:column;border-right:1px solid #000}.sig-box:last-child{border-right:none}.sig-header{text-align:center;font-weight:bold;font-size:9px;padding:6px;border-bottom:1px solid #000;line-height:1.3}.sig-content{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:8px}.sig-name{text-align:right;font-weight:bold;text-decoration:underline;font-size:9px}.abidjan-row{display:flex;border-bottom:1px solid #000}.abidjan-cell{width:33.33%;padding:4px 10px;font-size:9px;border-right:1px solid #000}.abidjan-cell:last-child{border-right:none}.acquit-section{display:flex}.acquit-empty{width:66.66%;border-right:1px solid #000}.acquit-box{width:33.33%;min-height:110px;display:flex;flex-direction:column}.acquit-header{text-align:center;font-size:9px;padding:6px;border-bottom:1px solid #000}.acquit-content{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:8px}.acquit-date{font-size:9px;text-align:left}</style></head><body><div class="toolbar"><button class="btn-print" onclick="window.print()">🖨️ Imprimer</button><button class="btn-pdf" onclick="window.print()">📄 Exporter PDF</button><span class="toolbar-title">Aperçu – OP ${selectedOp.numero}</span></div><div class="page-container"><div class="inner-frame"><div class="header"><div class="header-logo"><img src="${LOGO_PIF2}" alt="PIF2" /></div><div class="header-center"><div class="republic">REPUBLIQUE DE CÔTE D'IVOIRE</div><div class="sep">------------------------</div><div class="ministry">MINISTERE DES EAUX ET FORETS</div><div class="sep">------------------------</div><div class="project">PROJET D'INVESTISSEMENT FORESTIER 2</div><div class="sep">------------------------</div></div><div class="header-right"><div style="text-align:center;"><img src="${ARMOIRIE}" alt="Armoirie" style="max-height:50px;max-width:60px;margin-bottom:3px;" /><div>Union – Discipline – Travail</div></div></div></div><div class="op-title-section"><div class="exercice-type-line"><div>EXERCICE&nbsp;&nbsp;<strong>${exerciceActif?.annee || ''}</strong></div><div><div class="op-title">ORDRE DE PAIEMENT</div><div class="op-numero">N°${selectedOp.numero}</div></div><div class="type-red">${selectedOp.type}</div></div></div><div class="body-content"><div class="field"><div class="field-title">REFERENCE DU BENEFICIAIRE</div></div><div class="field">BENEFICIAIRE :&nbsp;&nbsp;&nbsp;<span class="field-value">${ben?.nom || ''}</span></div><div class="field">COMPTE CONTRIBUABLE :&nbsp;&nbsp;&nbsp;<span class="field-value">${ben?.ncc || ''}</span></div><div class="checkbox-line"><span class="checkbox-label">COMPTE DE DISPONIBILITE A DEBITER :</span><div class="checkbox-options"><span class="check-item">BAILLEUR <span class="box">${isBailleur ? 'x' : ''}</span></span><span class="check-item">TRESOR <span class="box">${isTresor ? 'x' : ''}</span></span></div></div><div class="checkbox-line"><span class="checkbox-label">MODE DE REGLEMENT :</span><div class="checkbox-options"><span class="check-item">ESPECE <span class="box">${selectedOp.modeReglement === 'ESPECES' ? 'x' : ''}</span></span><span class="check-item">CHEQUE <span class="box">${selectedOp.modeReglement === 'CHEQUE' ? 'x' : ''}</span></span><span class="check-item">VIREMENT <span class="box">${selectedOp.modeReglement === 'VIREMENT' ? 'x' : ''}</span></span></div></div><div class="field">REFERENCES BANCAIRES :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedOp.modeReglement === 'VIREMENT' ? (banqueDisplay ? banqueDisplay + ' - ' : '') + ribDisplay : ''}</span></div><div class="field-large">OBJET DE LA DEPENSE :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedOp.objet || ''}</span></div><div class="field-large">PIECES JUSTIFICATIVES :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedOp.piecesJustificatives || ''}</span></div><div class="budget-section"><div class="budget-row"><div class="col-left">MONTANT TOTAL :</div><div class="col-center"><div class="value-box">${formatMontant(Math.abs(engagementActuel))}</div></div><div class="col-right"></div></div><div class="budget-row"><div class="col-left">IMPUTATION BUDGETAIRE :</div><div class="col-center"><div class="value-box">${codeImputationComplet.trim()}</div></div><div class="col-right"></div></div><table class="budget-table"><tr><td class="col-letter">A</td><td class="col-label">Dotation budgétaire</td><td class="col-amount">${formatMontant(getDotation())}</td><td class="col-empty"></td></tr><tr><td class="col-letter">B</td><td class="col-label">Engagements antérieurs</td><td class="col-amount">${formatMontant(engagementsCumules)}</td><td class="col-empty"></td></tr><tr><td class="col-letter">C</td><td class="col-label">Engagement actuel</td><td class="col-amount">${formatMontant(Math.abs(engagementActuel))}</td><td class="col-empty"></td></tr><tr><td class="col-letter">D</td><td class="col-label">Engagements cumulés (B + C)</td><td class="col-amount">${formatMontant(engagementsCumules + engagementActuel)}</td><td class="col-empty"></td></tr><tr><td class="col-letter">E</td><td class="col-label">Disponible budgétaire (A - D)</td><td class="col-amount">${formatMontant(getDotation() - engagementsCumules - engagementActuel)}</td><td class="col-empty"></td></tr></table></div></div><div class="signatures-section"><div class="sig-box"><div class="sig-header">VISA<br/>COORDONNATRICE</div><div class="sig-content"><div class="sig-name">ABE-KOFFI Thérèse</div></div></div><div class="sig-box"><div class="sig-header">VISA<br/>CONTRÔLEUR FINANCIER</div><div class="sig-content"></div></div><div class="sig-box"><div class="sig-header">VISA AGENT<br/>COMPTABLE</div><div class="sig-content"></div></div></div><div class="abidjan-row"><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div></div><div class="acquit-section"><div class="acquit-empty"></div><div class="acquit-box"><div class="acquit-header">ACQUIT LIBERATOIRE</div><div class="acquit-content"><div class="acquit-date">Abidjan, le</div></div></div></div></div></div></body></html>`;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // === STYLES ===
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d', letterSpacing: 0.3 };
  const fieldStyle = { padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, fontSize: 13, border: '1.5px solid #e0e0e0', width: '100%', boxSizing: 'border-box' };
  const editFieldStyle = { ...fieldStyle, background: '#fffde7', border: `1.5px solid ${accent}40` };
  const sectionTitle = (icon, label) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </div>
  );
  const isReadOnly = selectedOp && !isEditMode;

  return (
    <div className="consulterop-form">
      <style>{`
        @keyframes toastIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
        .consulterop-form *, .consulterop-form *::before, .consulterop-form *::after { box-sizing: border-box; }
        .consulterop-form input, .consulterop-form select, .consulterop-form textarea { box-sizing: border-box; }
      `}</style>
      {toasts.map(t => (
        <div key={t.uid} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
          <ToastNotif toast={t} onDone={() => removeToast(t.uid)} />
        </div>
      ))}

      {/* Custom Modal (replaces window.prompt / window.confirm) */}
      {modal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(2px)' }}
          onClick={() => closeModal(null)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 32px', minWidth: 380, maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', animation: 'toastIn 0.2s ease-out' }}
            onClick={e => e.stopPropagation()}>
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: modal.type === 'password' ? '#e3f2fd' : '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {modal.type === 'password' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                )}
              </div>
            </div>
            {/* Title */}
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: modal.type === 'confirm' && modal.message ? 8 : 18 }}>{modal.title}</div>
            {/* Message (confirm only) */}
            {modal.type === 'confirm' && modal.message && (
              <div style={{ textAlign: 'center', fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 1.5 }}>{modal.message}</div>
            )}
            {/* Password input */}
            {modal.type === 'password' && (
              <input ref={modalInputRef} type="password" autoFocus placeholder="Mot de passe..."
                onKeyDown={e => { if (e.key === 'Enter') closeModal(e.target.value); if (e.key === 'Escape') closeModal(null); }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', marginBottom: 20, textAlign: 'center', letterSpacing: 2 }} />
            )}
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => closeModal(null)}
                style={{ flex: 1, padding: '11px 20px', borderRadius: 10, border: '1.5px solid #e0e0e0', background: 'white', fontSize: 13, fontWeight: 600, color: '#666', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => {
                if (modal.type === 'password') closeModal(modalInputRef.current?.value || '');
                else closeModal(true);
              }}
                style={{ flex: 1, padding: '11px 20px', borderRadius: 10, border: 'none', background: modal.type === 'confirm' ? '#e65100' : '#1565c0', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {modal.type === 'confirm' ? 'Confirmer' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sources */}
      <div style={{ maxWidth: 1020, margin: '0 auto', marginBottom: 4 }}>
        <label style={{ ...labelStyle, fontSize: 12, marginBottom: 10 }}>SOURCE DE FINANCEMENT</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {sources.map(s => {
            const isActive = activeSource === s.id;
            return (
              <div key={s.id} onClick={() => { setActiveSource(s.id); setSelectedOp(null); setSearchText(''); setIsEditMode(false); }}
                style={{ flex: 1, padding: '16px 20px', borderRadius: 12, cursor: 'pointer', background: isActive ? s.couleur : 'white', border: isActive ? `2px solid ${s.couleur}` : '2px solid #e0e0e0', boxShadow: isActive ? `0 4px 16px ${s.couleur}33` : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.25s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isActive ? 'white' : s.couleur }}>{s.sigle || s.nom}</div>
                    <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.8)' : '#999', marginTop: 2 }}>{s.nom}</div>
                  </div>
                  {isActive && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>✓</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!exerciceActif ? (
        <div style={{ maxWidth: 1020, margin: '0 auto', background: 'white', borderRadius: 12, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#e65100', fontWeight: 600 }}>Aucun exercice actif</p>
        </div>
      ) : (
        <div style={{ maxWidth: 1020, margin: '0 auto', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${accent}` }}>
          <div style={{ padding: '24px 28px 20px' }}>

            {/* Barre recherche */}
            <div style={{ display: 'flex', alignItems: 'end', gap: 14, marginBottom: 24 }}>
              <div style={{ flex: '0 0 320px', position: 'relative' }} ref={dropdownRef}>
                <label style={labelStyle}>🔍 RECHERCHER UN OP</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <input type="text" value={searchText} onChange={(e) => { setSearchText(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="N° OP, bénéficiaire, montant..." style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: '8px 0 0 8px', outline: 'none', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '0 8px 8px 0', overflow: 'hidden', border: '1.5px solid #e0e0e0', borderLeft: 'none' }}>
                    <button onClick={goToPrev} title="OP précédent" style={{ padding: '4px 10px', background: '#f8f9fa', cursor: 'pointer', border: 'none', borderBottom: '1px solid #e0e0e0', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button onClick={goToNext} title="OP suivant" style={{ padding: '4px 10px', background: '#f8f9fa', cursor: 'pointer', border: 'none', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                </div>
                {showDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 300, overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {opsFiltered.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Aucun OP trouvé</div>
                    ) : opsFiltered.map(op => {
                      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                      const isSelected = selectedOp?.id === op.id;
                      const tc = typeColors[op.type] || '#999';
                      return (
                        <div key={op.id} onClick={() => loadOp(op)} style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSelected ? accent + '0a' : 'white', transition: 'background 0.15s' }}
                          onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = '#f5f5f5'; }}
                          onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? accent + '0a' : 'white'; }}>
                          <div>
                            <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{op.numero}</div>
                            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{ben?.nom || 'N/A'} — {(op.objet || '').substring(0, 40)}{(op.objet || '').length > 40 ? '...' : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontFamily: 'monospace', color: accent, fontSize: 12 }}>{formatMontant(op.montant)} F</div>
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: tc + '18', color: tc }}>{op.type}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6c757d', paddingBottom: 8 }}>{selectedOp ? `${currentIndex + 1} / ${opsSource.length}` : `${opsSource.length} OP`}</div>
              {selectedOp && statutInfo && (
                <div style={{ marginLeft: 'auto', padding: '10px 18px', borderRadius: 10, background: statutInfo.bg, color: statutInfo.color, fontWeight: 700, fontSize: 13 }}>{statutInfo.icon} {statutInfo.label}</div>
              )}
            </div>

            {selectedOp ? (
              <>
                {/* Bloc référence */}
                <div style={{ marginBottom: 24, padding: '14px 18px', background: '#f8faf9', borderRadius: 10, border: '1px solid #e8ece9', display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6c757d', marginBottom: 4 }}>N° OP</div>
                    {editNumero !== null ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input value={editNumero} onChange={e => setEditNumero(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveNumero(); if (e.key === 'Escape') setEditNumero(null); }} style={{ ...styles.input, marginBottom: 0, fontSize: 13, fontFamily: 'monospace', fontWeight: 700, padding: '6px 10px', width: 220 }} autoFocus />
                        <button onClick={handleSaveNumero} style={{ border: 'none', background: '#1b5e20', color: '#fff', borderRadius: 4, padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓</button>
                        <button onClick={() => setEditNumero(null)} style={{ border: 'none', background: '#999', color: '#fff', borderRadius: 4, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#1a1a2e' }}>{selectedOp.numero}</span>
                        <button onClick={handleStartEditNumero} title="Modifier le N° OP" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: 0.4 }}>✏️</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6c757d', marginBottom: 4 }}>TYPE</div>
                    <span style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: (typeColors[selectedOp.type] || '#999') + '15', color: typeColors[selectedOp.type] || '#999', border: `1.5px solid ${(typeColors[selectedOp.type] || '#999')}30` }}>{selectedOp.type}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6c757d', marginBottom: 4 }}>DATE</div>
                    <span style={{ fontSize: 13, color: '#333' }}>{selectedOp.dateCreation || ''}</span>
                  </div>
                  {selectedOp.bordereauCF && <div><div style={{ fontSize: 9, fontWeight: 700, color: '#6c757d', marginBottom: 4 }}>BORDEREAU CF</div><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#333' }}>{selectedOp.bordereauCF}</span></div>}
                  {selectedOp.bordereauAC && <div><div style={{ fontSize: 9, fontWeight: 700, color: '#6c757d', marginBottom: 4 }}>BORDEREAU AC</div><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#333' }}>{selectedOp.bordereauAC}</span></div>}
                </div>

                <div style={{ height: 1, background: '#f0f0f0', marginBottom: 24 }} />
                <div style={isReadOnly ? { pointerEvents: 'none' } : {}}>

                  {/* Bénéficiaire */}
                  <div style={{ marginBottom: 24 }}>
                    {sectionTitle('👤', 'Bénéficiaire')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16, alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>NOM / RAISON SOCIALE</label>
                        {isEditMode ? (
                          <Autocomplete options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || ''] }))} value={form.beneficiaireId ? { value: form.beneficiaireId, label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || '' } : null} onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })} placeholder="🔍 Rechercher..." accentColor={accent} />
                        ) : (
                          <div style={{ ...fieldStyle, height: 38, display: 'flex', alignItems: 'center' }}><span style={{ fontWeight: 600 }}>{selectedBeneficiaire?.nom || 'N/A'}</span></div>
                        )}
                      </div>
                      <div>
                        <label style={labelStyle}>N°CC</label>
                        <div style={{ ...fieldStyle, height: 38, display: 'flex', alignItems: 'center' }}>{selectedBeneficiaire?.ncc || ''}</div>
                      </div>
                    </div>
                  </div>

                  {/* Règlement */}
                  <div style={{ marginBottom: 24 }}>
                    {sectionTitle('💳', 'Règlement')}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => {
                        const active = form.modeReglement === mode;
                        return (
                          <div key={mode} onClick={() => isEditMode && setForm({ ...form, modeReglement: mode })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${active ? accent : '#e0e0e0'}`, background: active ? accent + '08' : 'white', cursor: isEditMode ? 'pointer' : 'default' }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? accent : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? accent : '#555' }}>{mode}</span>
                          </div>
                        );
                      })}
                      {form.modeReglement === 'VIREMENT' && selectedRib && (
                        <div style={{ flex: 1, minWidth: 200 }}>
                          {isEditMode && beneficiaireRibs.length > 1 ? (
                            <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={{ ...fieldStyle, height: 38, cursor: 'pointer' }}>
                              {beneficiaireRibs.map((rib, i) => <option key={i} value={i}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                            </select>
                          ) : (
                            <div style={{ ...fieldStyle, height: 38, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {(typeof selectedRib === 'object' && selectedRib.banque) && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{selectedRib.banque}</span>}
                              <span style={{ fontSize: 12 }}>{typeof selectedRib === 'object' ? selectedRib.numero : selectedRib}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Détails */}
                  <div style={{ marginBottom: 24 }}>
                    {sectionTitle('📝', 'Détails de la dépense')}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                      <div style={{ gridColumn: '1 / 3' }}>
                        <label style={labelStyle}>OBJET</label>
                        {isEditMode ? <textarea value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} style={{ ...editFieldStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                        : <div style={{ ...fieldStyle, minHeight: 100 }}>{form.objet || ''}</div>}
                      </div>
                      <div>
                        <label style={labelStyle}>PIÈCES JUSTIFICATIVES</label>
                        {isEditMode ? <textarea value={form.piecesJustificatives} onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })} style={{ ...editFieldStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                        : <div style={{ ...fieldStyle, minHeight: 100, fontSize: 12, color: '#555' }}>{form.piecesJustificatives || ''}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Montant et budget */}
                  <div style={{ marginBottom: 24 }}>
                    {sectionTitle('💰', 'Montant et budget')}
                    {/* Ligne 1 : Montant + Ligne budg + Libellé */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>MONTANT (FCFA)</label>
                        {isEditMode ? <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })} style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} placeholder="0" />
                        : <div style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, textAlign: 'right', color: accent }}>{formatMontant(selectedOp.montant)}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={labelStyle}>LIGNE BUDG.</label>
                        {isEditMode ? <Autocomplete options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: l.code, searchFields: [l.code, l.libelle] }))} value={form.ligneBudgetaire ? { value: form.ligneBudgetaire, label: form.ligneBudgetaire } : null} onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })} placeholder="Code..." accentColor={accent} />
                        : <div style={{ ...fieldStyle, fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{form.ligneBudgetaire || ''}</div>}
                      </div>
                      <div>
                        <label style={labelStyle}>LIBELLÉ</label>
                        <div style={{ padding: '10px 14px', background: '#f0f4ff', borderRadius: 8, fontSize: 12, color: '#555' }}>{selectedLigne?.libelle || ''}</div>
                      </div>
                    </div>
                    {/* Ligne 2 : Budget col 1+2, TVA col 3 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                      <div style={{ gridColumn: '1 / 3', background: '#f8faf9', padding: 14, borderRadius: 10, border: '1px solid #e8ece9' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px' }}>
                          <span style={{ fontSize: 11, color: '#6c757d' }}>Dotation</span>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                          <span style={{ fontSize: 11, color: '#6c757d' }}>Engag. antérieurs</span>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                          <div style={{ gridColumn: '1 / -1', height: 1, background: '#d0d8d3', margin: '4px 0' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>Disponible</span>
                          <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 800, color: (getDotation() - getEngagementsAnterieurs()) >= 0 ? '#2e7d32' : '#c62828' }}>{formatMontant(getDotation() - getEngagementsAnterieurs())}</span>
                        </div>
                      </div>
                      <div>
                        {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                          <>
                            {isEditMode ? (
                              <>
                                <div style={{ marginBottom: 12 }}>
                                  <label style={labelStyle}>TVA RÉCUPÉRABLE</label>
                                  <div style={{ display: 'flex', gap: 12 }}>
                                    {[{ val: true, lbl: 'OUI' }, { val: false, lbl: 'NON' }].map(opt => {
                                      const active = form.tvaRecuperable === opt.val;
                                      return (
                                        <div key={opt.lbl} onClick={() => setForm({ ...form, tvaRecuperable: opt.val })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${active ? accent : '#e0e0e0'}`, background: active ? accent + '08' : 'white', cursor: 'pointer' }}>
                                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${active ? accent : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />}</div>
                                          <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? accent : '#555' }}>{opt.lbl}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                {form.tvaRecuperable && <div><label style={labelStyle}>MONTANT TVA</label><MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })} style={{ ...editFieldStyle, fontFamily: 'monospace', textAlign: 'right' }} placeholder="0" /></div>}
                              </>
                            ) : (
                              <div>
                                <label style={labelStyle}>TVA RÉCUPÉRABLE</label>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedOp.tvaRecuperable ? 'OUI' : 'NON'}</span>
                                {selectedOp.tvaRecuperable && selectedOp.montantTVA && <span style={{ marginLeft: 12, fontFamily: 'monospace', fontSize: 12 }}>— {formatMontant(selectedOp.montantTVA)} FCFA</span>}
                              </div>
                            )}
                          </>
                        )}
                        {selectedOp.opProvisoireNumero && (
                          <div style={{ marginTop: 14 }}>
                            <label style={{ ...labelStyle, color: selectedOp.type === 'ANNULATION' ? '#c62828' : '#2e7d32' }}>🔄 OP PROVISOIRE {selectedOp.type === 'ANNULATION' ? 'ANNULÉ' : 'RÉGULARISÉ'}</label>
                            <div style={{ ...fieldStyle, fontFamily: 'monospace', fontWeight: 600, fontSize: 12, background: selectedOp.type === 'ANNULATION' ? '#ffebee' : '#e8f5e9', border: `1.5px solid ${selectedOp.type === 'ANNULATION' ? '#ffcdd2' : '#c8e6c9'}` }}>{selectedOp.opProvisoireNumero}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedOp.motifRejet && (
                    <div style={{ marginBottom: 24, padding: 14, background: '#ffebee', borderRadius: 10, border: '1.5px solid #ffcdd2' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#c62828', marginBottom: 6 }}>❌ MOTIF DU REJET</div>
                      <div style={{ fontSize: 13, color: '#c62828' }}>{selectedOp.motifRejet}</div>
                    </div>
                  )}
                </div>

                {/* Boutons */}
                {isEditMode ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '2px solid #f57f17' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ padding: '10px 16px', background: '#fff3e0', color: '#e65100', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>✏️ Modification — {selectedOp.numero}</span>
                      <button onClick={() => { setIsEditMode(false); loadOp(selectedOp); }} style={{ ...styles.buttonSecondary, padding: '10px 16px', fontSize: 12 }}>Annuler</button>
                    </div>
                    <button onClick={handleEnregistrerModif} title="Enregistrer" style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: '#f57f17', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(245,127,23,0.4)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
                    <span style={{ padding: '8px 14px', background: accent + '10', color: accent, borderRadius: 8, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>🔍 {selectedOp.numero}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { label: 'Modifier', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, bg: '#f57f17', action: handleModifier },
                        { label: 'Supprimer', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>, bg: '#616161', action: handleSupprimer },
                        { label: 'Dupliquer', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>, bg: '#ff9800', action: handleDupliquer },
                        { label: 'Imprimer', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>, bg: accent, action: handlePrint },
                      ].map((btn, i) => (
                        <button key={i} title={btn.label} onClick={btn.action} style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: btn.bg, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${btn.bg}44`, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                          {btn.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: '#adb5bd' }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
                <p style={{ fontSize: 16, fontWeight: 500 }}>Sélectionnez un OP pour le consulter</p>
                <p style={{ fontSize: 13 }}>Utilisez la barre de recherche ou les flèches ▲ ▼</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageConsulterOp;
